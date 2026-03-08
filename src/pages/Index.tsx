import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Calendar, ChevronRight, Clock, Users } from "lucide-react";
import AdminLayout from "@/components/layout/AdminLayout";
import MetricCard from "@/components/dashboard/MetricCard";
import AppointmentRow from "@/components/dashboard/AppointmentRow";
import NewAppointmentDialog from "@/components/dashboard/NewAppointmentDialog";
import { Button } from "@/components/ui/button";
import type { AppointmentStatus } from "@/components/dashboard/StatusChip";
import {
  useAppointmentsByPeriod,
  useDashboardMetrics,
  type DashboardPeriod,
} from "@/hooks/use-appointments";
import { useNavigate } from "react-router-dom";

const statusFilters: { value: AppointmentStatus | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "scheduled", label: "Pendentes" },
  { value: "in_progress", label: "Atendendo" },
  { value: "available", label: "Disponiveis" },
  { value: "completed", label: "Concluidas" },
];

const periodFilters: { value: DashboardPeriod; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "week", label: "Semana" },
  { value: "15days", label: "15 dias" },
  { value: "month", label: "Mensal" },
  { value: "bimester", label: "Bimestral" },
  { value: "semester", label: "Semestral" },
  { value: "year", label: "Anual" },
];

const periodTitleMap: Record<DashboardPeriod, string> = {
  today: "hoje",
  week: "semana",
  "15days": "15 dias",
  month: "mes",
  bimester: "bimestre",
  semester: "semestre",
  year: "ano",
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<AppointmentStatus | "all">("all");
  const [period, setPeriod] = useState<DashboardPeriod>("today");

  const { data: appointments = [], isLoading: loadingApts } = useAppointmentsByPeriod(period);
  const { data: metrics } = useDashboardMetrics(period);

  const filteredAppointments =
    activeFilter === "all"
      ? appointments
      : appointments.filter((appointment) => appointment.status === activeFilter);

  const now = new Date();
  const formattedDate = now.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground capitalize">{formattedDate}</p>
          </div>
          <NewAppointmentDialog />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        >
          <MetricCard value={metrics?.todayCount ?? 0} label="Atendimentos no Periodo" icon={Calendar} />
          <MetricCard value={metrics?.availableCount ?? 0} label="Vagas Disponiveis" icon={Clock} variant="accent" />
          <MetricCard value={appointments.length} label="Na Agenda" icon={Users} variant="success" />
          <MetricCard value={metrics?.pendingCount ?? 0} label="Pendencias" icon={AlertTriangle} variant="warning" />
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Agenda do Periodo</h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary gap-1"
                onClick={() => navigate(`/agenda?period=${period}`)}
              >
                Ver completa <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {periodFilters.map((filter) => (
                <Button
                  key={filter.value}
                  variant={period === filter.value ? "default" : "outline"}
                  size="sm"
                  className="h-7 rounded-full text-xs"
                  onClick={() => setPeriod(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {statusFilters.map((filter) => (
                <Button
                  key={filter.value}
                  variant={activeFilter === filter.value ? "default" : "outline"}
                  size="sm"
                  className="h-7 rounded-full text-xs"
                  onClick={() => setActiveFilter(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              {loadingApts ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-16 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : filteredAppointments.length > 0 ? (
                filteredAppointments.map((appointment, index) => (
                  <motion.div
                    key={appointment.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 + index * 0.04 }}
                  >
                    <AppointmentRow appointment={appointment} />
                  </motion.div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  {activeFilter === "all"
                    ? `Nenhuma consulta agendada para ${periodTitleMap[period]}.`
                    : "Nenhuma consulta com esse filtro."}
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-4"
          >
            <div className="rounded-lg border border-border bg-card p-4 shadow-soft">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Resumo do Periodo</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total agendados</span>
                  <span className="font-semibold text-foreground">{metrics?.todayCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Disponiveis</span>
                  <span className="font-semibold text-accent">{metrics?.availableCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Aguardando confirmacao</span>
                  <span className="font-semibold text-warning">{metrics?.pendingCount ?? 0}</span>
                </div>
                {(metrics?.todayCount ?? 0) > 0 && (
                  <>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            (((metrics?.todayCount ?? 0) - (metrics?.availableCount ?? 0)) /
                              Math.max(1, metrics?.todayCount ?? 1)) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(metrics?.todayCount ?? 0) - (metrics?.availableCount ?? 0)} de{" "}
                      {metrics?.todayCount} horarios preenchidos
                    </p>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
