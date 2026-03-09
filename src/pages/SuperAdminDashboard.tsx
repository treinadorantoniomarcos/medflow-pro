import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, CalendarCheck2, Stethoscope, UserRound, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import AdminLayout from "@/components/layout/AdminLayout";
import MetricCard from "@/components/dashboard/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

type ClinicRow = {
  id: string;
  name: string;
  slug: string | null;
  created_at: string;
  updated_at: string;
};

const SuperAdminDashboard = () => {
  const { data: metrics } = useQuery({
    queryKey: ["super-admin-metrics"],
    queryFn: async () => {
      const [
        clinicsResp,
        professionalsResp,
        patientsResp,
        monthAppointmentsResp,
        noShowResp,
      ] = await Promise.all([
        supabase.from("clinics").select("id", { count: "exact", head: true }),
        supabase
          .from("user_roles")
          .select("id", { count: "exact", head: true })
          .eq("role", "professional"),
        supabase
          .from("user_roles")
          .select("id", { count: "exact", head: true })
          .eq("role", "patient"),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .gte("starts_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
          .lt("starts_at", new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("status", "no_show"),
      ]);

      if (clinicsResp.error) throw clinicsResp.error;
      if (professionalsResp.error) throw professionalsResp.error;
      if (patientsResp.error) throw patientsResp.error;
      if (monthAppointmentsResp.error) throw monthAppointmentsResp.error;
      if (noShowResp.error) throw noShowResp.error;

      return {
        clinics: clinicsResp.count ?? 0,
        professionals: professionalsResp.count ?? 0,
        patients: patientsResp.count ?? 0,
        monthAppointments: monthAppointmentsResp.count ?? 0,
        noShow: noShowResp.count ?? 0,
      };
    },
  });

  const { data: clinics = [] } = useQuery({
    queryKey: ["super-admin-clinics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinics")
        .select("id, name, slug, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) throw error;
      return (data ?? []) as ClinicRow[];
    },
  });

  const { data: monthlyAppointments = [] } = useQuery({
    queryKey: ["super-admin-monthly-appointments-by-tenant"],
    queryFn: async () => {
      const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);

      const { data, error } = await supabase
        .from("appointments")
        .select("tenant_id")
        .gte("starts_at", start.toISOString())
        .lt("starts_at", end.toISOString())
        .limit(10000);

      if (error) throw error;
      return (data ?? []) as Array<{ tenant_id: string }>;
    },
  });

  const topTenants = useMemo(() => {
    const counts = new Map<string, number>();
    monthlyAppointments.forEach((item) => {
      counts.set(item.tenant_id, (counts.get(item.tenant_id) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([tenantId, total]) => {
        const clinic = clinics.find((item) => item.id === tenantId);
        return {
          tenantId,
          total,
          clinicName: clinic?.name ?? "Clinica",
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [monthlyAppointments, clinics]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Super Admin</h1>
          <p className="text-sm text-muted-foreground">
            Visao consolidada da plataforma, assinantes e operacao mensal.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <MetricCard value={metrics?.clinics ?? 0} label="Clinicas ativas" icon={Building2} />
          <MetricCard value={metrics?.professionals ?? 0} label="Profissionais" icon={Stethoscope} variant="accent" />
          <MetricCard value={metrics?.patients ?? 0} label="Pacientes" icon={UserRound} variant="success" />
          <MetricCard value={metrics?.monthAppointments ?? 0} label="Consultas no mes" icon={CalendarCheck2} />
          <MetricCard value={metrics?.noShow ?? 0} label="No-show acumulado" icon={AlertTriangle} variant="warning" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Tenants recentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {clinics.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma clinica cadastrada.</p>
              )}
              {clinics.map((clinic) => (
                <div
                  key={clinic.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{clinic.name}</p>
                    <p className="text-xs text-muted-foreground">
                      slug: {clinic.slug ?? "sem-slug"} | criado{" "}
                      {formatDistanceToNow(new Date(clinic.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <Badge variant="outline">tenant</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Top ocupacao por tenant (mes)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topTenants.length === 0 && (
                <p className="text-sm text-muted-foreground">Sem consultas registradas neste mes.</p>
              )}
              {topTenants.map((tenant) => (
                <div key={tenant.tenantId} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{tenant.clinicName}</span>
                    <span className="text-muted-foreground">{tenant.total} consultas</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.max(8, Math.min(100, (tenant.total / Math.max(1, topTenants[0].total)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SuperAdminDashboard;
