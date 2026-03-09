import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  CalendarCheck,
  MessageCircle,
  CalendarDays,
  Users,
  Zap,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import type { AppointmentStatus } from "@/components/dashboard/StatusChip";
import AppointmentAudioPlayer from "@/components/agenda/AppointmentAudioPlayer";

const statusActions: { from: AppointmentStatus; to: AppointmentStatus; label: string; icon: React.ReactNode }[] = [
  { from: "scheduled", to: "confirmed", label: "Confirmar", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  { from: "confirmed", to: "in_progress", label: "Iniciar", icon: <PlayCircle className="h-3.5 w-3.5" /> },
  { from: "in_progress", to: "completed", label: "Concluir", icon: <CalendarCheck className="h-3.5 w-3.5" /> },
];

const MinhaAgenda = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: appointments = [], isLoading } = useProfessionalAgenda(selectedDate);
  const { data: stats } = useProfessionalStats(selectedDate);

  const acceptingBookings = profile?.accepting_bookings ?? true;
  const [toggling, setToggling] = useState(false);

  const handleToggleBookings = async () => {
    if (!profile?.user_id) return;
    setToggling(true);
    const newValue = !acceptingBookings;
    const { error } = await supabase
      .from("profiles")
      .update({ accepting_bookings: newValue })
      .eq("user_id", profile.user_id);
    if (error) {
      toast.error("Erro ao atualizar disponibilidade");
    } else {
      toast.success(newValue ? "Agendamento aberto!" : "Agendamento fechado!");
      queryClient.invalidateQueries({ queryKey: ["auth-profile"] });
    }
    setToggling(false);
  };

  const goPrev = () => setSelectedDate((d) => subDays(d, 1));
  const goNext = () => setSelectedDate((d) => addDays(d, 1));
  const goToday = () => setSelectedDate(new Date());

  const dateLabel = isToday(selectedDate)
    ? "Hoje"
    : isTomorrow(selectedDate)
    ? "Amanhã"
    : isYesterday(selectedDate)
    ? "Ontem"
    : "";

  const formattedDate = format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR });

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

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  // Smart alerts
  const getSmartAlert = (apt: typeof appointments[number]) => {
    const now = new Date();
    const startTime = new Date(apt.starts_at);
    const diffMinutes = (startTime.getTime() - now.getTime()) / 60000;

    if (apt.status === "scheduled" && diffMinutes > 0 && diffMinutes < 30) {
      return { text: "Consulta em breve", type: "warning" as const };
    }
    if (apt.status === "scheduled" && diffMinutes < 0 && diffMinutes > -15) {
      return { text: "Paciente pode se atrasar", type: "alert" as const };
    }
    if (apt.status === "in_progress") {
      return { text: "Em atendimento agora", type: "active" as const };
    }
    return null;
  };

  return (
    <AdminLayout>
      <div className="space-y-4 max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                Agenda
              </h1>
              <p className="text-sm text-muted-foreground">
                {profile?.full_name ?? "Profissional"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-sm font-medium",
                acceptingBookings ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
              )}>
                {acceptingBookings ? "Aberto" : "Fechado"}
              </span>
              <Switch
                checked={acceptingBookings}
                onCheckedChange={handleToggleBookings}
                disabled={toggling}
              />
            </div>
          </div>
        </motion.div>

        {/* Metric cards row */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
          className="grid grid-cols-4 gap-2"
        >
          <MetricCard
            value={stats?.total ?? 0}
            label="Atendimentos"
            loading={isLoading}
            accent="primary"
          />
          <MetricCard
            value={stats?.available ?? 0}
            label="Vagas Disponíveis"
            loading={isLoading}
            accent="emerald"
          />
          <MetricCard
            value={stats?.pending ?? 0}
            label="Agendadas"
            loading={isLoading}
            accent="blue"
          />
          <MetricCard
            value={stats?.confirmed ?? 0}
            label="Confirmadas"
            loading={isLoading}
            accent="amber"
          />
        </motion.div>

        {/* Date navigation */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
        >
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={goPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <button
              onClick={goToday}
              className="text-center flex-1 min-w-0"
            >
              {dateLabel && (
                <span className="text-xs font-semibold text-primary block">
                  {dateLabel}
                </span>
              )}
              <span className="text-sm font-semibold text-foreground capitalize">
                {formattedDate}
              </span>
            </button>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={goNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        {/* Appointment list */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.09 }}
          className="space-y-2"
        >
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
            ))
          ) : appointments.length === 0 ? (
            <div className="py-20 text-center">
              <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground mt-3">
                Nenhuma consulta para este dia.
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={goToday}>
                Ir para hoje
              </Button>
            </div>
          ) : (
            <AnimatePresence>
              {appointments.map((apt, i) => {
                const time = format(new Date(apt.starts_at), "HH:mm");
                const action = statusActions.find((a) => a.from === apt.status);
                const alert = getSmartAlert(apt);
                const isExpanded = expandedId === apt.id;
                const isAvailable = apt.status === "available";

                return (
                  <motion.div
                    key={apt.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <div
                      className={cn(
                        "rounded-xl border border-border bg-card transition-all overflow-hidden",
                        isExpanded && "shadow-md",
                        apt.status === "in_progress" && "border-primary/40 bg-primary/[0.03]"
                      )}
                    >
                      {/* Main row */}
                      <button
                        className="w-full flex items-center gap-3 px-4 py-3 text-left"
                        onClick={() => setExpandedId(isExpanded ? null : apt.id)}
                      >
                        {/* Avatar */}
                        <div className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold shrink-0",
                          isAvailable
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-primary/10 text-primary"
                        )}>
                          {isAvailable ? (
                            <Clock className="h-4 w-4" />
                          ) : (
                            getInitials(apt.patient_name)
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {isAvailable ? "Disponível" : apt.patient_name}
                          </p>
                          {apt.type && (
                            <p className="text-xs text-muted-foreground truncate">
                              {apt.type}
                            </p>
                          )}
                          {/* Status badge inline */}
                          {!isAvailable && apt.status !== "scheduled" && (
                            <StatusChip status={apt.status} className="mt-1 scale-[0.85] origin-left" />
                          )}
                          {isAvailable && (
                            <Badge variant="secondary" className="mt-1 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              Disponível
                            </Badge>
                          )}
                        </div>

                        {/* Time + chevron */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-sm font-bold tabular-nums text-foreground">
                            {time}
                          </span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </div>
                      </button>

                      {/* Smart alert */}
                      {alert && (
                        <div className={cn(
                          "mx-4 mb-2 flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium",
                          alert.type === "warning" && "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
                          alert.type === "alert" && "bg-destructive/10 text-destructive",
                          alert.type === "active" && "bg-primary/10 text-primary"
                        )}>
                          <Zap className="h-3 w-3" />
                          <span>Alerta Inteligente •</span>
                          <span>{alert.text}</span>
                        </div>
                      )}

                      {/* Expanded actions */}
                      <AnimatePresence>
                        {isExpanded && !isAvailable && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-3 pt-1 flex flex-wrap gap-2 border-t border-border">
                              {action && (
                                <Button
                                  size="sm"
                                  variant={action.to === "completed" ? "default" : "outline"}
                                  className="gap-1.5 text-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(apt.id, action.to);
                                  }}
                                >
                                  {action.icon}
                                  {action.label}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleWhatsAppReminder(apt);
                                }}
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                WhatsApp
                              </Button>
                              {apt.notes && (
                                <p className="w-full text-xs text-muted-foreground mt-1 italic">
                                  {apt.notes}
                                </p>
                              )}
                              {apt.audio_note_path && (
                                <div className="w-full mt-2">
                                  <p className="text-xs text-muted-foreground mb-1">Áudio anexado</p>
                                  <AppointmentAudioPlayer audioPath={apt.audio_note_path} />
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </motion.div>
      </div>
    </AdminLayout>
  );
};

/* ─── Metric card ─────────────────────────────────── */

const accentClasses = {
  primary: "border-primary/20 bg-primary/5",
  emerald: "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20",
  blue: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20",
  amber: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20",
};

const MetricCard = ({
  value,
  label,
  loading,
  accent,
}: {
  value: number;
  label: string;
  loading: boolean;
  accent: keyof typeof accentClasses;
}) => (
  <div className={cn(
    "rounded-xl border p-3 text-center transition-colors",
    accentClasses[accent]
  )}>
    {loading ? (
      <Skeleton className="h-8 w-10 mx-auto mb-1" />
    ) : (
      <p className="text-2xl font-extrabold text-foreground tabular-nums">{value}</p>
    )}
    <p className="text-xs text-muted-foreground leading-tight">{label}</p>
  </div>
);

export default MinhaAgenda;
