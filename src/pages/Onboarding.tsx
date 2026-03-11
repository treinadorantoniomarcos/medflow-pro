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
import { Building2, CreditCard, Sparkles, User } from "lucide-react";
import medfluxLogo from "@/assets/medflux-logo.png";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

type PlanKey = string;
type PaymentMethod = "pix" | "card" | "boleto";

const planOptions: Array<{
  key: PlanKey;
  name: string;
  monthlyPrice: number;
  description: string;
}> = [
  { key: "start", name: "Start", monthlyPrice: 199, description: "Agenda e operacao essencial" },
  { key: "pro", name: "Pro", monthlyPrice: 399, description: "Agenda + automacoes + financeiro" },
  { key: "signature", name: "Signature", monthlyPrice: 799, description: "Operacao completa com controle premium" },
];

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

  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("pro");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [clinicName, setClinicName] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

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

  const availablePlans = useMemo(() => {
    if (catalogPlans.length > 0) {
      return catalogPlans.map((plan) => ({
        key: plan.code,
        name: plan.name,
        monthlyPrice: plan.monthly_price_cents / 100,
        description:
          plan.description ??
          `Periodo ${plan.period_days} dias${plan.trial_days > 0 ? ` | cortesia ${plan.trial_days} dias` : ""}`,
      }));
    }
    return planOptions;
  }, [catalogPlans]);

  useEffect(() => {
    if (!availablePlans.find((plan) => plan.key === selectedPlan)) {
      setSelectedPlan(availablePlans[0]?.key ?? "pro");
    }
  }, [availablePlans, selectedPlan]);

  const selectedPlanData = useMemo(
    () => availablePlans.find((plan) => plan.key === selectedPlan) ?? availablePlans[0] ?? planOptions[1],
    [availablePlans, selectedPlan]
  );

  const handlePayment = async () => {
    setProcessingPayment(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setPaymentConfirmed(true);
    setProcessingPayment(false);
    toast.success("Pagamento confirmado", {
      description: "Primeira mensalidade registrada. Sua assinatura sera ativada no cadastro final.",
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
        _clinic_name: clinicName.trim(),
        _full_name: fullName.trim(),
        _phone: phone.trim() || null,
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
              owner_name: fullName.trim(),
            },
            subscription: {
              plan: selectedPlan,
              status: "active",
              payment_method: paymentMethod,
              first_payment_at: billingNow.toISOString(),
              current_period_start: billingNow.toISOString(),
              current_period_end: nextPeriod.toISOString(),
              grace_until: null,
            },
          },
        })
        .eq("id", clinicId);

      if (settingsError) throw settingsError;

      await refreshProfile();
      toast.success("Tudo pronto!", { description: "Sua clinica foi configurada e ativada." });
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
            {step === 1 ? "Escolha seu pacote" : step === 2 ? "Pagamento da primeira mensalidade" : "Dados da clinica"}
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
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-sm font-semibold">{plan.name}</p>
                        {selectedPlan === plan.key && <Badge variant="secondary">Selecionado</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{plan.description}</p>
                      <p className="mt-2 text-sm font-medium">R$ {plan.monthlyPrice.toFixed(2)}/mes</p>
                    </button>
                  ))}
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
                    O acesso da clinica so sera liberado apos confirmacao deste pagamento.
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
                  <span className="text-sm font-semibold">Dados da clinica e responsavel</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinicName">Nome da Clinica</Label>
                  <Input
                    id="clinicName"
                    placeholder="Ex: Clinica Saude Viva"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome completo</Label>
                  <Input
                    id="fullName"
                    placeholder="Seu nome completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone (opcional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
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
                    disabled={loading || !fullName.trim() || !clinicName.trim() || !paymentConfirmed}
                  >
                    {loading ? "Criando..." : "Finalizar"}
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
