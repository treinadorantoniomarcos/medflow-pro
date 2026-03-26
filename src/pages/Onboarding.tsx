import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, Check, CreditCard, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import medfluxLogo from "@/assets/medflux-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COURTESY_PLAN_DESCRIPTION,
  COURTESY_PLAN_KEY,
  COURTESY_PLAN_NAME,
  START_TRIAL_DAYS,
  SUBSCRIPTION_TERM_DAYS,
  SUBSCRIPTION_TERM_LABEL,
  fallbackPlanOptions,
  getPlanMarketingContent,
  paidPlanOptions,
  type PlanKey,
  type PlanOption,
} from "@/lib/subscription-plans";

type PaymentMethod = "pix" | "card" | "boleto";

type CatalogPlan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  monthly_price_cents: number;
  period_days: number;
  trial_days: number;
  is_active: boolean;
};

const Onboarding = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, refreshProfile } = useAuth();

  const isUpgradeFlow = !!profile?.tenant_id || searchParams.get("mode") === "upgrade";

  const [step, setStep] = useState(isUpgradeFlow ? 1 : 2);
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("start");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  const [professionalOrClinicName, setProfessionalOrClinicName] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [adminFullName, setAdminFullName] = useState("");

  const { data: catalogPlans = [] } = useQuery({
    queryKey: ["onboarding-active-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("id, code, name, description, monthly_price_cents, period_days, trial_days, is_active")
        .eq("is_active", true)
        .order("monthly_price_cents", { ascending: true });

      if (error) throw error;
      return (data ?? []) as CatalogPlan[];
    },
  });

  const paidPlans = useMemo<PlanOption[]>(() => {
    const source = catalogPlans.length > 0
      ? catalogPlans
          .map((plan) => ({
            key: plan.code,
            name: plan.code === COURTESY_PLAN_KEY ? COURTESY_PLAN_NAME : plan.name,
            monthlyPrice: plan.monthly_price_cents / 100,
            description:
              plan.code === COURTESY_PLAN_KEY
                ? COURTESY_PLAN_DESCRIPTION
                : plan.description ?? `Vigência de ${SUBSCRIPTION_TERM_LABEL}`,
            periodDays: plan.period_days,
            trialDays: plan.code === COURTESY_PLAN_KEY ? START_TRIAL_DAYS : plan.trial_days,
            marketing: getPlanMarketingContent(plan.code),
          }))
      : paidPlanOptions;

    return source;
  }, [catalogPlans]);

  const selectedPlanData = useMemo(
    () => paidPlans.find((plan) => plan.key === selectedPlan) ?? paidPlans[0] ?? fallbackPlanOptions[0],
    [paidPlans, selectedPlan]
  );

  useEffect(() => {
    setStep(isUpgradeFlow ? 1 : 2);
    setSelectedPlan(isUpgradeFlow ? "pro" : "start");
    setPaymentConfirmed(false);
  }, [isUpgradeFlow]);

  useEffect(() => {
    if (user?.email) {
      setContactEmail((current) => current || user.email || "");
    }
  }, [user?.email]);

  const handlePayment = async () => {
    setProcessingPayment(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setPaymentConfirmed(true);
    setProcessingPayment(false);
    toast.success("Pagamento confirmado", {
      description: `Pagamento registrado para assinatura com vigência de ${SUBSCRIPTION_TERM_LABEL}.`,
    });
  };

  const finishTrialSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const clinicId = crypto.randomUUID();
      const now = new Date();
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + START_TRIAL_DAYS);

      const { error } = await supabase.rpc("complete_onboarding", {
        _clinic_id: clinicId,
        _clinic_name: professionalOrClinicName.trim(),
        _full_name: adminFullName.trim(),
        _phone: whatsapp.trim() || null,
      });

      if (error) throw error;

      const { error: settingsError } = await supabase
        .from("clinics")
        .update({
          settings: {
            onboarding: {
              completed_at: now.toISOString(),
              owner_name: adminFullName.trim(),
              registration: {
                professional_or_clinic_name: professionalOrClinicName.trim(),
                document_number: documentNumber.trim(),
                full_address: fullAddress.trim(),
                whatsapp: whatsapp.trim(),
                email: contactEmail.trim().toLowerCase(),
                admin_full_name: adminFullName.trim(),
              },
            },
            subscription: {
              plan: "start",
              status: "trialing",
              payment_method: null,
              trial_days: START_TRIAL_DAYS,
              trial_started_at: now.toISOString(),
              first_payment_at: null,
              current_period_start: now.toISOString(),
              current_period_end: trialEnd.toISOString(),
              grace_until: null,
              pending_release: false,
              contract_term_days: SUBSCRIPTION_TERM_DAYS,
            },
          },
        })
        .eq("id", clinicId);

      if (settingsError) throw settingsError;

      await refreshProfile();
      toast.success("Experiência Start liberada", {
        description: `Você recebeu ${START_TRIAL_DAYS} dias de experiência para testar o plano Start.`,
      });
      navigate("/");
    } catch (err: any) {
      toast.error("Erro no cadastro", { description: err.message });
    }

    setLoading(false);
  };

  const finishUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id || !paymentConfirmed) return;

    setLoading(true);

    try {
      const now = new Date();
      const contractEnd = new Date(now.getTime() + SUBSCRIPTION_TERM_DAYS * 24 * 60 * 60 * 1000);

      const { data: clinic, error: loadError } = await supabase
        .from("clinics")
        .select("settings")
        .eq("id", profile.tenant_id)
        .single();

      if (loadError) throw loadError;

      const currentSettings = (clinic?.settings ?? {}) as Record<string, any>;
      const onboarding = (currentSettings.onboarding ?? {}) as Record<string, any>;

      const { error: updateError } = await supabase
        .from("clinics")
        .update({
          settings: {
            ...currentSettings,
            onboarding: {
              ...onboarding,
              upgrade: {
                selected_plan: selectedPlan,
                paid_at: now.toISOString(),
                payment_method: paymentMethod,
              },
            },
            subscription: {
              ...(currentSettings.subscription ?? {}),
              plan: selectedPlan,
              status: "active",
              payment_method: paymentMethod,
              first_payment_at: now.toISOString(),
              current_period_start: now.toISOString(),
              current_period_end: contractEnd.toISOString(),
              grace_until: null,
              pending_release: false,
              contract_term_days: SUBSCRIPTION_TERM_DAYS,
            },
          },
        })
        .eq("id", profile.tenant_id);

      if (updateError) throw updateError;

      toast.success("Plano ativado", {
        description: `Assinatura ${selectedPlanData.name} contratada por ${SUBSCRIPTION_TERM_LABEL}.`,
      });
      navigate("/");
    } catch (err: any) {
      toast.error("Erro ao ativar assinatura", { description: err.message });
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-6">
      <Card className="w-full max-w-[560px] shadow-medium border-border">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <img src={medfluxLogo} alt="MedFlux Pro" className="h-14 w-14" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              {isUpgradeFlow ? "Escolha um plano" : "Experiência Start - 21 dias"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {isUpgradeFlow
              ? `Escolha um plano com vigência contratual de ${SUBSCRIPTION_TERM_LABEL} após o encerramento da experiência`
              : `${START_TRIAL_DAYS} dias de experiência para 1 profissional`}
          </p>
        </CardHeader>

        <CardContent>
          {!isUpgradeFlow && (
            <form onSubmit={finishTrialSignup} className="space-y-5">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-primary">
                  <Building2 className="h-5 w-5" />
                  <span className="text-sm font-semibold">Experiência Start ativa</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  1 profissional | agenda e operação essencial com {START_TRIAL_DAYS} dias de experiência.
                </p>
                <div className="mt-3 space-y-1">
                  {getPlanMarketingContent("start").features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="professionalOrClinicName">Nome do profissional ou da clínica</Label>
                <Input
                  id="professionalOrClinicName"
                  value={professionalOrClinicName}
                  onChange={(e) => setProfessionalOrClinicName(e.target.value)}
                  placeholder="Ex: Dra. Ana Souza ou Clínica Saúde Viva"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="documentNumber">CNPJ ou CPF</Label>
                <Input
                  id="documentNumber"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="Informe o CNPJ ou CPF"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullAddress">Endereço completo</Label>
                <Input
                  id="fullAddress"
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  placeholder="Rua, número, bairro, cidade, UF e CEP"
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">E-mail</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="contato@clinica.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminFullName">Nome completo do administrador/contato</Label>
                <Input
                  id="adminFullName"
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                  placeholder="Nome completo do administrador"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={
                  loading ||
                  !professionalOrClinicName.trim() ||
                  !documentNumber.trim() ||
                  !fullAddress.trim() ||
                  !whatsapp.trim() ||
                  !contactEmail.trim() ||
                  !adminFullName.trim()
                }
              >
                {loading ? "Liberando..." : `Iniciar experiência de ${START_TRIAL_DAYS} dias`}
                <Sparkles className="h-4 w-4" />
              </Button>
            </form>
          )}

          {isUpgradeFlow && (
            <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2); } : finishUpgrade} className="space-y-5">
              {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-foreground">
                    Sua experiência Start chegou ao fim. Para continuar usando a plataforma, escolha um plano com vigência contratual de {SUBSCRIPTION_TERM_LABEL}.
                  </div>

                  <div className="grid gap-3">
                    {paidPlans.map((plan) => (
                      <button
                        key={plan.key}
                        type="button"
                        onClick={() => setSelectedPlan(plan.key)}
                        className={`rounded-lg border p-3 text-left transition-colors ${
                          selectedPlan === plan.key ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{plan.name}</p>
                            <p className="text-xs text-muted-foreground">{plan.marketing.audience}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {plan.marketing.highlight && <Badge variant="outline">{plan.marketing.highlight}</Badge>}
                            {selectedPlan === plan.key && <Badge variant="secondary">Selecionado</Badge>}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{plan.marketing.summary}</p>
                        <div className="mt-3 space-y-1">
                          {plan.marketing.features.map((feature) => (
                            <div key={feature} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                        <p className="mt-2 text-sm font-medium">R$ {plan.monthlyPrice.toFixed(2)}/mês</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">Contrato de {SUBSCRIPTION_TERM_LABEL}</p>
                      </button>
                    ))}
                  </div>

                  <Button type="submit" className="w-full" disabled={!selectedPlan}>
                    Avançar para pagamento
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <CreditCard className="h-5 w-5" />
                  <span className="text-sm font-semibold">Pagamento e ativação</span>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-sm font-medium">
                      Plano {selectedPlanData.name} - R$ {selectedPlanData.monthlyPrice.toFixed(2)}/mês
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Vigência contratual de {SUBSCRIPTION_TERM_LABEL} para continuidade da operação.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Forma de pagamento</Label>
                    <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="card">Cartão</SelectItem>
                        <SelectItem value="boleto">Boleto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={paymentConfirmed ? "secondary" : "default"}
                      className="flex-1"
                      onClick={handlePayment}
                      disabled={processingPayment || paymentConfirmed}
                    >
                      {paymentConfirmed ? "Pagamento confirmado" : processingPayment ? "Processando..." : "Confirmar pagamento"}
                    </Button>
                    <Button type="submit" variant="outline" className="flex-1" disabled={!paymentConfirmed || loading}>
                      {loading ? "Ativando..." : "Ativar plano"}
                    </Button>
                  </div>

                  <Button type="button" variant="ghost" className="w-full" onClick={() => setStep(1)}>
                    Voltar
                  </Button>
                </div>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
