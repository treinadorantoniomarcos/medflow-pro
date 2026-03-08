import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import {
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  CalendarCheck,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { format, addDays, subDays, isToday, isTomorrow, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useProfessionalAgenda,
  useProfessionalStats,
} from "@/hooks/use-professional-agenda";
import StatusChip from "@/components/dashboard/StatusChip";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { buildWhatsAppUrl, buildAppointmentReminder } from "@/lib/whatsapp";
import type { AppointmentStatus } from "@/components/dashboard/StatusChip";

const statusActions: { from: AppointmentStatus; to: AppointmentStatus; label: string; icon: React.ReactNode }[] = [
  { from: "scheduled", to: "confirmed", label: "Confirmar", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  { from: "confirmed", to: "in_progress", label: "Iniciar", icon: <PlayCircle className="h-3.5 w-3.5" /> },
  { from: "in_progress", to: "completed", label: "Concluir", icon: <CalendarCheck className="h-3.5 w-3.5" /> },
];

const MinhaAgenda = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: appointments = [], isLoading } = useProfessionalAgenda(selectedDate);
  const { data: stats } = useProfessionalStats(selectedDate);

  const goPrev = () => setSelectedDate((d) => subDays(d, 1));
  const goNext = () => setSelectedDate((d) => addDays(d, 1));
  const goToday = () => setSelectedDate(new Date());

  const dateLabel = isToday(selectedDate)
    ? "Hoje"
    : isTomorrow(selectedDate)
    ? "Amanhã"
    : isYesterday(selectedDate)
    ? "Ontem"
    : format(selectedDate, "EEEE", { locale: ptBR });

  const handleStatusChange = async (id: string, newStatus: AppointmentStatus) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar status", { description: error.message });
    } else {
      toast.success("Status atualizado!");
      queryClient.invalidateQueries({ queryKey: ["professional-agenda"] });
      queryClient.invalidateQueries({ queryKey: ["professional-stats"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    }
  };

  const handleWhatsAppReminder = async (apt: typeof appointments[number]) => {
    // Look up patient phone from patients table
    const { data: patient } = await supabase
      .from("patients")
      .select("phone")
      .eq("tenant_id", profile!.tenant_id)
      .eq("full_name", apt.patient_name)
      .maybeSingle();

    if (!patient?.phone) {
      toast.error("Telefone não encontrado", {
        description: "O paciente não possui telefone cadastrado.",
      });
      return;
    }

    const dateStr = format(new Date(apt.starts_at), "dd/MM/yyyy", { locale: ptBR });
    const timeStr = format(new Date(apt.starts_at), "HH:mm");

    const message = buildAppointmentReminder({
      patientName: apt.patient_name,
      date: dateStr,
      time: timeStr,
      professionalName: apt.professional_name,
      type: apt.type,
    });

    const url = buildWhatsAppUrl(patient.phone, message);
    if (url) window.open(url, "_blank");
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <Stethoscope className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                Minha Agenda
              </h1>
              <p className="text-sm text-muted-foreground">
                {profile?.full_name ?? "Profissional"}
              </p>
            </div>
          </div>

          {/* Date navigation */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs font-semibold min-w-[120px]"
              onClick={goToday}
            >
              <span className="capitalize">{dateLabel}</span>
              <span className="ml-1 text-muted-foreground">
                {format(selectedDate, "dd/MM", { locale: ptBR })}
              </span>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          <StatCard label="Total" value={stats?.total ?? 0} icon={<Clock className="h-4 w-4" />} loading={isLoading} />
          <StatCard label="Pendentes" value={stats?.pending ?? 0} icon={<AlertCircle className="h-4 w-4" />} loading={isLoading} />
          <StatCard label="Em atendimento" value={stats?.inProgress ?? 0} icon={<PlayCircle className="h-4 w-4" />} loading={isLoading} />
          <StatCard label="Concluídas" value={stats?.completed ?? 0} icon={<CheckCircle2 className="h-4 w-4" />} loading={isLoading} />
        </motion.div>

        {/* Appointment list */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[100px] w-full rounded-lg" />
            ))
          ) : appointments.length === 0 ? (
            <div className="py-16 text-center">
              <Stethoscope className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground mt-2">
                Nenhuma consulta para este dia.
              </p>
            </div>
          ) : (
            appointments.map((apt, i) => {
              const time = format(new Date(apt.starts_at), "HH:mm");
              const action = statusActions.find((a) => a.from === apt.status);

              return (
                <motion.div
                  key={apt.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card className="shadow-soft hover:shadow-medium transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Time column */}
                        <div className="flex flex-col items-center shrink-0 pt-0.5">
                          <span className="text-lg font-bold tabular-nums text-foreground">
                            {time}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {apt.ends_at
                              ? format(new Date(apt.ends_at), "HH:mm")
                              : "—"}
                          </span>
                        </div>

                        <Separator orientation="vertical" className="h-14 shrink-0" />

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {apt.patient_name}
                            </p>
                            <StatusChip status={apt.status} className="scale-[0.9] origin-left" />
                          </div>
                          {apt.type && (
                            <Badge variant="outline" className="text-[10px]">
                              {apt.type}
                            </Badge>
                          )}
                          {apt.notes && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {apt.notes}
                            </p>
                          )}
                        </div>

                        {/* Action button */}
                        {action && (
                          <Button
                            size="sm"
                            variant={action.to === "completed" ? "default" : "outline"}
                            className="gap-1.5 text-xs shrink-0"
                            onClick={() => handleStatusChange(apt.id, action.to)}
                          >
                            {action.icon}
                            {action.label}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </motion.div>
      </div>
    </AdminLayout>
  );
};

const StatCard = ({
  label,
  value,
  icon,
  loading,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  loading: boolean;
}) => (
  <Card className="shadow-soft">
    <CardContent className="flex items-center gap-3 p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        {loading ? (
          <Skeleton className="h-5 w-8 mt-0.5" />
        ) : (
          <p className="text-lg font-bold text-foreground">{value}</p>
        )}
      </div>
    </CardContent>
  </Card>
);

export default MinhaAgenda;
