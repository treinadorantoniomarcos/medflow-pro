import { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  DollarSign,
  ChevronRight,
  Filter,
} from "lucide-react";
import AdminLayout from "@/components/layout/AdminLayout";
import MetricCard from "@/components/dashboard/MetricCard";
import AppointmentRow from "@/components/dashboard/AppointmentRow";
import NewAppointmentDialog from "@/components/dashboard/NewAppointmentDialog";
import { Button } from "@/components/ui/button";
import { todayAppointments, pendencias } from "@/data/mockData";
import type { AppointmentStatus } from "@/components/dashboard/StatusChip";

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

  const filteredAppointments =
    activeFilter === "all"
      ? todayAppointments
      : todayAppointments.filter((a) => a.status === activeFilter);

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
          className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5"
        >
          <MetricCard value={32} label="Atendimentos Hoje" icon={Calendar} />
          <MetricCard value={12} label="Vagas Disponíveis" icon={Clock} variant="accent" />
          <MetricCard value={4} label="Novos Pacientes" icon={Users} variant="success" />
          <MetricCard value={3} label="Pendências" icon={AlertTriangle} variant="warning" />
          <MetricCard
            value="R$ 48.2k"
            label="Receita Mensal"
            icon={DollarSign}
            className="col-span-2 sm:col-span-1"
          />
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
              {filteredAppointments.map((apt, i) => (
                <motion.div
                  key={apt.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.04 }}
                >
                  <AppointmentRow appointment={apt} />
                </motion.div>
              ))}
              {filteredAppointments.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  Nenhuma consulta com esse filtro.
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
            {/* Pendências */}
            <div className="rounded-lg border border-border bg-card p-4 shadow-soft">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground">Pendências</h3>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-2.5">
                {pendencias.map((p, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm">
                    <span className="text-base">{p.icon}</span>
                    <span className="text-muted-foreground">{p.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visão Geral */}
            <div className="rounded-lg border border-border bg-card p-4 shadow-soft">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground">Visão Geral</h3>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground">
                  Mês <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Consulta por Tipo</span>
                  <span className="font-semibold text-foreground">5.2%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full w-[62%] rounded-full bg-primary transition-all" />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Últimos 30 dias</span>
                  <div className="flex gap-0.5">
                    {[40, 55, 45, 70, 60, 80, 65].map((h, i) => (
                      <div
                        key={i}
                        className="w-3 rounded-sm bg-primary/80"
                        style={{ height: `${h * 0.3}px` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
