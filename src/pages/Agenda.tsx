import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  addDays,
  addWeeks,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  startOfWeek,
  subDays,
  subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  List,
  X,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import NewAppointmentDialog from "@/components/dashboard/NewAppointmentDialog";
import WeeklySlotCard from "@/components/agenda/WeeklySlotCard";
import StatusChip from "@/components/dashboard/StatusChip";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  type AgendaPeriod,
  useAgendaAppointments,
  useProfessionals,
  useWeekAppointments,
} from "@/hooks/use-agenda";
import type { AppointmentStatus } from "@/components/dashboard/StatusChip";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7);

const statusFilters: { value: AppointmentStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos os status" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "scheduled", label: "Agendadas" },
  { value: "in_progress", label: "Em atendimento" },
  { value: "available", label: "Disponiveis" },
  { value: "completed", label: "Concluidas" },
  { value: "cancelled", label: "Canceladas" },
  { value: "no_show", label: "No-show" },
];

const periodOptions: { value: AgendaPeriod; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "week", label: "Semana" },
  { value: "15days", label: "15 dias" },
  { value: "month", label: "Mensal" },
  { value: "bimester", label: "Bimestral" },
  { value: "semester", label: "Semestral" },
  { value: "year", label: "Anual" },
];

const isValidPeriod = (value: string | null): value is AgendaPeriod =>
  value !== null &&
  ["today", "week", "15days", "month", "bimester", "semester", "year"].includes(value);

const Agenda = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPeriod: AgendaPeriod = isValidPeriod(searchParams.get("period"))
    ? (searchParams.get("period") as AgendaPeriod)
    : "week";

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState<AgendaPeriod>(initialPeriod);
  const [selectedProfessional, setSelectedProfessional] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<AppointmentStatus | "all">("all");
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [slotDate, setSlotDate] = useState("");
  const [slotTime, setSlotTime] = useState("");

  const handleSlotClick = useCallback((day: Date, hour: number) => {
    setSlotDate(format(day, "yyyy-MM-dd"));
    setSlotTime(`${String(hour).padStart(2, "0")}:00`);
    setSlotDialogOpen(true);
  }, []);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const isGridView = selectedPeriod === "today" || selectedPeriod === "week";

  const { data: weekAppointments = [], isLoading: loadingWeek } = useWeekAppointments(
    weekStart,
    weekEnd
  );
  const { data: periodAppointments = [], isLoading: loadingPeriod } = useAgendaAppointments(
    selectedPeriod,
    currentDate
  );
  const appointments = isGridView ? weekAppointments : periodAppointments;
  const isLoading = isGridView ? loadingWeek : loadingPeriod;
  const { data: professionals = [] } = useProfessionals();

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      if (selectedProfessional !== "all" && apt.professional_name !== selectedProfessional) {
        return false;
      }
      if (selectedStatus !== "all" && apt.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [appointments, selectedProfessional, selectedStatus]);

  const getAppointmentsForSlot = (day: Date, hour: number) => {
    return filteredAppointments.filter((apt) => {
      const startsAt = new Date(apt.starts_at);
      return isSameDay(startsAt, day) && startsAt.getHours() === hour;
    });
  };

  const goToToday = () => setCurrentDate(new Date());
  const goPrev = () => {
    if (selectedPeriod === "today") {
      setCurrentDate((d) => subDays(d, 1));
      return;
    }
    setCurrentDate((d) => subWeeks(d, 1));
  };
  const goNext = () => {
    if (selectedPeriod === "today") {
      setCurrentDate((d) => addDays(d, 1));
      return;
    }
    setCurrentDate((d) => addWeeks(d, 1));
  };

  const hasFilters = selectedProfessional !== "all" || selectedStatus !== "all";

  return (
    <AdminLayout>
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <CalendarDays className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Agenda</h1>
              <p className="text-sm text-muted-foreground">
                {isGridView
                  ? `${format(weekStart, "dd MMM", { locale: ptBR })} - ${format(weekEnd, "dd MMM yyyy", { locale: ptBR })}`
                  : `Periodo ${periodOptions.find((item) => item.value === selectedPeriod)?.label ?? ""}`}
              </p>
            </div>
          </div>
          <NewAppointmentDialog />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex flex-wrap items-center gap-3"
        >
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold" onClick={goToToday}>
              Hoje
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Select
            value={selectedPeriod}
            onValueChange={(value) => {
              const next = value as AgendaPeriod;
              setSelectedPeriod(next);
              setSearchParams({ period: next });
            }}
          >
            <SelectTrigger className="w-[150px] h-9 text-xs">
              <List className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
            <SelectTrigger className="w-[200px] h-9 text-xs">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Profissional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos profissionais</SelectItem>
              {professionals.map((professional) => (
                <SelectItem key={professional} value={professional}>
                  {professional}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedStatus}
            onValueChange={(value) => setSelectedStatus(value as AppointmentStatus | "all")}
          >
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusFilters.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1 text-muted-foreground"
              onClick={() => {
                setSelectedProfessional("all");
                setSelectedStatus("all");
              }}
            >
              <X className="h-3.5 w-3.5" />
              Limpar filtros
            </Button>
          )}

          <span className="ml-auto text-xs text-muted-foreground">
            {filteredAppointments.length} consulta{filteredAppointments.length !== 1 ? "s" : ""}
          </span>
        </motion.div>

        {isGridView ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-lg border border-border bg-card shadow-soft overflow-auto"
          >
            <div className="min-w-[800px]">
              <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-border sticky top-0 bg-card z-10">
                <div className="p-2" />
                {weekDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={cn("p-2 text-center border-l border-border", isToday(day) && "bg-primary/5")}
                  >
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {format(day, "EEE", { locale: ptBR })}
                    </p>
                    <p className={cn("text-lg font-bold", isToday(day) ? "text-primary" : "text-foreground")}>
                      {format(day, "dd")}
                    </p>
                  </div>
                ))}
              </div>

              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-xs text-muted-foreground mt-2">Carregando agenda...</p>
                </div>
              ) : (
                HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-border last:border-b-0 min-h-[72px]"
                  >
                    <div className="p-2 text-right pr-3 border-r border-border">
                      <span className="text-xs font-medium tabular-nums text-muted-foreground">
                        {String(hour).padStart(2, "0")}:00
                      </span>
                    </div>
                    {weekDays.map((day) => {
                      const slotAppointments = getAppointmentsForSlot(day, hour);
                      return (
                        <div
                          key={`${day.toISOString()}-${hour}`}
                          className={cn(
                            "border-l border-border p-1 space-y-1 cursor-pointer hover:bg-muted/40 transition-colors",
                            isToday(day) && "bg-primary/[0.02]"
                          )}
                          onClick={() => handleSlotClick(day, hour)}
                        >
                          {slotAppointments.map((appointment) => (
                            <WeeklySlotCard key={appointment.id} appointment={appointment} />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-lg border border-border bg-card shadow-soft p-4 space-y-3"
          >
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-xs text-muted-foreground mt-2">Carregando agenda...</p>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                Nenhuma consulta para o periodo selecionado.
              </div>
            ) : (
              filteredAppointments.map((appointment) => (
                <div key={appointment.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{appointment.patient_name}</p>
                    <StatusChip status={appointment.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(new Date(appointment.starts_at), "dd/MM/yyyy HH:mm", { locale: ptBR })} -{" "}
                    {appointment.professional_name}
                  </p>
                </div>
              ))
            )}
          </motion.div>
        )}

        <NewAppointmentDialog
          open={slotDialogOpen}
          onOpenChange={setSlotDialogOpen}
          defaultDate={slotDate}
          defaultTime={slotTime}
          hideTrigger
        />
      </div>
    </AdminLayout>
  );
};

export default Agenda;
