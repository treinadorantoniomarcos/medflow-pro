
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CalendarCheck2,
  Check,
  Copy,
  Download,
  FileText,
  FileSpreadsheet,
  Link2,
  Network,
  Stethoscope,
  UserRound,
  AlertTriangle,
  ShieldCheck,
  UserPlus,
  Save,
  UserX,
  QrCode,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart as ReLineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import AdminLayout from "@/components/layout/AdminLayout";
import MetricCard from "@/components/dashboard/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";
import {
  exportSuperAdminCSV,
  exportSuperAdminDOC,
  exportSuperAdminPDF,
  exportSuperAdminXLS,
} from "@/lib/export-super-admin";
import {
  fallbackPlanOptions,
  getPlanCommercialCopy,
  getPlanMarketingContent,
  getSubscriptionShareUrl,
  type PlanOption,
} from "@/lib/subscription-plans";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PlanCatalogManager from "@/components/superadmin/PlanCatalogManager";
import { QRCodeSVG } from "qrcode.react";
import HelpIcon from "@/components/tutorial/HelpIcon";

type ClinicRow = {
  id: string;
  name: string;
  slug: string | null;
  settings: Record<string, any> | null;
  created_at: string;
  updated_at: string;
};

type RoleRow = {
  tenant_id: string;
  user_id: string;
  role: "owner" | "admin" | "professional" | "receptionist" | "patient" | "super_admin";
};

type ProfileRow = {
  user_id: string;
  tenant_id: string;
  full_name: string | null;
  phone: string | null;
  is_active: boolean;
};

type AppointmentRow = {
  tenant_id: string;
  starts_at: string;
  status: string;
};

type SubscriptionPlan = string;
type SubscriptionStatus = "trialing" | "active" | "past_due" | "paused" | "canceled";

type PlatformSettingsRow = {
  checkout_url: string | null;
  updated_at: string;
};

type CustomQuoteRequestRow = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  whatsapp: string;
  address_full: string;
  admin_count: number;
  professional_count: number;
  patient_volume: string;
  desired_app_type: string;
  additional_info: string | null;
  source_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type PlanRow = {
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

const appIntegrations = [
  {
    name: "WhatsApp Business",
    status: "conectado",
     description: "Confirmações, lembretes e recuperação de no-show por mensageria.",
     href: "https://business.facebook.com",
   },
   {
    name: "Google Calendar",
    status: "pendente",
     description: "Sincronização de agenda externa para a equipe clínica.",
    href: "https://calendar.google.com",
  },
  {
    name: "Stripe Billing",
    status: "pendente",
     description: "Cobrança recorrente e conciliação de assinaturas.",
    href: "https://dashboard.stripe.com",
  },
];

const chartConfig = {
  consultas: {
    label: "Consultas",
    color: "hsl(var(--primary))",
  },
  noShow: {
    label: "No-show",
    color: "hsl(var(--destructive))",
  },
};

const statusLabels: Record<SubscriptionStatus, string> = {
  trialing: "Trialing",
  active: "Active",
  past_due: "Past due",
  paused: "Paused",
  canceled: "Canceled",
};

const statusBadgeClass: Record<SubscriptionStatus, string> = {
  trialing: "bg-blue-100 text-blue-700",
  active: "bg-emerald-100 text-emerald-700",
  past_due: "bg-amber-100 text-amber-700",
  paused: "bg-slate-200 text-slate-700",
  canceled: "bg-rose-100 text-rose-700",
};

const planCapacityLabel = (planCode: string) => {
  if (planCode === "start") return "1 profissional";
  if (planCode === "pro") return "Até 3 profissionais";
  if (planCode === "signature") return "4 a 10 profissionais";
  return "Plano ativo";
};

const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const readSubscription = (settings: Record<string, any> | null | undefined) => {
  const raw = settings?.subscription ?? {};
  const plan = typeof raw.plan === "string" && raw.plan.length > 0 ? raw.plan : "start";
  const status = (["trialing", "active", "past_due", "paused", "canceled"].includes(raw.status)
    ? raw.status
    : "trialing") as SubscriptionStatus;

  return {
    plan,
    status,
    current_period_start: raw.current_period_start ?? null,
    current_period_end: raw.current_period_end ?? null,
    first_payment_at: raw.first_payment_at ?? null,
    payment_method: raw.payment_method ?? null,
    grace_until: raw.grace_until ?? null,
  };
};

const readAccessRequest = (settings: Record<string, any> | null | undefined) => {
  const raw = (settings?.onboarding ?? {}) as Record<string, any>;
  const request = (raw.access_request ?? {}) as Record<string, any>;

  return {
    status: typeof request.status === "string" ? request.status : null,
    contractor_name: typeof request.contractor_name === "string" ? request.contractor_name : null,
    admin_full_name: typeof request.admin_full_name === "string" ? request.admin_full_name : null,
    admin_email: typeof request.admin_email === "string" ? request.admin_email : null,
    admin_whatsapp: typeof request.admin_whatsapp === "string" ? request.admin_whatsapp : null,
    submitted_at: typeof request.submitted_at === "string" ? request.submitted_at : null,
  };
};

const SuperAdminDashboard = () => {
  const queryClient = useQueryClient();

  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "super_admin">("admin");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [copiedCheckoutLink, setCopiedCheckoutLink] = useState(false);
  const [copiedCopyKey, setCopiedCopyKey] = useState<string | null>(null);
  const [subscriberDetailOpen, setSubscriberDetailOpen] = useState(false);
  const [selectedSubscriberId, setSelectedSubscriberId] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [subscriberDraft, setSubscriberDraft] = useState({
    clinicName: "",
    slug: "",
    contractorName: "",
    adminFullName: "",
    adminEmail: "",
    adminWhatsapp: "",
    platformCheckoutUrl: "",
    accessStatus: "",
    plan: "start" as SubscriptionPlan,
    subscriptionStatus: "trialing" as SubscriptionStatus,
  });

  const [billingDraft, setBillingDraft] = useState<Record<string, { plan: SubscriptionPlan; status: SubscriptionStatus }>>({});
  const [savingTenantId, setSavingTenantId] = useState<string | null>(null);
  const [platformCheckoutUrlDraft, setPlatformCheckoutUrlDraft] = useState("");
  const [savingPlatformSettings, setSavingPlatformSettings] = useState(false);
  const subscriptionShareUrl = getSubscriptionShareUrl(window.location.origin);

  const { data, isLoading } = useQuery({
    queryKey: ["super-admin-dataset-v3"],
    queryFn: async () => {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const yearStart = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1);

      const [clinicsResp, rolesResp, profilesResp, appointmentsResp, plansResp] = await Promise.all([
        supabase
          .from("clinics")
          .select("id, name, slug, settings, created_at, updated_at")
          .order("created_at", { ascending: false }),
        supabase.from("user_roles").select("tenant_id, user_id, role"),
        supabase.from("profiles").select("tenant_id, user_id, full_name, phone, is_active"),
        supabase
          .from("appointments")
          .select("tenant_id, starts_at, status")
          .gte("starts_at", yearStart.toISOString())
          .limit(20000),
        supabase
          .from("subscription_plans")
          .select("id, code, name, description, monthly_price_cents, period_days, trial_days, is_courtesy, is_active")
          .order("monthly_price_cents", { ascending: true }),
      ]);

      if (clinicsResp.error) throw clinicsResp.error;
      if (rolesResp.error) throw rolesResp.error;
      if (profilesResp.error) throw profilesResp.error;
      if (appointmentsResp.error) throw appointmentsResp.error;
      if (plansResp.error) throw plansResp.error;

      const clinics = (clinicsResp.data ?? []) as ClinicRow[];
      const roles = (rolesResp.data ?? []) as RoleRow[];
      const profiles = (profilesResp.data ?? []) as ProfileRow[];
      const appointments = (appointmentsResp.data ?? []) as AppointmentRow[];
      const plans = (plansResp.data ?? []) as PlanRow[];

      const monthPrefix = monthKey(monthStart);
      const monthlyAppointments = appointments.filter((apt) => apt.starts_at.startsWith(monthPrefix));

      return { clinics, roles, profiles, appointments, monthlyAppointments, plans };
    },
  });

  const { data: platformSettings } = useQuery({
    queryKey: ["super-admin-platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("checkout_url, updated_at")
        .eq("id", 1)
        .single();

      if (error) throw error;
      return data as PlatformSettingsRow;
    },
  });

  const { data: customQuoteRequests = [] } = useQuery({
    queryKey: ["super-admin-custom-quote-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_quote_requests")
        .select("id, company_name, contact_name, email, whatsapp, address_full, admin_count, professional_count, patient_volume, desired_app_type, additional_info, source_url, status, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data ?? []) as CustomQuoteRequestRow[];
    },
  });

  const subscriberRows = useMemo(() => {
    if (!data) return [];

    const byTenantRoles = new Map<string, RoleRow[]>();
    data.roles.forEach((row) => {
      const list = byTenantRoles.get(row.tenant_id) ?? [];
      list.push(row);
      byTenantRoles.set(row.tenant_id, list);
    });

    const byTenantMonthlyApts = new Map<string, AppointmentRow[]>();
    data.monthlyAppointments.forEach((row) => {
      const list = byTenantMonthlyApts.get(row.tenant_id) ?? [];
      list.push(row);
      byTenantMonthlyApts.set(row.tenant_id, list);
    });

    return data.clinics.map((clinic) => {
      const roles = byTenantRoles.get(clinic.id) ?? [];
      const monthly = byTenantMonthlyApts.get(clinic.id) ?? [];
      const subscription = readSubscription(clinic.settings);

      return {
        clinic_id: clinic.id,
        clinic_name: clinic.name,
        slug: clinic.slug ?? "sem-slug",
        settings: clinic.settings ?? {},
        subscription,
        access_request: readAccessRequest(clinic.settings),
        platform: {
          checkout_url: platformSettings?.checkout_url ?? null,
        },
        owners: roles.filter((r) => r.role === "owner").length,
        admins: roles.filter((r) => r.role === "admin").length,
        professionals: roles.filter((r) => r.role === "professional").length,
        patients: roles.filter((r) => r.role === "patient").length,
        month_appointments: monthly.length,
        month_no_show: monthly.filter((m) => m.status === "no_show").length,
        updated_at: clinic.updated_at,
      };
    });
  }, [data]);

  const configuredPlatformCheckoutUrl = platformSettings?.checkout_url ?? "";

  useEffect(() => {
    setPlatformCheckoutUrlDraft(configuredPlatformCheckoutUrl);
  }, [configuredPlatformCheckoutUrl]);

  const monthlyTrend = useMemo(() => {
    if (!data) return [];

    const buckets = new Map<string, { month: string; consultas: number; noShow: number }>();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
      const key = monthKey(d);
      const label = d.toLocaleDateString("pt-BR", { month: "short" });
      buckets.set(key, { month: label, consultas: 0, noShow: 0 });
    }

    data.appointments.forEach((apt) => {
      const key = apt.starts_at.slice(0, 7);
      const item = buckets.get(key);
      if (!item) return;
      item.consultas += 1;
      if (apt.status === "no_show") item.noShow += 1;
    });

    return Array.from(buckets.values());
  }, [data]);

  const topSubscribers = useMemo(
    () => [...subscriberRows].sort((a, b) => b.month_appointments - a.month_appointments).slice(0, 6),
    [subscriberRows]
  );

  const totals = useMemo(() => {
    return {
      clinics: subscriberRows.length,
      professionals: subscriberRows.reduce((acc, row) => acc + row.professionals, 0),
      patients: subscriberRows.reduce((acc, row) => acc + row.patients, 0),
      appointmentsMonth: subscriberRows.reduce((acc, row) => acc + row.month_appointments, 0),
      noShowMonth: subscriberRows.reduce((acc, row) => acc + row.month_no_show, 0),
    };
  }, [subscriberRows]);

  const subscriptionCounts = useMemo(() => {
    return subscriberRows.reduce(
      (acc, row) => {
        acc[row.subscription.status] += 1;
        return acc;
      },
      { trialing: 0, active: 0, past_due: 0, paused: 0, canceled: 0 } as Record<SubscriptionStatus, number>
    );
  }, [subscriberRows]);

  const exportPayload = useMemo(() => {
    const now = new Date();
    return {
      generatedAt: now.toLocaleString("pt-BR"),
      periodLabel: now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
      totals,
      rows: subscriberRows,
    };
  }, [subscriberRows, totals]);

  const selectedTenantIdSafe = selectedTenantId || subscriberRows[0]?.clinic_id || "";
  const availablePlans = useMemo(() => {
    if (!data?.plans?.length) return [];
    return data.plans.filter((plan) => plan.is_active);
  }, [data?.plans]);

  const planMarketingCatalog = useMemo<PlanOption[]>(() => {
    if (!availablePlans.length) return fallbackPlanOptions;

    return availablePlans.map((plan) => ({
      key: plan.code,
      name: plan.name,
      monthlyPrice: plan.monthly_price_cents / 100,
      description: `${planCapacityLabel(plan.code)} | ${plan.description ?? "Pacote ativo para assinatura"}`,
      periodDays: plan.period_days,
      trialDays: plan.trial_days,
      isCourtesy: plan.is_courtesy,
      marketing: getPlanMarketingContent(plan.code),
    }));
  }, [availablePlans]);

  const tenantAccessRows = useMemo(() => {
    if (!data || !selectedTenantIdSafe) return [];

    const profileMap = new Map<string, ProfileRow>();
    data.profiles.forEach((profile) => {
      if (!profileMap.has(profile.user_id)) profileMap.set(profile.user_id, profile);
    });

    return data.roles
      .filter((role) => role.tenant_id === selectedTenantIdSafe && (role.role === "owner" || role.role === "admin"))
      .map((role) => {
        const profile = profileMap.get(role.user_id);
        return {
          user_id: role.user_id,
          role: role.role,
          full_name: profile?.full_name ?? "Sem nome",
          is_active: profile?.is_active ?? true,
          phone: profile?.phone ?? null,
        };
      });
  }, [data, selectedTenantIdSafe]);

  const globalSuperAdmins = useMemo(() => {
    if (!data) return [];

    const profileMap = new Map<string, ProfileRow>();
    data.profiles.forEach((profile) => {
      if (!profileMap.has(profile.user_id)) profileMap.set(profile.user_id, profile);
    });

    const seen = new Set<string>();
    return data.roles
      .filter((role) => role.role === "super_admin")
      .filter((role) => {
        if (seen.has(role.user_id)) return false;
        seen.add(role.user_id);
        return true;
      })
      .map((role) => {
        const profile = profileMap.get(role.user_id);
        return {
          user_id: role.user_id,
          full_name: profile?.full_name ?? "Sem nome",
          tenant_id: role.tenant_id,
          is_active: profile?.is_active ?? true,
        };
      });
  }, [data]);

  const updateBillingDraft = (tenantId: string, value: Partial<{ plan: SubscriptionPlan; status: SubscriptionStatus }>) => {
    setBillingDraft((prev) => {
      const currentRow = subscriberRows.find((row) => row.clinic_id === tenantId);
      if (!currentRow) return prev;

      const current = prev[tenantId] ?? {
        plan: currentRow.subscription.plan,
        status: currentRow.subscription.status,
      };

      return {
        ...prev,
        [tenantId]: {
          plan: value.plan ?? current.plan,
          status: value.status ?? current.status,
        },
      };
    });
  };

  const openSubscriberDetail = (tenantId: string) => {
    const row = subscriberRows.find((item) => item.clinic_id === tenantId);
    if (!row) return;

    setSelectedSubscriberId(tenantId);
    setSubscriberDraft({
      clinicName: row.clinic_name,
      slug: row.slug ?? "",
      contractorName: row.access_request.contractor_name ?? "",
      adminFullName: row.access_request.admin_full_name ?? "",
      adminEmail: row.access_request.admin_email ?? "",
      adminWhatsapp: row.access_request.admin_whatsapp ?? "",
      platformCheckoutUrl: row.platform?.checkout_url ?? "",
      accessStatus: row.access_request.status ?? "",
      plan: row.subscription.plan,
      subscriptionStatus: row.subscription.status,
    });
    setSubscriberDetailOpen(true);
  };

  const saveSubscriberDetails = async () => {
    if (!selectedSubscriberId) return;

    const row = subscriberRows.find((item) => item.clinic_id === selectedSubscriberId);
    if (!row) return;

    const nowIso = new Date().toISOString();
    const updatedSettings = {
      ...(row.settings ?? {}),
      onboarding: {
        ...((row.settings ?? {}).onboarding ?? {}),
        access_request: {
          ...(((row.settings ?? {}).onboarding ?? {}).access_request ?? {}),
          status: subscriberDraft.accessStatus || null,
          contractor_name: subscriberDraft.contractorName.trim() || null,
          admin_full_name: subscriberDraft.adminFullName.trim() || null,
          admin_email: subscriberDraft.adminEmail.trim() || null,
          admin_whatsapp: subscriberDraft.adminWhatsapp.trim() || null,
          updated_by_super_admin_at: nowIso,
        },
      },
      subscription: {
        ...row.subscription,
        plan: subscriberDraft.plan,
        status: subscriberDraft.subscriptionStatus,
        updated_by_super_admin_at: nowIso,
      },
    };

    setSavingTenantId(selectedSubscriberId);
    const { error } = await supabase
      .from("clinics")
      .update({
        name: subscriberDraft.clinicName.trim() || row.clinic_name,
        slug: subscriberDraft.slug.trim() || null,
        settings: updatedSettings,
      })
      .eq("id", selectedSubscriberId);
    setSavingTenantId(null);

    if (error) {
      toast.error("Falha ao salvar dados do assinante", { description: error.message });
      return;
    }

    toast.success("Dados do assinante atualizados.");
    setSubscriberDetailOpen(false);
    queryClient.invalidateQueries({ queryKey: ["super-admin-dataset-v3"] });
  };

  const resetSubscriberPassword = async () => {
    if (!selectedSubscriberId || !subscriberDraft.adminEmail.trim()) {
      toast.error("Informe o e-mail do administrador para reiniciar a senha.");
      return;
    }

    setResettingPassword(true);
    const { data: result, error } = await supabase.functions.invoke("super-admin-access", {
      body: {
        action: "reset_password",
        tenant_id: selectedSubscriberId,
        email: subscriberDraft.adminEmail.trim().toLowerCase(),
        redirect_to: `${window.location.origin}/reset-password`,
      },
    });
    setResettingPassword(false);

    if (error || !result?.ok) {
      toast.error("Falha ao reiniciar senha", {
        description: result?.detail || error?.message || result?.error,
      });
      return;
    }

    toast.success("E-mail de redefinição de senha enviado.");
  };

  const saveSubscriptionState = async (tenantId: string) => {
    const row = subscriberRows.find((item) => item.clinic_id === tenantId);
    if (!row) return;

    const draft = billingDraft[tenantId] ?? {
      plan: row.subscription.plan,
      status: row.subscription.status,
    };

    const nowIso = new Date().toISOString();
    const nextPeriod = new Date();
    nextPeriod.setMonth(nextPeriod.getMonth() + 1);

    const updatedSettings = {
      ...(row.settings ?? {}),
      onboarding: {
        ...((row.settings ?? {}).onboarding ?? {}),
        access_request: {
          ...(((row.settings ?? {}).onboarding ?? {}).access_request ?? {}),
          status: draft.status === "active" ? "released" : row.access_request.status,
          released_at: draft.status === "active" ? nowIso : (((row.settings ?? {}).onboarding ?? {}).access_request ?? {}).released_at ?? null,
        },
      },
      subscription: {
        ...row.subscription,
        plan: draft.plan,
        status: draft.status,
        updated_by_super_admin_at: nowIso,
        current_period_start: row.subscription.current_period_start ?? nowIso,
        current_period_end: row.subscription.current_period_end ?? nextPeriod.toISOString(),
        pending_release: draft.status === "active" ? false : row.subscription.status === "paused",
      },
    };

    setSavingTenantId(tenantId);

    const { error } = await supabase
      .from("clinics")
      .update({ settings: updatedSettings })
      .eq("id", tenantId);

    setSavingTenantId(null);

    if (error) {
      toast.error("Falha ao atualizar assinatura", { description: error.message });
      return;
    }

    toast.success("Assinatura atualizada", {
      description: `Plano ${draft.plan} / status ${statusLabels[draft.status]}.`,
    });

    queryClient.invalidateQueries({ queryKey: ["super-admin-dataset-v3"] });
  };

  const grantAccess = async () => {
    if (!inviteName.trim() || !inviteEmail.trim() || !selectedTenantIdSafe) {
      toast.error("Preencha nome, email e assinante.");
      return;
    }

    setInviteLoading(true);
    const { data: result, error } = await supabase.functions.invoke("super-admin-access", {
      body: {
        action: "grant_access",
        full_name: inviteName.trim(),
        email: inviteEmail.trim().toLowerCase(),
        phone: invitePhone.trim() || null,
        role: inviteRole,
        tenant_id: selectedTenantIdSafe,
      },
    });
    setInviteLoading(false);

    if (error || !result?.ok) {
      toast.error("Falha na liberação de acesso", {
        description: result?.detail || error?.message || result?.error || "Edge Function indisponivel.",
      });
      return;
    }

    toast.success("Acesso liberado com sucesso.");
    setInviteName("");
    setInviteEmail("");
    setInvitePhone("");
    queryClient.invalidateQueries({ queryKey: ["super-admin-dataset-v3"] });
  };

  const setAccessStatus = async (targetUserId: string, isActive: boolean) => {
    const { data: result, error } = await supabase.functions.invoke("super-admin-access", {
      body: {
        action: "set_access_status",
        target_user_id: targetUserId,
        tenant_id: selectedTenantIdSafe,
        is_active: isActive,
      },
    });

    if (error || !result?.ok) {
      toast.error("Falha ao atualizar acesso", {
        description: result?.detail || error?.message || result?.error,
      });
      return;
    }

    toast.success(isActive ? "Acesso reativado." : "Acesso desativado.");
    queryClient.invalidateQueries({ queryKey: ["super-admin-dataset-v3"] });
  };

  const revokeAccess = async (targetUserId: string, role: "admin" | "super_admin") => {
    const { data: result, error } = await supabase.functions.invoke("super-admin-access", {
      body: {
        action: "revoke_access",
        target_user_id: targetUserId,
        role,
        tenant_id: selectedTenantIdSafe,
      },
    });

    if (error || !result?.ok) {
      toast.error("Falha ao revogar acesso", {
        description: result?.detail || error?.message || result?.error,
      });
      return;
    }

    toast.success("Acesso revogado.");
    queryClient.invalidateQueries({ queryKey: ["super-admin-dataset-v3"] });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Super Admin</h1>
            <p className="text-sm text-muted-foreground">
              Link dedicado: <span className="font-medium text-foreground">/super-admin</span> | Gestão completa de assinantes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <HelpIcon screen="super_admin" />
            <Dialog open={accessDialogOpen} onOpenChange={setAccessDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" size="sm" data-tutorial-target="superadmin-access">
                  <ShieldCheck className="mr-1.5 h-4 w-4" /> Liberar acessos
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[640px]">
                <DialogHeader>
                  <DialogTitle>Gestão de acesso dos assinantes</DialogTitle>
                  <DialogDescription>
                    Libere novos admins por assinante e novos super admins da plataforma.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Assinante</Label>
                    <Select value={selectedTenantIdSafe} onValueChange={setSelectedTenantId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o assinante" />
                      </SelectTrigger>
                      <SelectContent>
                        {subscriberRows.map((item) => (
                          <SelectItem key={item.clinic_id} value={item.clinic_id}>
                            {item.clinic_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Nome</Label>
                      <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Nome completo" />
                    </div>
                    <div className="space-y-2">
                      <Label>E-mail</Label>
                      <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} type="email" placeholder="usuario@dominio.com" />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} placeholder="(11) 99999-9999" />
                    </div>
                    <div className="space-y-2">
                      <Label>Papel</Label>
                      <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as "admin" | "super_admin")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin do assinante</SelectItem>
                          <SelectItem value="super_admin">Super admin da plataforma</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button onClick={grantAccess} disabled={inviteLoading} className="w-full">
                    <UserPlus className="mr-1.5 h-4 w-4" /> {inviteLoading ? "Processando..." : "Liberar acesso"}
                  </Button>

                  <div className="rounded-lg border border-border p-3">
                    <p className="mb-2 text-sm font-semibold">Admins do assinante selecionado</p>
                    <div className="space-y-2">
                      {tenantAccessRows.length === 0 && (
                        <p className="text-xs text-muted-foreground">Nenhum admin/owner vinculado a este assinante.</p>
                      )}
                      {tenantAccessRows.map((member) => (
                        <div key={`${member.user_id}-${member.role}`} className="flex items-center justify-between rounded border border-border px-3 py-2">
                          <div>
                            <p className="text-sm font-medium">{member.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {member.role} {member.phone ? `| ${member.phone}` : ""}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setAccessStatus(member.user_id, !member.is_active)}
                            >
                              {member.is_active ? "Desativar" : "Reativar"}
                            </Button>
                            {member.role === "admin" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => revokeAccess(member.user_id, "admin")}
                              >
                                <UserX className="mr-1 h-3.5 w-3.5" /> Revogar
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-3">
                    <p className="mb-2 text-sm font-semibold">Super admins ativos</p>
                    <div className="space-y-2">
                      {globalSuperAdmins.length === 0 && (
                        <p className="text-xs text-muted-foreground">Nenhum super admin cadastrado.</p>
                      )}
                      {globalSuperAdmins.map((member) => (
                        <div key={member.user_id} className="flex items-center justify-between rounded border border-border px-3 py-2">
                          <div>
                            <p className="text-sm font-medium">{member.full_name}</p>
                            <p className="text-xs text-muted-foreground">tenant base: {member.tenant_id}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => revokeAccess(member.user_id, "super_admin")}
                          >
                            Revogar super admin
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" size="sm" onClick={() => exportSuperAdminPDF(exportPayload)}>
              <Download className="mr-1.5 h-4 w-4" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportSuperAdminXLS(exportPayload)}>
              <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Planilha
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportSuperAdminDOC(exportPayload)}>
              <FileText className="mr-1.5 h-4 w-4" /> DOC
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportSuperAdminCSV(exportPayload)}>
              <Download className="mr-1.5 h-4 w-4" /> CSV
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <MetricCard value={totals.clinics} label="Assinantes (clínicas)" icon={Building2} />
          <MetricCard value={totals.professionals} label="Profissionais" icon={Stethoscope} variant="accent" />
          <MetricCard value={totals.patients} label="Pacientes" icon={UserRound} variant="success" />
           <MetricCard value={totals.appointmentsMonth} label="Consultas no mês" icon={CalendarCheck2} />
           <MetricCard value={totals.noShowMonth} label="No-show no mês" icon={AlertTriangle} variant="warning" />
        </div>

        <div className="grid gap-3 sm:grid-cols-5">
          {(Object.keys(subscriptionCounts) as SubscriptionStatus[]).map((statusKey) => (
            <Card key={statusKey} className="shadow-soft">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{statusLabels[statusKey]}</p>
                <p className="text-xl font-bold">{subscriptionCounts[statusKey]}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Tendência mensal (6 meses)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ReLineChart data={monthlyTrend}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="consultas" stroke="var(--color-consultas)" strokeWidth={2.5} />
                    <Line type="monotone" dataKey="noShow" stroke="var(--color-noShow)" strokeWidth={2.5} />
                  </ReLineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Top assinantes por volume (mês)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topSubscribers.map((item) => ({
                      clinica: item.clinic_name.length > 18 ? `${item.clinic_name.slice(0, 18)}...` : item.clinic_name,
                      consultas: item.month_appointments,
                    }))}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="clinica" />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="consultas" fill="var(--color-consultas)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-soft" data-tutorial-target="superadmin-subscriber">
          <CardHeader>
            <CardTitle className="text-base">Assinantes - visão detalhada e assinatura</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                     <th className="pb-2 pr-4">Clínica</th>
                     <th className="pb-2 pr-4">Plano</th>
                     <th className="pb-2 pr-4">Status</th>
                     <th className="pb-2 pr-4">Equipe</th>
                     <th className="pb-2 pr-4">Pacientes</th>
                     <th className="pb-2 pr-4">Consultas (mês)</th>
                     <th className="pb-2 pr-4">No-show (mês)</th>
                     <th className="pb-2 pr-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {!isLoading && subscriberRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-4 text-muted-foreground">
                        Nenhum assinante encontrado.
                      </td>
                    </tr>
                  )}
                  {subscriberRows.map((row) => {
                    const rowDraft = billingDraft[row.clinic_id] ?? {
                      plan: row.subscription.plan,
                      status: row.subscription.status,
                    };

                    return (
                      <tr key={row.clinic_id} className="border-b border-border/70 align-top">
                        <td className="py-2 pr-4">
                          <button
                            type="button"
                            className="text-left"
                            onClick={() => openSubscriberDetail(row.clinic_id)}
                          >
                            <p className="font-medium text-primary hover:underline">{row.clinic_name}</p>
                          </button>
                          <p className="text-xs text-muted-foreground">{row.slug}</p>
                          {row.access_request.status && (
                            <div className="mt-2 space-y-1 rounded-md border border-border bg-secondary/30 p-2 text-xs">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  {row.access_request.status === "pending_super_admin_release" ? "Aguardando liberação" : row.access_request.status}
                                </Badge>
                              </div>
                              {row.access_request.contractor_name && (
                                <p className="text-muted-foreground">
                                  Contratante: <span className="font-medium text-foreground">{row.access_request.contractor_name}</span>
                                </p>
                              )}
                              {row.access_request.admin_full_name && (
                                <p className="text-muted-foreground">
                                  Admin: <span className="font-medium text-foreground">{row.access_request.admin_full_name}</span>
                                </p>
                              )}
                              {row.access_request.admin_email && (
                                <p className="text-muted-foreground">
                                  E-mail: <span className="font-medium text-foreground">{row.access_request.admin_email}</span>
                                </p>
                              )}
                              {row.access_request.admin_whatsapp && (
                                <p className="text-muted-foreground">
                                  WhatsApp: <span className="font-medium text-foreground">{row.access_request.admin_whatsapp}</span>
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          <Select
                            value={rowDraft.plan}
                            onValueChange={(value) => updateBillingDraft(row.clinic_id, { plan: value as SubscriptionPlan })}
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availablePlans.map((plan) => (
                                <SelectItem key={plan.id} value={plan.code}>
                                  {plan.name}
                                </SelectItem>
                              ))}
                              {!availablePlans.find((plan) => plan.code === rowDraft.plan) && (
                                <SelectItem value={rowDraft.plan}>{rowDraft.plan}</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 pr-4">
                          <div className="space-y-2">
                            <Select
                              value={rowDraft.status}
                              onValueChange={(value) => updateBillingDraft(row.clinic_id, { status: value as SubscriptionStatus })}
                            >
                              <SelectTrigger className="w-[145px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="trialing">Trialing</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="past_due">Past due</SelectItem>
                                <SelectItem value="paused">Paused</SelectItem>
                                <SelectItem value="canceled">Canceled</SelectItem>
                              </SelectContent>
                            </Select>
                            <Badge className={statusBadgeClass[rowDraft.status]}>{statusLabels[rowDraft.status]}</Badge>
                          </div>
                        </td>
                        <td className="py-2 pr-4">{row.owners + row.admins + row.professionals}</td>
                        <td className="py-2 pr-4">{row.patients}</td>
                        <td className="py-2 pr-4">{row.month_appointments}</td>
                        <td className="py-2 pr-4">{row.month_no_show}</td>
                        <td className="py-2 pr-4">
                          <div className="flex flex-col gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => saveSubscriptionState(row.clinic_id)}
                              disabled={savingTenantId === row.clinic_id}
                            >
                              <Save className="mr-1 h-3.5 w-3.5" /> {savingTenantId === row.clinic_id ? "Salvando..." : "Salvar assinatura"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openSubscriberDetail(row.clinic_id)}
                            >
                              Ver/editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTenantId(row.clinic_id);
                                setAccessDialogOpen(true);
                              }}
                            >
                              <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Gerir acessos
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={subscriberDetailOpen} onOpenChange={setSubscriberDetailOpen}>
          <DialogContent className="sm:max-w-[720px]">
            <DialogHeader>
              <DialogTitle>Dados do assinante</DialogTitle>
              <DialogDescription>
                Clique no nome do assinante na tabela para abrir esta tela e alterar os dados principais.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome da clínica ou contratante</Label>
                <Input
                  value={subscriberDraft.clinicName}
                  onChange={(e) => setSubscriberDraft((prev) => ({ ...prev, clinicName: e.target.value }))}
                  placeholder="Nome do assinante"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  value={subscriberDraft.slug}
                  onChange={(e) => setSubscriberDraft((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="slug-publico"
                />
              </div>
              <div className="space-y-2">
                <Label>Nome do contratante</Label>
                <Input
                  value={subscriberDraft.contractorName}
                  onChange={(e) => setSubscriberDraft((prev) => ({ ...prev, contractorName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Administrador responsável</Label>
                <Input
                  value={subscriberDraft.adminFullName}
                  onChange={(e) => setSubscriberDraft((prev) => ({ ...prev, adminFullName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail do administrador</Label>
                <Input
                  type="email"
                  value={subscriberDraft.adminEmail}
                  onChange={(e) => setSubscriberDraft((prev) => ({ ...prev, adminEmail: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp do administrador</Label>
                <Input
                  value={subscriberDraft.adminWhatsapp}
                  onChange={(e) => setSubscriberDraft((prev) => ({ ...prev, adminWhatsapp: e.target.value }))}
                />
              </div>
              <div className="hidden">
                <Label>Link da plataforma / checkout</Label>
                <Input
                  value={subscriberDraft.platformCheckoutUrl}
                  onChange={(e) => setSubscriberDraft((prev) => ({ ...prev, platformCheckoutUrl: e.target.value }))}
                  placeholder="https://dashboard.kiwify.com.br/products/..."
                />
                <p className="text-xs text-muted-foreground">
                  Salve aqui o link que vai para o checkout ou página de venda usada na Kiwify.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Status do acesso</Label>
                <Input
                  value={subscriberDraft.accessStatus}
                  onChange={(e) => setSubscriberDraft((prev) => ({ ...prev, accessStatus: e.target.value }))}
                  placeholder="pending_super_admin_release, released..."
                />
              </div>
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select
                  value={subscriberDraft.plan}
                  onValueChange={(value) => setSubscriberDraft((prev) => ({ ...prev, plan: value as SubscriptionPlan }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.code}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Status da assinatura</Label>
                <Select
                  value={subscriberDraft.subscriptionStatus}
                  onValueChange={(value) => setSubscriberDraft((prev) => ({ ...prev, subscriptionStatus: value as SubscriptionStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trialing">Trialing</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="past_due">Past due</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedSubscriberId && (
              <div className="rounded-lg border border-border bg-secondary/20 p-3 text-sm">
                {(() => {
                  const row = subscriberRows.find((item) => item.clinic_id === selectedSubscriberId);
                  if (!row) return null;
                  return (
                    <div className="grid gap-2 md:grid-cols-2">
                      <p>Profissionais: <span className="font-medium text-foreground">{row.professionals}</span></p>
                      <p>Pacientes: <span className="font-medium text-foreground">{row.patients}</span></p>
                      <p>Consultas no mês: <span className="font-medium text-foreground">{row.month_appointments}</span></p>
                      <p>No-show no mês: <span className="font-medium text-foreground">{row.month_no_show}</span></p>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                data-tutorial-target="superadmin-reset-password"
                onClick={resetSubscriberPassword}
                disabled={!selectedSubscriberId || resettingPassword || !subscriberDraft.adminEmail.trim()}
              >
                {resettingPassword ? "Enviando reset..." : "Reiniciar senha do cliente"}
              </Button>
              <Button onClick={saveSubscriberDetails} disabled={!selectedSubscriberId || savingTenantId === selectedSubscriberId}>
                <Save className="mr-1.5 h-4 w-4" />
                {savingTenantId === selectedSubscriberId ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Card className="shadow-soft" data-tutorial-target="superadmin-platform-settings">
          <CardHeader>
            <CardTitle className="text-base">Configuração da plataforma</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border bg-secondary/40 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Checkout oficial da Kiwify ou landing page externa</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Este é o link único que leva o lead direto para escolher o pacote antes de assinar. Use em campanhas, botões de venda e materiais comerciais.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={platformCheckoutUrlDraft}
                onChange={(e) => setPlatformCheckoutUrlDraft(e.target.value)}
                placeholder="https://dashboard.kiwify.com.br/products/..."
                className="font-mono text-sm"
              />
              <Button
                className="gap-2"
                onClick={async () => {
                  setSavingPlatformSettings(true);
                  const { error } = await supabase
                    .from("platform_settings")
                    .upsert({ id: 1, checkout_url: platformCheckoutUrlDraft.trim() || null }, { onConflict: "id" });
                  setSavingPlatformSettings(false);

                  if (error) {
                    toast.error("Falha ao salvar link da plataforma", { description: error.message });
                    return;
                  }

                  toast.success("Link da plataforma salvo.");
                  queryClient.invalidateQueries({ queryKey: ["super-admin-platform-settings"] });
                }}
                disabled={savingPlatformSettings}
              >
                <Save className="h-4 w-4" />
                {savingPlatformSettings ? "Salvando..." : "Salvar link"}
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={async () => {
                  const urlToCopy = platformCheckoutUrlDraft.trim() || `${window.location.origin}/assinar`;
                  await navigator.clipboard.writeText(urlToCopy);
                  setCopiedCheckoutLink(true);
                  toast.success("Link copiado!");
                  window.setTimeout(() => setCopiedCheckoutLink(false), 2000);
                }}
              >
                {copiedCheckoutLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedCheckoutLink ? "Copiado" : "Copiar"}
              </Button>
            </div>

            <div className="grid gap-2 text-sm text-muted-foreground">
              <p>
                Destino: <span className="font-medium text-foreground">{platformCheckoutUrlDraft || "/assinar"}</span>
              </p>
              <p>Se o campo estiver vazio, a plataforma continua com o link público padrão de assinatura.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft" data-tutorial-target="superadmin-custom-quotes">
          <CardHeader>
            <CardTitle className="text-base">Solicitações de projeto customizado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customQuoteRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma solicitação enviada ainda.</p>
            ) : (
              customQuoteRequests.map((request) => (
                <div key={request.id} className="rounded-xl border border-border bg-secondary/20 p-4">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{request.company_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {request.contact_name} · {request.email} · {request.whatsapp}
                      </p>
                    </div>
                    <Badge variant={request.status === "pending" ? "outline" : "default"}>{request.status}</Badge>
                  </div>

                  <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                    <p>Admins: <span className="font-medium text-foreground">{request.admin_count}</span></p>
                    <p>Profissionais: <span className="font-medium text-foreground">{request.professional_count}</span></p>
                    <p>Pacientes/mês: <span className="font-medium text-foreground">{request.patient_volume}</span></p>
                    <p>Tipo de app: <span className="font-medium text-foreground">{request.desired_app_type}</span></p>
                    <p className="md:col-span-2">Endereço: <span className="font-medium text-foreground">{request.address_full}</span></p>
                    {request.additional_info && (
                      <p className="md:col-span-2">Observações: <span className="font-medium text-foreground">{request.additional_info}</span></p>
                    )}
                  </div>

                  <div className="mt-3 text-xs text-muted-foreground">
                    <p>Recebido em: {new Date(request.created_at).toLocaleString("pt-BR")}</p>
                    <p>Canal: formulário de projeto customizado</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <PlanCatalogManager
          onPlansChanged={() => queryClient.invalidateQueries({ queryKey: ["super-admin-dataset-v3"] })}
        />

        <Card className="hidden shadow-soft" data-tutorial-target="superadmin-share">
          <CardHeader>
            <CardTitle className="text-base">Link público de assinatura</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-[1fr_220px]">
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-secondary/40 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-primary" />
                   <p className="text-sm font-semibold text-foreground">Divulgação para clínicas e profissionais</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Disponibilize este link nas redes sociais, no comercial e em campanhas para levar novos assinantes diretamente para a página pública de planos.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Input readOnly value={subscriptionShareUrl} className="font-mono text-sm" onFocus={(e) => e.target.select()} />
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={async () => {
                    await navigator.clipboard.writeText(subscriptionShareUrl);
                    setCopiedShareLink(true);
                    toast.success("Link de assinatura copiado");
                    window.setTimeout(() => setCopiedShareLink(false), 2000);
                  }}
                >
                  {copiedShareLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedShareLink ? "Copiado" : "Copiar link"}
                </Button>
              </div>

              <div className="grid gap-2 text-sm text-muted-foreground">
                <p>
                  Destino:{" "}
                  <span className="font-medium text-foreground">{"/assinar"}</span>
                </p>
                <p>Uso recomendado: bio do Instagram, WhatsApp comercial, landing pages de campanha e materiais de vendas.</p>
                <p className="text-xs">
                  Se quiser vender pela Kiwify, salve o link do checkout no campo do assinante e copie o valor de saída daqui.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <QrCode className="h-4 w-4 text-primary" />
                QR Code
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <QRCodeSVG
                  value={subscriptionShareUrl}
                  size={160}
                  level="M"
                  includeMargin={false}
                  bgColor="transparent"
                  fgColor="currentColor"
                  className="text-foreground"
                />
              </div>
            <p className="text-center text-xs text-muted-foreground">
                Escaneie para abrir a página pública de assinatura ou o checkout configurado.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft" data-tutorial-target="superadmin-plans">
          <CardHeader>
             <CardTitle className="text-base">Descrições dos pacotes para divulgação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {planMarketingCatalog.map((plan) => {
              const copy = getPlanCommercialCopy(plan);

              return (
                <div key={plan.key} className="rounded-xl border border-border p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                      <p className="text-xs text-muted-foreground">{plan.description}</p>
                    </div>
                    {plan.marketing.highlight && <Badge variant="outline">{plan.marketing.highlight}</Badge>}
                  </div>

                  <div className="space-y-2">
                     <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Texto único para divulgação</p>
                    <div className="min-h-28 whitespace-pre-line rounded-lg bg-secondary/30 p-3 text-sm text-foreground">{copy.text}</div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={async () => {
                        await navigator.clipboard.writeText(copy.text);
                        setCopiedCopyKey(plan.key);
                        toast.success(`Texto do pacote ${plan.name} copiado`);
                        window.setTimeout(() => setCopiedCopyKey(null), 2000);
                      }}
                    >
                      {copiedCopyKey === plan.key ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      Copiar
                    </Button>
                  </div>
                </div>
              );
            })}

            <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
               Acima de 11 profissionais, divulgar como plataforma customizada, com solicitação de orçamento.
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
             <CardTitle className="text-base">Aplicativos para gestão</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {appIntegrations.map((app) => (
              <div key={app.name} className="rounded-lg border border-border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Network className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">{app.name}</p>
                  </div>
                  <Badge variant={app.status === "conectado" ? "default" : "outline"}>{app.status}</Badge>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">{app.description}</p>
                <a href={app.href} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs font-medium text-primary hover:underline">
                  <Link2 className="mr-1 h-3.5 w-3.5" /> Abrir app
                </a>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default SuperAdminDashboard;
