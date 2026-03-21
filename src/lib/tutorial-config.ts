export type TutorialProfile =
  | "super_admin"
  | "owner"
  | "admin"
  | "professional"
  | "receptionist"
  | "patient";

export type TutorialScreen =
  | "dashboard"
  | "agenda"
  | "gestao_agenda"
  | "pacientes"
  | "mensagens"
  | "suporte"
  | "configuracoes"
  | "super_admin"
  | "patient_home"
  | "public_booking";

export type TutorialItem = {
  key: string;
  title: string;
  text: string;
  target?: string;
};

export type TutorialScreenConfig = {
  screen: TutorialScreen;
  version: number;
  profiles: TutorialProfile[];
  tooltip: string;
  steps: TutorialItem[];
  helpButtonLabel: string;
  closeLabel: string;
  skipLabel: string;
  nextLabel: string;
  prevLabel: string;
  finishLabel: string;
};

export const TUTORIAL_CONFIG: Record<TutorialScreen, TutorialScreenConfig> = {
  dashboard: {
    screen: "dashboard",
    version: 1,
    profiles: ["super_admin", "owner", "admin", "professional", "receptionist"],
    tooltip: "Aqui voce acompanha os indicadores e acessa os atalhos principais da operacao.",
    steps: [
      {
        key: "dashboard-1",
        title: "Veja os indicadores",
        text: "Acompanhe a operacao nos cards do topo.",
        target: "[data-tutorial-target='dashboard-metrics']",
      },
      {
        key: "dashboard-2",
        title: "Abra um agendamento",
        text: "Abra um novo horario sem sair da tela inicial.",
        target: "[data-tutorial-target='dashboard-new-appointment']",
      },
      {
        key: "dashboard-3",
        title: "Filtre a agenda",
        text: "Troque o periodo para ver o dia ou a semana.",
        target: "[data-tutorial-target='dashboard-period-filters']",
      },
    ],
    helpButtonLabel: "Ajuda da tela",
    closeLabel: "Entendi",
    skipLabel: "Pular ajuda",
    nextLabel: "Proximo",
    prevLabel: "Voltar",
    finishLabel: "Finalizar tutorial",
  },
  agenda: {
    screen: "agenda",
    version: 1,
    profiles: ["super_admin", "owner", "admin", "receptionist"],
    tooltip: "Aqui voce acompanha horarios, profissionais e consultas do dia.",
    steps: [
      {
        key: "agenda-1",
        title: "Escolha o profissional",
        text: "Selecione quem deseja ver na agenda.",
        target: "[data-tutorial-target='agenda-professional']",
      },
      {
        key: "agenda-2",
        title: "Filtre por periodo",
        text: "Filtre por data ou intervalo.",
        target: "[data-tutorial-target='agenda-period']",
      },
      {
        key: "agenda-3",
        title: "Crie um agendamento",
        text: "Abra um novo horario quando precisar.",
        target: "[data-tutorial-target='agenda-new']",
      },
    ],
    helpButtonLabel: "Ajuda da tela",
    closeLabel: "Entendi",
    skipLabel: "Pular ajuda",
    nextLabel: "Proximo",
    prevLabel: "Voltar",
    finishLabel: "Finalizar tutorial",
  },
  gestao_agenda: {
    screen: "gestao_agenda",
    version: 1,
    profiles: ["super_admin", "owner", "admin", "professional"],
    tooltip: "Use esta tela para liberar ou bloquear periodos da agenda.",
    steps: [
      {
        key: "ga-1",
        title: "Selecione os profissionais",
        text: "Escolha quem vai receber a ação.",
        target: "[data-tutorial-target='agenda-professionals']",
      },
      {
        key: "ga-2",
        title: "Defina o periodo",
        text: "Informe início e fim da liberação ou bloqueio.",
        target: "[data-tutorial-target='agenda-period-range']",
      },
      {
        key: "ga-3",
        title: "Salve a acao",
        text: "Salve para registrar a mudança.",
        target: "[data-tutorial-target='agenda-save-action']",
      },
    ],
    helpButtonLabel: "Ajuda da tela",
    closeLabel: "Entendi",
    skipLabel: "Pular ajuda",
    nextLabel: "Proximo",
    prevLabel: "Voltar",
    finishLabel: "Finalizar tutorial",
  },
  pacientes: {
    screen: "pacientes",
    version: 1,
    profiles: ["super_admin", "owner", "admin", "professional", "receptionist"],
    tooltip: "Cadastre e consulte o historico de cada paciente.",
    steps: [
      {
        key: "pac-1",
        title: "Cadastre um paciente",
        text: "Preencha os dados principais rapidamente.",
        target: "[data-tutorial-target='patient-create']",
      },
      {
        key: "pac-2",
        title: "Edite quando precisar",
        text: "Atualize contato e cadastro quando precisar.",
        target: "[data-tutorial-target='patient-edit']",
      },
      {
        key: "pac-3",
        title: "Veja o historico",
        text: "Abra o histórico dos atendimentos.",
        target: "[data-tutorial-target='patient-history']",
      },
    ],
    helpButtonLabel: "Ajuda da tela",
    closeLabel: "Entendi",
    skipLabel: "Pular ajuda",
    nextLabel: "Proximo",
    prevLabel: "Voltar",
    finishLabel: "Finalizar tutorial",
  },
  mensagens: {
    screen: "mensagens",
    version: 1,
    profiles: ["super_admin", "owner", "admin", "professional", "receptionist", "patient"],
    tooltip: "Use o chat para falar com a equipe, enviar arquivos e audios.",
    steps: [
      {
        key: "msg-1",
        title: "Escolha o destinatario",
        text: "Envie para o grupo ou para uma conversa direta.",
        target: "[data-tutorial-target='message-recipient']",
      },
      {
        key: "msg-2",
        title: "Envie arquivos",
        text: "Anexe documentos, imagens ou áudios.",
        target: "[data-tutorial-target='message-attachment']",
      },
      {
        key: "msg-3",
        title: "Envie audio",
        text: "Grave um áudio quando precisar.",
        target: "[data-tutorial-target='message-audio']",
      },
    ],
    helpButtonLabel: "Ajuda da tela",
    closeLabel: "Entendi",
    skipLabel: "Pular ajuda",
    nextLabel: "Proximo",
    prevLabel: "Voltar",
    finishLabel: "Finalizar tutorial",
  },
  suporte: {
    screen: "suporte",
    version: 1,
    profiles: ["super_admin", "owner", "admin", "professional", "receptionist", "patient"],
    tooltip: "Abra chamados e acompanhe o retorno do Super Admin.",
    steps: [
      {
        key: "sup-1",
        title: "Abra um chamado",
        text: "Descreva sua dúvida ou problema.",
        target: "[data-tutorial-target='support-create']",
      },
      {
        key: "sup-2",
        title: "Acompanhe o status",
        text: "Veja se o chamado está aberto, em atendimento ou respondido.",
        target: "[data-tutorial-target='support-status']",
      },
      {
        key: "sup-3",
        title: "Leia a resposta",
        text: "A orientação do Super Admin aparece aqui.",
        target: "[data-tutorial-target='support-reply']",
      },
    ],
    helpButtonLabel: "Ajuda da tela",
    closeLabel: "Entendi",
    skipLabel: "Pular ajuda",
    nextLabel: "Proximo",
    prevLabel: "Voltar",
    finishLabel: "Finalizar tutorial",
  },
  configuracoes: {
    screen: "configuracoes",
    version: 1,
    profiles: ["super_admin", "owner", "admin"],
    tooltip: "Copie links, gere QR Code e compartilhe a agenda.",
    steps: [
      {
        key: "cfg-1",
        title: "Copie o link",
        text: "Use o link da clínica para compartilhar.",
        target: "[data-tutorial-target='config-link']",
      },
      {
        key: "cfg-2",
        title: "Gere o QR Code",
        text: "Baixe o QR para materiais impressos.",
        target: "[data-tutorial-target='config-qr']",
      },
      {
        key: "cfg-3",
        title: "Compartilhe",
        text: "Envie por WhatsApp, e-mail ou redes sociais.",
        target: "[data-tutorial-target='config-share-actions']",
      },
    ],
    helpButtonLabel: "Ajuda da tela",
    closeLabel: "Entendi",
    skipLabel: "Pular ajuda",
    nextLabel: "Proximo",
    prevLabel: "Voltar",
    finishLabel: "Finalizar tutorial",
  },
  super_admin: {
    screen: "super_admin",
    version: 1,
    profiles: ["super_admin"],
    tooltip: "Aqui voce gerencia assinantes, acessos, planos e suporte.",
    steps: [
      {
        key: "sa-1",
        title: "Veja o assinante",
        text: "Abra o detalhe para revisar os dados.",
        target: "[data-tutorial-target='superadmin-subscriber']",
      },
      {
        key: "sa-2",
        title: "Reinicie senhas",
        text: "Use esta ação quando precisar apoiar o cliente.",
        target: "[data-tutorial-target='superadmin-reset-password']",
      },
      {
        key: "sa-3",
        title: "Gerencie acessos",
        text: "Edite plano, status e liberações.",
        target: "[data-tutorial-target='superadmin-access']",
      },
    ],
    helpButtonLabel: "Ajuda da tela",
    closeLabel: "Entendi",
    skipLabel: "Pular ajuda",
    nextLabel: "Proximo",
    prevLabel: "Voltar",
    finishLabel: "Finalizar tutorial",
  },
  patient_home: {
    screen: "patient_home",
    version: 1,
    profiles: ["patient"],
    tooltip: "Aqui voce agenda, confirma e cancela suas consultas.",
    steps: [
      {
        key: "ph-1",
        title: "Veja sua proxima consulta",
        text: "Confira data, horário e profissional.",
        target: "[data-tutorial-target='patient-next-appointment']",
      },
      {
        key: "ph-2",
        title: "Agende uma nova consulta",
        text: "Abra o fluxo para marcar outro horário.",
        target: "[data-tutorial-target='patient-booking']",
      },
      {
        key: "ph-3",
        title: "Confirme ou cancele",
        text: "Use as ações da consulta quando precisar.",
        target: "[data-tutorial-target='patient-actions']",
      },
    ],
    helpButtonLabel: "Ajuda da tela",
    closeLabel: "Entendi",
    skipLabel: "Pular ajuda",
    nextLabel: "Proximo",
    prevLabel: "Voltar",
    finishLabel: "Finalizar tutorial",
  },
  public_booking: {
    screen: "public_booking",
    version: 1,
    profiles: ["patient"],
    tooltip: "Escolha profissional, data, horario e complete seus dados para agendar.",
    steps: [
      {
        key: "pb-1",
        title: "Escolha o profissional",
        text: "Selecione com quem deseja marcar a consulta.",
        target: "[data-tutorial-target='booking-professional']",
      },
      {
        key: "pb-2",
        title: "Defina data e horario",
        text: "Veja os horários disponíveis antes de seguir.",
        target: "[data-tutorial-target='booking-datetime']",
      },
      {
        key: "pb-3",
        title: "Finalize o pedido",
        text: "Preencha seus dados e confirme o pedido.",
        target: "[data-tutorial-target='booking-info']",
      },
    ],
    helpButtonLabel: "Ajuda da tela",
    closeLabel: "Entendi",
    skipLabel: "Pular ajuda",
    nextLabel: "Proximo",
    prevLabel: "Voltar",
    finishLabel: "Finalizar tutorial",
  },
};

export const getTutorialScreenFromPath = (pathname: string): TutorialScreen | null => {
  if (pathname === "/") return "dashboard";
  if (pathname.startsWith("/agenda")) return "agenda";
  if (pathname.startsWith("/minha-agenda")) return "gestao_agenda";
  if (pathname.startsWith("/pacientes")) return "pacientes";
  if (pathname.startsWith("/mensagens")) return "mensagens";
  if (pathname.startsWith("/suporte")) return "suporte";
  if (pathname.startsWith("/configuracoes")) return "configuracoes";
  if (pathname.startsWith("/super-admin")) return "super_admin";
  if (pathname.startsWith("/paciente/home")) return "patient_home";
  if (pathname.startsWith("/agendar/")) return "public_booking";
  return null;
};

export const getTutorialConfig = (screen: TutorialScreen | null, profile?: TutorialProfile | null) => {
  if (!screen) return null;
  const config = TUTORIAL_CONFIG[screen];
  if (!config) return null;
  if (!profile && screen === "public_booking") return config;
  if (profile && !config.profiles.includes(profile)) return null;
  return config;
};
