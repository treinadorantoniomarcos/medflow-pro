export type PlanKey = string;

export type PlanMarketingContent = {
  summary: string;
  audience: string;
  features: string[];
  highlight?: string;
};

export type PlanCommercialCopy = {
  text: string;
};

export type PlanOption = {
  key: PlanKey;
  name: string;
  monthlyPrice: number;
  description: string;
  periodDays?: number;
  trialDays?: number;
  marketing: PlanMarketingContent;
};

export const PLAN_PREFERENCE_KEY = "medflow-preferred-plan";
export const SUBSCRIPTION_SHARE_PATH = "/assinar";
export const TRIAL_SHARE_PATH = "/degustacao";
export const PLATFORM_DEMO_VIDEO_URL = "https://drive.google.com/drive/u/1/folders/1U3KwW_Glpyx377jQksu-a2knubH78Zik";
export const COURTESY_PLAN_KEY = "courtesy";
export const COURTESY_PLAN_NAME = "Degustação inicial";
export const COURTESY_PLAN_DESCRIPTION =
  "Operação essencial para um profissional iniciar a agenda online com organização e confirmação básica.";
// Pro remains permanently mapped to the approved Kiwify checkout.
export const PRO_CHECKOUT_URL = "https://pay.kiwify.com.br/T9SzApY";
export const SIGNATURE_CHECKOUT_URL = "https://pay.kiwify.com.br/2GZhB9R";
export const SUBSCRIPTION_TERM_DAYS = 365;
export const SUBSCRIPTION_TERM_LABEL = "12 meses";
export const START_TRIAL_DAYS = 21;
export const PROFESSIONAL_LIMITS = {
  start: 1,
  pro: 3,
  signature: 10,
} as const;
export const UPGRADE_REQUEST_PATH = "/assinar?mode=upgrade";

export type CommercialPlanKey = "start" | "pro" | "signature";

export type ProfessionalLimitConfig = {
  currentPlan: CommercialPlanKey;
  currentPlanLabel: string;
  maxProfessionals: number;
  nextPlanLabel: string;
  upgradePath: string;
  upgradeLabel: string;
  headline: string;
  description: string;
};

export const normalizeCommercialPlanKey = (planKey?: string | null): CommercialPlanKey => {
  const value = planKey?.trim().toLowerCase();
  if (value === "pro" || value === "signature") return value;
  return "start";
};

export const getProfessionalLimitConfig = (planKey?: string | null): ProfessionalLimitConfig => {
  const currentPlan = normalizeCommercialPlanKey(planKey);

  switch (currentPlan) {
    case "pro":
      return {
        currentPlan,
        currentPlanLabel: "Pro",
        maxProfessionals: PROFESSIONAL_LIMITS.pro,
        nextPlanLabel: "Signature",
        upgradePath: "/assinar?plan=signature",
        upgradeLabel: "Assinar Signature",
        headline: "A partir do 4º profissional, faça upgrade para o Signature.",
        description: "O plano Pro permite até 3 profissionais ativos.",
      };
    case "signature":
      return {
        currentPlan,
        currentPlanLabel: "Signature",
        maxProfessionals: PROFESSIONAL_LIMITS.signature,
        nextPlanLabel: "Pacote Executivo",
        upgradePath: UPGRADE_REQUEST_PATH,
        upgradeLabel: "Solicitar pacote executivo",
        headline: "A partir do 11º profissional, solicite o pacote executivo.",
        description: "O plano Signature permite até 10 profissionais ativos.",
      };
    case "start":
    default:
      return {
        currentPlan: "start",
        currentPlanLabel: "Start",
        maxProfessionals: PROFESSIONAL_LIMITS.start,
        nextPlanLabel: "Pro",
        upgradePath: "/assinar?plan=pro",
        upgradeLabel: "Assinar Pro",
        headline: "A partir do 2º profissional, faça upgrade para o Pro.",
        description: "O plano Start permite até 1 profissional ativo.",
      };
  }
};

export const planMarketingContent: Record<string, PlanMarketingContent> = {
  start: {
    summary: "Entrada premium para organizar a agenda, dar previsibilidade à operação e validar a experiência por 21 dias.",
    audience: "Ideal para profissionais individuais e consultórios que querem começar com presença digital profissional.",
    features: [
      "Licença para 1 profissional",
      "Contrato com vigência de 12 meses",
      "Experiência gratuita de 21 dias",
      "Agenda diária com cadastro de pacientes",
      "Confirmação simples e status da consulta",
      "Link de agendamento para divulgar em redes sociais",
    ],
    highlight: "21 dias premium",
  },
  pro: {
    summary: "Estrutura ideal para equipes pequenas que precisam de rotina previsível, menos faltas e uma operação mais sofisticada.",
    audience: "Ideal para clínicas e consultórios com até 3 profissionais em fase de crescimento.",
    features: [
      "Licença para até 3 profissionais",
      "Contrato com vigência de 12 meses",
      "Tudo do plano Start",
      "Agenda, automações e controle operacional",
    ],
    highlight: "Mais escolhido",
  },
  signature: {
    summary: "Camada executiva para clínicas que exigem governança, indicadores e automações em padrão premium.",
    audience: "Ideal para operações com 4 a 10 profissionais e gestão mais sofisticada.",
    features: [
      "Licença para 4 a 10 profissionais",
      "Contrato com vigência de 12 meses",
      "Tudo do plano Pro",
      "Dashboard executivo com KPIs e fila operacional",
      "Automações avançadas e alertas preditivos",
    ],
    highlight: "Escala premium",
  },
};

export const fallbackPlanOptions: PlanOption[] = [
  {
    key: "start",
    name: "Start",
    monthlyPrice: 199,
    description: "1 profissional | agenda e operação essencial com experiência premium de 21 dias",
    periodDays: SUBSCRIPTION_TERM_DAYS,
    trialDays: START_TRIAL_DAYS,
    marketing: planMarketingContent.start,
  },
  {
    key: "pro",
    name: "Pro",
    monthlyPrice: 399,
    description: "Até 3 profissionais | agenda, automações e controle operacional",
    periodDays: SUBSCRIPTION_TERM_DAYS,
    trialDays: 0,
    marketing: planMarketingContent.pro,
  },
  {
    key: "signature",
    name: "Signature",
    monthlyPrice: 799,
    description: "4 a 10 profissionais | operação completa em padrão executivo",
    periodDays: SUBSCRIPTION_TERM_DAYS,
    trialDays: 0,
    marketing: planMarketingContent.signature,
  },
];

export const paidPlanOptions = fallbackPlanOptions;

export const getPlanMarketingContent = (planKey: string): PlanMarketingContent => {
  if (planKey === COURTESY_PLAN_KEY) {
    return planMarketingContent.start;
  }

  return (
    planMarketingContent[planKey] ?? {
      summary: "Plano configurado para uma operação por assinatura com posicionamento profissional.",
      audience: "Indicado para contratantes que precisam validar o escopo com o time comercial.",
      features: [
        "Configuração operacional por tenant",
        "Ativação conforme plano contratado",
        "Suporte a agenda, atendimento e acompanhamento",
      ],
    }
  );
};

export const getPlanCommercialCopy = (plan: PlanOption): PlanCommercialCopy => {
  return {
    text:
      `Plano ${plan.name}\n` +
      `${plan.description}\n\n` +
      `Vigência contratual: ${SUBSCRIPTION_TERM_LABEL}\n` +
      `${plan.marketing.summary}\n` +
      `${plan.marketing.audience}\n\n` +
      `Inclui:\n- ${plan.marketing.features.join("\n- ")}`,
  };
};

export const getSubscriptionShareUrl = (origin: string) => `${origin}${SUBSCRIPTION_SHARE_PATH}`;

export const getTrialSubscriptionShareUrl = (origin: string) => `${origin}${TRIAL_SHARE_PATH}`;

export const getConfiguredPlatformDemoUrl = (configuredUrl?: string | null) => {
  const trimmed = configuredUrl?.trim();
  return trimmed ? trimmed : PLATFORM_DEMO_VIDEO_URL;
};

export const getConfiguredSubscriptionShareUrl = (origin: string, configuredUrl?: string | null) => {
  const trimmed = configuredUrl?.trim();
  return trimmed ? trimmed : getSubscriptionShareUrl(origin);
};

export const storePreferredPlan = (planKey: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PLAN_PREFERENCE_KEY, planKey);
};

export const readPreferredPlan = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PLAN_PREFERENCE_KEY);
};
