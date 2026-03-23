import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import medfluxLogo from "@/assets/medflux-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  SUBSCRIPTION_TERM_LABEL,
  fallbackPlanOptions,
  getPlanMarketingContent,
  storePreferredPlan,
  type PlanOption,
} from "@/lib/subscription-plans";

type CatalogPlan = {
  code: string;
  name: string;
  description: string | null;
  monthly_price_cents: number;
  period_days: number;
  trial_days: number;
  is_courtesy: boolean;
  is_active: boolean;
};

type CustomQuoteForm = {
  companyName: string;
  contactName: string;
  email: string;
  whatsapp: string;
  addressFull: string;
  adminCount: string;
  professionalCount: string;
  patientVolume: string;
  desiredAppType: string;
  additionalInfo: string;
};

const appTypeOptions = [
  "Aplicativo web",
  "Portal web e administrativo",
  "Aplicativo mobile para equipe",
  "Aplicativo para pacientes",
  "Projeto híbrido",
];

const emptyQuoteForm = (): CustomQuoteForm => ({
  companyName: "",
  contactName: "",
  email: "",
  whatsapp: "",
  addressFull: "",
  adminCount: "",
  professionalCount: "",
  patientVolume: "",
  desiredAppType: appTypeOptions[0],
  additionalInfo: "",
});

const SubscriptionPlans = () => {
  const navigate = useNavigate();
  const [customQuoteForm, setCustomQuoteForm] = useState<CustomQuoteForm>(emptyQuoteForm);
  const [submittingQuote, setSubmittingQuote] = useState(false);

  const { data: catalogPlans = [] } = useQuery({
    queryKey: ["public-subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("code, name, description, monthly_price_cents, period_days, trial_days, is_courtesy, is_active")
        .eq("is_active", true)
        .order("monthly_price_cents", { ascending: true });

      if (error) throw error;
      return (data ?? []) as CatalogPlan[];
    },
  });

  const availablePlans = useMemo<PlanOption[]>(() => {
    if (catalogPlans.length === 0) return fallbackPlanOptions;

    return catalogPlans.map((plan) => ({
      key: plan.code,
      name: plan.name,
      monthlyPrice: plan.monthly_price_cents / 100,
      description:
        plan.description ??
        `Período de ${plan.period_days} dias${plan.trial_days > 0 ? ` | cortesia de ${plan.trial_days} dias` : ""}`,
      periodDays: plan.period_days,
      trialDays: plan.trial_days,
      isCourtesy: plan.is_courtesy,
      marketing: getPlanMarketingContent(plan.code),
    }));
  }, [catalogPlans]);


  const handleChoosePlan = (planKey: string) => {
    storePreferredPlan(planKey);
    navigate(`/register?plan=${encodeURIComponent(planKey)}`);
  };

  const handleSubmitCustomQuote = async () => {
    const adminCount = Number(customQuoteForm.adminCount);
    const professionalCount = Number(customQuoteForm.professionalCount);

    if (
      !customQuoteForm.companyName.trim() ||
      !customQuoteForm.contactName.trim() ||
      !customQuoteForm.email.trim() ||
      !customQuoteForm.whatsapp.trim() ||
      !customQuoteForm.addressFull.trim() ||
      !customQuoteForm.patientVolume.trim() ||
      !customQuoteForm.desiredAppType.trim() ||
      !Number.isFinite(adminCount) ||
      adminCount <= 0 ||
      !Number.isFinite(professionalCount) ||
      professionalCount <= 11
    ) {
      toast.error("Preencha os dados principais do projeto customizado.");
      return;
    }

    setSubmittingQuote(true);
    const { error } = await supabase.from("custom_quote_requests").insert({
      company_name: customQuoteForm.companyName.trim(),
      contact_name: customQuoteForm.contactName.trim(),
      email: customQuoteForm.email.trim(),
      whatsapp: customQuoteForm.whatsapp.trim(),
      address_full: customQuoteForm.addressFull.trim(),
      admin_count: adminCount,
      professional_count: professionalCount,
      patient_volume: customQuoteForm.patientVolume.trim(),
      desired_app_type: customQuoteForm.desiredAppType.trim(),
      additional_info: customQuoteForm.additionalInfo.trim() || null,
      source_url: window.location.href,
      status: "pending",
    });
    setSubmittingQuote(false);

    if (error) {
      toast.error("Não foi possível enviar sua solicitação.", { description: error.message });
      return;
    }

    toast.success("Solicitação enviada com sucesso.", {
      description: "Entraremos em contato em até 48 horas.",
    });
    setCustomQuoteForm(emptyQuoteForm());
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-3">
            <img src={medfluxLogo} alt="MedFlux Pro" className="h-14 w-14 rounded-2xl" />
            <div>
              <p className="text-sm font-semibold text-primary">Assinatura para clínicas e profissionais</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Escolha o pacote ideal para sua operação</h1>
            </div>
          </div>

          <p className="max-w-3xl text-sm text-muted-foreground">
            Compare os planos do MedFlux Pro e escolha o pacote mais adequado ao porte da sua operação.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {availablePlans.map((plan) => (
            <Card key={plan.key} className="relative flex h-full flex-col border-border shadow-soft">
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  {plan.marketing.highlight && <Badge>{plan.marketing.highlight}</Badge>}
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-foreground">R$ {plan.monthlyPrice.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">
                    por mês | vigência de {SUBSCRIPTION_TERM_LABEL}{plan.trialDays ? ` | ${plan.trialDays} dias de cortesia` : ""}{plan.isCourtesy ? " | pacote cortesia" : ""}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-5">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Para quem é</p>
                  <p className="text-sm text-muted-foreground">{plan.marketing.audience}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Resumo</p>
                  <p className="text-sm text-muted-foreground">{plan.marketing.summary}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Inclui</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {plan.marketing.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto space-y-2">
                  <Button className="w-full" onClick={() => handleChoosePlan(plan.key)}>
                    Assinar este pacote
                  </Button>
                  <Button asChild variant="ghost" className="w-full">
                    <Link to={`/register?plan=${encodeURIComponent(plan.key)}`}>Criar conta e continuar</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-dashed border-border shadow-soft">
          <CardContent className="flex flex-col gap-3 p-6 text-center">
            <div>
              <p className="text-sm font-semibold text-primary">Acima de 11 profissionais</p>
              <h2 className="mt-1 text-2xl font-extrabold text-foreground">Plataforma customizada</h2>
            </div>
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
              Operações com mais de 11 profissionais saem do pacote padrão e entram em um projeto customizado, com escopo comercial e técnico sob medida.
            </p>
            <p className="text-sm font-medium text-foreground">Solicite um orçamento com o time comercial para definir implantação, capacidade e governança.</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-soft">
          <CardHeader>
            <p className="text-sm font-semibold text-primary">Projeto sob medida</p>
            <h2 className="text-2xl font-extrabold text-foreground">Solicite uma proposta customizada</h2>
          </CardHeader>
          <CardContent className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Preencha as informações principais do seu projeto para que o time comercial entenda a operação e retorne com uma proposta adequada.
              </p>
              <div className="grid gap-3 rounded-2xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
                <p>Resposta em até 48 horas.</p>
                <p>Ideal para operações com mais de 11 profissionais.</p>
                <p>Os dados chegam diretamente ao Super Admin para análise comercial.</p>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quote-company">Nome da empresa</Label>
                  <Input
                    id="quote-company"
                    value={customQuoteForm.companyName}
                    onChange={(e) => setCustomQuoteForm((prev) => ({ ...prev, companyName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quote-contact">Nome do contato</Label>
                  <Input
                    id="quote-contact"
                    value={customQuoteForm.contactName}
                    onChange={(e) => setCustomQuoteForm((prev) => ({ ...prev, contactName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quote-email">E-mail</Label>
                  <Input
                    id="quote-email"
                    type="email"
                    value={customQuoteForm.email}
                    onChange={(e) => setCustomQuoteForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quote-whatsapp">WhatsApp</Label>
                  <Input
                    id="quote-whatsapp"
                    value={customQuoteForm.whatsapp}
                    onChange={(e) => setCustomQuoteForm((prev) => ({ ...prev, whatsapp: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quote-address">Endereço completo</Label>
                <Textarea
                  id="quote-address"
                  value={customQuoteForm.addressFull}
                  onChange={(e) => setCustomQuoteForm((prev) => ({ ...prev, addressFull: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quote-admins">Quantos admins terão acesso?</Label>
                  <Input
                    id="quote-admins"
                    type="number"
                    min={1}
                    value={customQuoteForm.adminCount}
                    onChange={(e) => setCustomQuoteForm((prev) => ({ ...prev, adminCount: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quote-professionals">Quantos profissionais terão acesso?</Label>
                  <Input
                    id="quote-professionals"
                    type="number"
                    min={12}
                    value={customQuoteForm.professionalCount}
                    onChange={(e) => setCustomQuoteForm((prev) => ({ ...prev, professionalCount: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quote-patients">Média de clientes/pacientes</Label>
                  <Input
                    id="quote-patients"
                    value={customQuoteForm.patientVolume}
                    onChange={(e) => setCustomQuoteForm((prev) => ({ ...prev, patientVolume: e.target.value }))}
                    placeholder="Ex.: 300 por mês"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quote-app-type">Tipo de aplicativo desejado</Label>
                  <Select
                    value={customQuoteForm.desiredAppType}
                    onValueChange={(value) => setCustomQuoteForm((prev) => ({ ...prev, desiredAppType: value }))}
                  >
                    <SelectTrigger id="quote-app-type">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {appTypeOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quote-notes">Mais informações importantes</Label>
                <Textarea
                  id="quote-notes"
                  value={customQuoteForm.additionalInfo}
                  onChange={(e) => setCustomQuoteForm((prev) => ({ ...prev, additionalInfo: e.target.value }))}
                  rows={4}
                  placeholder="Escreva o que mais for importante para o seu projeto."
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button className="w-full sm:w-auto" onClick={handleSubmitCustomQuote} disabled={submittingQuote}>
                  {submittingQuote ? "Enviando..." : "Enviar solicitação"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Ao enviar, você confirma que deseja receber contato comercial em até 48 horas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          Já tem conta? <Link to="/login" className="font-semibold text-primary hover:underline">Entre para concluir a assinatura</Link>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlans;
