export type PlanKey = string;

export type PlanMarketingContent = {
  summary: string;
  audience: string;
  features: string[];
  highlight?: string;
};

export type PlanCommercialCopy = {
  social: string;
  email: string;
  whatsapp: string;
};

export type PlanOption = {
  key: PlanKey;
  name: string;
  monthlyPrice: number;
  description: string;
  periodDays?: number;
  trialDays?: number;
  isCourtesy?: boolean;
  marketing: PlanMarketingContent;
};

export const PLAN_PREFERENCE_KEY = "medflow-preferred-plan";
export const SUBSCRIPTION_SHARE_PATH = "/assinar";
export const SUBSCRIPTION_TERM_DAYS = 365;
export const SUBSCRIPTION_TERM_LABEL = "12 meses";
export const ALLOWED_TRIAL_DAYS = [7, 15, 30] as const;
export const START_TRIAL_DAYS = 7;

export const planMarketingContent: Record<string, PlanMarketingContent> = {
  start: {
    summary: "Operação essencial para um profissional iniciar a agenda online com organização e confirmação básica.",
    audience: "Ideal para um único profissional de saúde, em atendimento autônomo ou em um consultório enxuto.",
    features: [
      "Licença para 1 profissional",
      "Contrato com vigência de 12 meses",
      "Agenda diária com cadastro de pacientes",
      "Confirmação simples e status da consulta",
      "Link de agendamento para divulgar em redes sociais",
    ],
  },
  pro: {
    summary: "Fluxo completo para equipes pequenas que precisam reduzir faltas e organizar a rotina financeira.",
    audience: "Ideal para clínicas e consultórios com até 3 profissionais.",
    features: [
      "Licença para até 3 profissionais",
      "Contrato com vigência de 12 meses",
      "Tudo do plano Start",
      "Automações de lembrete D-2 e D-1",
      "Controle de retorno, financeiro e repasse por profissional",
    ],
    highlight: "Mais escolhido",
  },
  signature: {
    summary: "Camada executiva para uma operação estruturada, com governança, indicadores e automações avançadas.",
    audience: "Ideal para clínicas com 4 a 10 profissionais.",
    features: [
      "Licença para 4 a 10 profissionais",
      "Contrato com vigência de 12 meses",
      "Tudo do plano Pro",
      "Dashboard executivo com KPIs e fila operacional",
      "Automações avançadas e alertas preditivos",
    ],
    highlight: "Escala premium",
  },
  courtesy: {
    summary: "Cortesia temporária para onboarding assistido e ativação acompanhada.",
    audience: "Uso interno ou comercial assistido, sem foco em autosserviço.",
    features: [
      "Período temporário de experimentação",
      "Configuração inicial acompanhada",
      "Ativação controlada pelo time da plataforma",
    ],
  },
};

export const fallbackPlanOptions: PlanOption[] = [
  {
    key: "start",
    name: "Start",
    monthlyPrice: 199,
    description: "1 profissional | agenda e operação essencial",
    periodDays: SUBSCRIPTION_TERM_DAYS,
    trialDays: 0,
    isCourtesy: false,
    marketing: planMarketingContent.start,
  },
  {
    key: "pro",
    name: "Pro",
    monthlyPrice: 399,
    description: "Até 3 profissionais | agenda + automações + financeiro",
    periodDays: SUBSCRIPTION_TERM_DAYS,
    trialDays: 0,
    isCourtesy: false,
    marketing: planMarketingContent.pro,
  },
  {
    key: "signature",
    name: "Signature",
    monthlyPrice: 799,
    description: "4 a 10 profissionais | operação completa com controle premium",
    periodDays: SUBSCRIPTION_TERM_DAYS,
    trialDays: 0,
    isCourtesy: false,
    marketing: planMarketingContent.signature,
  },
];

export const paidPlanOptions = fallbackPlanOptions.filter((plan) => !plan.isCourtesy);

export const getPlanMarketingContent = (planKey: string): PlanMarketingContent => {
  return (
    planMarketingContent[planKey] ?? {
      summary: "Pacote configurado para operação por assinatura.",
      audience: "Indicado para contratantes que precisam validar este escopo com o time comercial.",
      features: [
        "Configuração operacional por tenant",
        "Ativação conforme plano contratado",
        "Suporte a agenda, atendimento e acompanhamento",
      ],
    }
  );
};

export const getPlanCommercialCopy = (plan: PlanOption): PlanCommercialCopy => {
  const headline = `${plan.name}: ${plan.description}`;
  const featureLine = plan.marketing.features.slice(0, 3).join(" | ");

  return {
    social: `${headline}. ${plan.marketing.summary} ${plan.marketing.audience} Destaques: ${featureLine}.`,
    email:
      `Pacote ${plan.name}\n` +
      `${plan.description}\n\n` +
      `Vigência contratual: ${SUBSCRIPTION_TERM_LABEL}\n` +
      `${plan.marketing.summary}\n` +
      `${plan.marketing.audience}\n\n` +
      `Inclui:\n- ${plan.marketing.features.join("\n- ")}`,
    whatsapp:
      `*Pacote ${plan.name}*\n` +
      `${plan.description}\n` +
      `Vigência contratual: ${SUBSCRIPTION_TERM_LABEL}\n` +
      `${plan.marketing.summary}\n` +
      `${plan.marketing.audience}\n` +
      `Principais recursos: ${featureLine}.`,
  };
};

export const getSubscriptionShareUrl = (origin: string) => `${origin}${SUBSCRIPTION_SHARE_PATH}`;

export const storePreferredPlan = (planKey: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PLAN_PREFERENCE_KEY, planKey);
};

export const readPreferredPlan = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PLAN_PREFERENCE_KEY);
};
