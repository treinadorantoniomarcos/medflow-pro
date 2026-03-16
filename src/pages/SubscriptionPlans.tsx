import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import medfluxLogo from "@/assets/medflux-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const SubscriptionPlans = () => {
  const navigate = useNavigate();

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
        `Periodo ${plan.period_days} dias${plan.trial_days > 0 ? ` | cortesia ${plan.trial_days} dias` : ""}`,
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

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-3">
            <img src={medfluxLogo} alt="MedFlux Pro" className="h-14 w-14 rounded-2xl" />
            <div>
              <p className="text-sm font-semibold text-primary">Assinatura para clinicas e profissionais</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Escolha o pacote ideal para sua operacao</h1>
            </div>
          </div>

          <p className="max-w-3xl text-sm text-muted-foreground">
            Compare os planos do MedFlux Pro e escolha o pacote mais adequado ao porte da sua operacao.
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
                    por mes | vigencia de {SUBSCRIPTION_TERM_LABEL}{plan.trialDays ? ` | ${plan.trialDays} dias de cortesia` : ""}{plan.isCourtesy ? " | pacote cortesia" : ""}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-5">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Para quem e</p>
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
              Operacoes com mais de 11 profissionais saem do pacote padrao e entram em um projeto customizado, com escopo comercial e tecnico sob medida.
            </p>
            <p className="text-sm font-medium text-foreground">Solicite um orcamento com o time comercial para definir implantacao, capacidade e governanca.</p>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          Ja tem conta? <Link to="/login" className="font-semibold text-primary hover:underline">Entre para concluir a assinatura</Link>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlans;
