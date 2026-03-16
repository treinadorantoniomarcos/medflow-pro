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

export const planMarketingContent: Record<string, PlanMarketingContent> = {
  start: {
    summary: "Operacao essencial para um profissional iniciar a agenda online com organizacao e confirmacao basica.",
    audience: "Ideal para um unico profissional de saude em atendimento autonomo ou consultorio enxuto.",
    features: [
      "Licenca para 1 profissional",
      "Agenda diaria com cadastro de pacientes",
      "Confirmacao simples e status da consulta",
      "Link de agendamento para divulgar em redes sociais",
    ],
  },
  pro: {
    summary: "Fluxo completo para equipes pequenas que precisam reduzir faltas e organizar a rotina financeira.",
    audience: "Ideal para clinicas e consultorios com ate 3 profissionais.",
    features: [
      "Licenca para ate 3 profissionais",
      "Tudo do plano Start",
      "Automacoes de lembrete D-2 e D-1",
      "Controle de retorno, financeiro e repasse por profissional",
    ],
    highlight: "Mais escolhido",
  },
  signature: {
    summary: "Camada executiva para operacao estruturada com governanca, indicadores e automacoes avancadas.",
    audience: "Ideal para clinicas com 4 a 10 profissionais.",
    features: [
      "Licenca para 4 a 10 profissionais",
      "Tudo do plano Pro",
      "Dashboard executivo com KPIs e fila operacional",
      "Automacoes avancadas e alertas preditivos",
    ],
    highlight: "Escala premium",
  },
  courtesy: {
    summary: "Cortesia temporaria para onboarding assistido e ativacao acompanhada.",
    audience: "Uso interno ou comercial assistido, sem foco em autosservico.",
    features: [
      "Periodo temporario de experimentacao",
      "Configuracao inicial acompanhada",
      "Ativacao controlada pelo time da plataforma",
    ],
  },
};

export const fallbackPlanOptions: PlanOption[] = [
  {
    key: "start",
    name: "Start",
    monthlyPrice: 199,
    description: "1 profissional | agenda e operacao essencial",
    periodDays: 30,
    trialDays: 0,
    isCourtesy: false,
    marketing: planMarketingContent.start,
  },
  {
    key: "pro",
    name: "Pro",
    monthlyPrice: 399,
    description: "Ate 3 profissionais | agenda + automacoes + financeiro",
    periodDays: 30,
    trialDays: 0,
    isCourtesy: false,
    marketing: planMarketingContent.pro,
  },
  {
    key: "signature",
    name: "Signature",
    monthlyPrice: 799,
    description: "4 a 10 profissionais | operacao completa com controle premium",
    periodDays: 30,
    trialDays: 0,
    isCourtesy: false,
    marketing: planMarketingContent.signature,
  },
];

export const getPlanMarketingContent = (planKey: string): PlanMarketingContent => {
  return (
    planMarketingContent[planKey] ?? {
      summary: "Pacote configurado para operacao por assinatura.",
      audience: "Indicado para contratantes que precisam validar este escopo com o time comercial.",
      features: [
        "Configuracao operacional por tenant",
        "Ativacao conforme plano contratado",
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
      `${plan.marketing.summary}\n` +
      `${plan.marketing.audience}\n\n` +
      `Inclui:\n- ${plan.marketing.features.join("\n- ")}`,
    whatsapp:
      `*Pacote ${plan.name}*\n` +
      `${plan.description}\n` +
      `${plan.marketing.summary}\n` +
      `${plan.marketing.audience}\n` +
      `Inclui: ${featureLine}.`,
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
