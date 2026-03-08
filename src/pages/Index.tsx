import { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import AdminLayout from "@/components/layout/AdminLayout";
import MetricCard from "@/components/dashboard/MetricCard";
import AppointmentRow from "@/components/dashboard/AppointmentRow";
import NewAppointmentDialog from "@/components/dashboard/NewAppointmentDialog";
import { Button } from "@/components/ui/button";
import type { AppointmentStatus } from "@/components/dashboard/StatusChip";
import { useTodayAppointments, useDashboardMetrics } from "@/hooks/use-appointments";

const statusFilters: { value: AppointmentStatus | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "confirmada", label: "Confirmadas" },
  { value: "agendada", label: "Pendentes" },
  { value: "em_atendimento", label: "Atendendo" },
  { value: "disponivel", label: "Disponíveis" },
  { value: "concluida", label: "Concluídas" },
];

const Dashboard = () => {
  const [activeFilter, setActiveFilter] = useState<AppointmentStatus | "all">("all");
  const { data: appointments = [], isLoading: loadingApts } = useTodayAppointments();
  const { data: metrics } = useDashboardMetrics();

  const filteredAppointments =
    activeFilter === "all"
      ? appointments
      : appointments.filter((a) => a.status === activeFilter);

  const today = new Date();
  const formattedDate = today.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
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

        {/* Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        >
          <MetricCard value={metrics?.todayCount ?? 0} label="Atendimentos Hoje" icon={Calendar} />
          <MetricCard value={metrics?.availableCount ?? 0} label="Vagas Disponíveis" icon={Clock} variant="accent" />
          <MetricCard value={appointments.length} label="Na Agenda" icon={Users} variant="success" />
          <MetricCard value={metrics?.pendingCount ?? 0} label="Pendências" icon={AlertTriangle} variant="warning" />
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Agenda do dia */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Agenda de Hoje</h2>
              <Button variant="ghost" size="sm" className="text-primary gap-1">
                Ver completa <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((f) => (
                <Button
                  key={f.value}
                  variant={activeFilter === f.value ? "default" : "outline"}
                  size="sm"
                  className="h-7 rounded-full text-xs"
                  onClick={() => setActiveFilter(f.value)}
                >
                  {f.label}
                </Button>
              ))}
            </div>

            {/* Appointments */}
            <div className="space-y-2">
              {loadingApts ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : filteredAppointments.length > 0 ? (
                filteredAppointments.map((apt, i) => (
                  <motion.div
                    key={apt.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 + i * 0.04 }}
                  >
                    <AppointmentRow appointment={apt} />
                  </motion.div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  {activeFilter === "all"
                    ? "Nenhuma consulta agendada para hoje."
                    : "Nenhuma consulta com esse filtro."}
                </div>
              )}
            </div>
          </motion.div>

          {/* Sidebar panels */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-4"
          >
            {/* Visão Geral */}
            <div className="rounded-lg border border-border bg-card p-4 shadow-soft">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground">Resumo do Dia</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total agendados</span>
                  <span className="font-semibold text-foreground">{metrics?.todayCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Disponíveis</span>
                  <span className="font-semibold text-accent">{metrics?.availableCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Aguardando confirmação</span>
                  <span className="font-semibold text-warning">{metrics?.pendingCount ?? 0}</span>
                </div>
                {(metrics?.todayCount ?? 0) > 0 && (
                  <>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{
                          width: `${Math.min(100, ((metrics?.todayCount ?? 0) - (metrics?.availableCount ?? 0)) / Math.max(1, metrics?.todayCount ?? 1) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {((metrics?.todayCount ?? 0) - (metrics?.availableCount ?? 0))} de {metrics?.todayCount} horários preenchidos
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
