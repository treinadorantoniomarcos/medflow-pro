import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  CalendarCheck2,
  Download,
  FileText,
  FileSpreadsheet,
  LineChart,
  Network,
  Stethoscope,
  UserRound,
  AlertTriangle,
  Link2,
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
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";
import {
  exportSuperAdminCSV,
  exportSuperAdminDOC,
  exportSuperAdminPDF,
  exportSuperAdminXLS,
} from "@/lib/export-super-admin";

type ClinicRow = {
  id: string;
  name: string;
  slug: string | null;
  created_at: string;
  updated_at: string;
};

type RoleRow = {
  tenant_id: string;
  role: "owner" | "admin" | "professional" | "receptionist" | "patient" | "super_admin";
};

type AppointmentRow = {
  tenant_id: string;
  starts_at: string;
  status: string;
};

const appIntegrations = [
  {
    name: "WhatsApp Business",
    status: "conectado",
    description: "Confirmacoes, lembretes e recuperacao de no-show por mensageria.",
    href: "https://business.facebook.com",
  },
  {
    name: "Google Calendar",
    status: "pendente",
    description: "Sincronizacao de agenda externa para equipe clinica.",
    href: "https://calendar.google.com",
  },
  {
    name: "Stripe Billing",
    status: "pendente",
    description: "Cobranca recorrente e conciliacao de assinaturas.",
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

const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const SuperAdminDashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["super-admin-dataset-v2"],
    queryFn: async () => {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const yearStart = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1);

      const [clinicsResp, rolesResp, appointmentsResp] = await Promise.all([
        supabase.from("clinics").select("id, name, slug, created_at, updated_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("tenant_id, role"),
        supabase.from("appointments").select("tenant_id, starts_at, status").gte("starts_at", yearStart.toISOString()).limit(20000),
      ]);

      if (clinicsResp.error) throw clinicsResp.error;
      if (rolesResp.error) throw rolesResp.error;
      if (appointmentsResp.error) throw appointmentsResp.error;

      const clinics = (clinicsResp.data ?? []) as ClinicRow[];
      const roles = (rolesResp.data ?? []) as RoleRow[];
      const appointments = (appointmentsResp.data ?? []) as AppointmentRow[];

      const monthPrefix = monthKey(monthStart);
      const monthlyAppointments = appointments.filter((apt) => apt.starts_at.startsWith(monthPrefix));

      return { clinics, roles, appointments, monthlyAppointments, monthStart };
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

      return {
        clinic_id: clinic.id,
        clinic_name: clinic.name,
        slug: clinic.slug ?? "sem-slug",
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

  const exportPayload = useMemo(() => {
    const now = new Date();
    return {
      generatedAt: now.toLocaleString("pt-BR"),
      periodLabel: now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
      totals,
      rows: subscriberRows,
    };
  }, [subscriberRows, totals]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Super Admin</h1>
            <p className="text-sm text-muted-foreground">
              Link dedicado: <span className="font-medium text-foreground">/super-admin</span> | Gestao completa de assinantes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
          <MetricCard value={totals.clinics} label="Assinantes (clinicas)" icon={Building2} />
          <MetricCard value={totals.professionals} label="Profissionais" icon={Stethoscope} variant="accent" />
          <MetricCard value={totals.patients} label="Pacientes" icon={UserRound} variant="success" />
          <MetricCard value={totals.appointmentsMonth} label="Consultas no mes" icon={CalendarCheck2} />
          <MetricCard value={totals.noShowMonth} label="No-show no mes" icon={AlertTriangle} variant="warning" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Tendencia mensal (6 meses)</CardTitle>
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
              <CardTitle className="text-base">Top assinantes por volume (mes)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topSubscribers.map((item) => ({
                    clinica: item.clinic_name.length > 18 ? `${item.clinic_name.slice(0, 18)}...` : item.clinic_name,
                    consultas: item.month_appointments,
                  }))}>
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

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Assinantes - visao detalhada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Clinica</th>
                    <th className="pb-2 pr-4">Slug</th>
                    <th className="pb-2 pr-4">Equipe</th>
                    <th className="pb-2 pr-4">Pacientes</th>
                    <th className="pb-2 pr-4">Consultas (mes)</th>
                    <th className="pb-2 pr-4">No-show (mes)</th>
                    <th className="pb-2 pr-4">Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {!isLoading && subscriberRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-4 text-muted-foreground">
                        Nenhum assinante encontrado.
                      </td>
                    </tr>
                  )}
                  {subscriberRows.map((row) => (
                    <tr key={row.clinic_id} className="border-b border-border/70">
                      <td className="py-2 pr-4 font-medium">{row.clinic_name}</td>
                      <td className="py-2 pr-4">{row.slug}</td>
                      <td className="py-2 pr-4">{row.owners + row.admins + row.professionals}</td>
                      <td className="py-2 pr-4">{row.patients}</td>
                      <td className="py-2 pr-4">{row.month_appointments}</td>
                      <td className="py-2 pr-4">{row.month_no_show}</td>
                      <td className="py-2 pr-4">{new Date(row.updated_at).toLocaleDateString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Aplicativos para gestao</CardTitle>
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
