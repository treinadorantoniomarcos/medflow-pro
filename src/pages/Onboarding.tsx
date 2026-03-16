import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Check, CreditCard, Sparkles, User } from "lucide-react";
import medfluxLogo from "@/assets/medflux-logo.png";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import {
  fallbackPlanOptions,
  getPlanMarketingContent,
  readPreferredPlan,
  storePreferredPlan,
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
  is_courtesy: boolean;
  is_active: boolean;
};

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<PlanKey>(() => readPreferredPlan() ?? "pro");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [contractorName, setContractorName] = useState("");
  const [adminFullName, setAdminFullName] = useState("");
  const [adminEmail, setAdminEmail] = useState(user?.email ?? "");
  const [adminWhatsapp, setAdminWhatsapp] = useState("");

  const { data: catalogPlans = [] } = useQuery({
    queryKey: ["onboarding-active-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("id, code, name, description, monthly_price_cents, period_days, trial_days, is_courtesy, is_active")
        .eq("is_active", true)
        .order("monthly_price_cents", { ascending: true });

      if (error) throw error;
      return (data ?? []) as CatalogPlan[];
    },
  });

  const availablePlans = useMemo<PlanOption[]>(() => {
    if (catalogPlans.length > 0) {
      return catalogPlans.map((plan) => ({
        key: plan.code,
        name: plan.name,
        monthlyPrice: plan.monthly_price_cents / 100,
        description:
          plan.description ??
          `Periodo ${plan.period_days} dias${plan.trial_days > 0 ? ` | cortesia ${plan.trial_days} dias` : ""}`,
        periodDays: plan.period_days,
        trialDays: plan.trial_days,
        isCourtesy: plan.is_courtesy,
        marketing: getPlanMarketingContent(plan.code),
      }));
    }
    return fallbackPlanOptions;
  }, [catalogPlans]);

  useEffect(() => {
    if (!availablePlans.find((plan) => plan.key === selectedPlan)) {
      setSelectedPlan(availablePlans[0]?.key ?? "pro");
    }
  }, [availablePlans, selectedPlan]);

  useEffect(() => {
    storePreferredPlan(selectedPlan);
  }, [selectedPlan]);

  useEffect(() => {
    if (user?.email) {
      setAdminEmail((current) => current || user.email || "");
    }
  }, [user?.email]);

  const selectedPlanData = useMemo(
    () => availablePlans.find((plan) => plan.key === selectedPlan) ?? availablePlans[0] ?? fallbackPlanOptions[1],
    [availablePlans, selectedPlan]
  );

  const handlePayment = async () => {
    setProcessingPayment(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setPaymentConfirmed(true);
    setProcessingPayment(false);
    toast.success("Pagamento confirmado", {
      description: "Primeira mensalidade registrada. Sua solicitacao seguira para validacao no cadastro final.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!paymentConfirmed) {
      toast.error("Pagamento inicial pendente", {
        description: "Confirme a primeira mensalidade para ativar o acesso.",
      });
      return;
    }

    setLoading(true);

    try {
      const clinicId = crypto.randomUUID();

      const { error } = await supabase.rpc("complete_onboarding", {
        _clinic_id: clinicId,
        _clinic_name: contractorName.trim(),
        _full_name: adminFullName.trim(),
        _phone: adminWhatsapp.trim() || null,
      });

      if (error) throw error;

      const billingNow = new Date();
      const nextPeriod = new Date(billingNow);
      nextPeriod.setMonth(nextPeriod.getMonth() + 1);

      const { error: settingsError } = await supabase
        .from("clinics")
        .update({
          settings: {
            onboarding: {
              completed_at: billingNow.toISOString(),
              owner_name: adminFullName.trim(),
              contractor_name: contractorName.trim(),
              access_request: {
                status: "pending_super_admin_release",
                submitted_at: billingNow.toISOString(),
                contractor_name: contractorName.trim(),
                admin_full_name: adminFullName.trim(),
                admin_email: adminEmail.trim().toLowerCase(),
                admin_whatsapp: adminWhatsapp.trim() || null,
                selected_plan: selectedPlan,
                payment_method: paymentMethod,
              },
            },
            subscription: {
              plan: selectedPlan,
              status: "paused",
              payment_method: paymentMethod,
              first_payment_at: billingNow.toISOString(),
              current_period_start: billingNow.toISOString(),
              current_period_end: nextPeriod.toISOString(),
              grace_until: null,
              pending_release: true,
            },
          },
        })
        .eq("id", clinicId);

      if (settingsError) throw settingsError;

      await refreshProfile();
      toast.success("Solicitacao enviada", {
        description: "Os dados foram enviados ao Super Admin. O acesso sera liberado apos validacao.",
      });
      navigate("/");
    } catch (err: any) {
      toast.error("Erro no cadastro", { description: err.message });
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-[520px] shadow-medium border-border">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <img src={medfluxLogo} alt="MedFlux Pro" className="h-14 w-14" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              Bem-vindo ao MedFlux Pro
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {step === 1 ? "Escolha seu pacote" : step === 2 ? "Pagamento da primeira mensalidade" : "Dados do contratante e administrador"}
          </p>

          <div className="flex items-center justify-center gap-2 mt-4">
            <div className={`h-2 w-16 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
            <div className={`h-2 w-16 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
            <div className={`h-2 w-16 rounded-full ${step >= 3 ? "bg-primary" : "bg-muted"}`} />
          </div>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={step < 3 ? (e) => { e.preventDefault(); setStep((current) => current + 1); } : handleSubmit}
            className="space-y-5"
          >
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 text-primary mb-2">
                  <Building2 className="h-5 w-5" />
                  <span className="text-sm font-semibold">Escolha seu pacote</span>
                </div>
                <div className="grid gap-3">
                  {availablePlans.map((plan) => (
                    <button
                      key={plan.key}
                      type="button"
                      onClick={() => setSelectedPlan(plan.key)}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        selectedPlan === plan.key
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/40"
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
                      <p className="mt-2 text-sm font-medium">R$ {plan.monthlyPrice.toFixed(2)}/mes</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {plan.description}
                        {plan.trialDays ? ` | ${plan.trialDays} dias de cortesia` : ""}
                      </p>
                    </button>
                  ))}
                </div>
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                  Acima de 11 profissionais, a contratacao passa a ser customizada e deve seguir para solicitacao de orcamento.
                </div>
                <Button type="submit" className="w-full" disabled={!selectedPlan}>
                  Proximo
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 text-primary mb-2">
                  <CreditCard className="h-5 w-5" />
                  <span className="text-sm font-semibold">Primeira mensalidade</span>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-sm font-medium">
                    Plano {selectedPlanData.name} - R$ {selectedPlanData.monthlyPrice.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Apos o pagamento, voce informara os dados que o Super Admin usara para analisar e liberar o acesso.
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
                      <SelectItem value="card">Cartao</SelectItem>
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
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    disabled={!paymentConfirmed}
                    onClick={() => setStep(3)}
                  >
                    Continuar
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setStep(1)}
                >
                  Voltar
                </Button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 text-primary mb-2">
                  <User className="h-5 w-5" />
                  <span className="text-sm font-semibold">Dados para liberacao do acesso</span>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                  Esses dados serao enviados ao Super Admin para validacao e liberacao do sistema.
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contractorName">Nome do Contratante</Label>
                  <Input
                    id="contractorName"
                    placeholder="Ex: Clinica Saude Viva LTDA"
                    value={contractorName}
                    onChange={(e) => setContractorName(e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminFullName">Nome completo do administrador</Label>
                  <Input
                    id="adminFullName"
                    placeholder="Nome do administrador responsavel pelo sistema"
                    value={adminFullName}
                    onChange={(e) => setAdminFullName(e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">E-mail</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="admin@clinica.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    required
                    maxLength={120}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminWhatsapp">WhatsApp</Label>
                  <Input
                    id="adminWhatsapp"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={adminWhatsapp}
                    onChange={(e) => setAdminWhatsapp(e.target.value)}
                    required
                    maxLength={20}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(2)}
                  >
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 gap-2"
                    disabled={
                      loading ||
                      !adminFullName.trim() ||
                      !contractorName.trim() ||
                      !adminEmail.trim() ||
                      !adminWhatsapp.trim() ||
                      !paymentConfirmed
                    }
                  >
                    {loading ? "Enviando..." : "Enviar para liberacao"}
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
