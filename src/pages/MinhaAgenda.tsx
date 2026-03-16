import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { addDays, addMonths, addWeeks, endOfDay, format, isToday, startOfDay, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, MessageCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import StatusChip from "@/components/dashboard/StatusChip";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AppointmentAudioPlayer from "@/components/agenda/AppointmentAudioPlayer";
import { buildAppointmentReminder, buildWhatsAppUrl } from "@/lib/whatsapp";
import type { AppointmentStatus } from "@/components/dashboard/StatusChip";
import { useProfessionalAgenda, useProfessionalStats } from "@/hooks/use-professional-agenda";

type AppRole = "owner" | "admin" | "professional" | "receptionist" | "patient" | "super_admin";

type TeamProfessional = {
  user_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  accepting_bookings: boolean;
};

type BulkActionType = "open" | "close";
type BulkUnit = "hours" | "days" | "weeks" | "months";
type PeriodStatusFilter = "all" | "open" | "blocked" | "pending";
type DayTypeFilter = "all" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday" | "holiday";

const statusActions: { from: AppointmentStatus; to: AppointmentStatus; label: string }[] = [
  { from: "scheduled", to: "confirmed", label: "Confirmar" },
  { from: "confirmed", to: "in_progress", label: "Iniciar" },
  { from: "in_progress", to: "completed", label: "Concluir" },
];

const getEasterSunday = (year: number) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

const getBrazilNationalHolidaySet = (year: number) => {
  const fixed = [
    `${year}-01-01`,
    `${year}-04-21`,
    `${year}-05-01`,
    `${year}-09-07`,
    `${year}-10-12`,
    `${year}-11-02`,
    `${year}-11-15`,
    `${year}-11-20`,
    `${year}-12-25`,
  ];

  const easter = getEasterSunday(year);
  const goodFriday = subDays(easter, 2);
  fixed.push(format(goodFriday, "yyyy-MM-dd"));

  return new Set(fixed);
};

const getDayType = (date: Date): DayTypeFilter => {
  const holidaySet = getBrazilNationalHolidaySet(date.getFullYear());
  const key = format(date, "yyyy-MM-dd");
  if (holidaySet.has(key)) return "holiday";
  if (date.getDay() === 1) return "monday";
  if (date.getDay() === 2) return "tuesday";
  if (date.getDay() === 3) return "wednesday";
  if (date.getDay() === 4) return "thursday";
  if (date.getDay() === 5) return "friday";
  if (date.getDay() === 0) return "sunday";
  if (date.getDay() === 6) return "saturday";
  return "monday";
};

const getDayTypeLabel = (dayType: DayTypeFilter) => {
  if (dayType === "holiday") return "FERIADO NACIONAL";
  if (dayType === "saturday") return "Sábado";
  if (dayType === "monday") return "Segunda-feira";
  if (dayType === "tuesday") return "Terça-feira";
  if (dayType === "wednesday") return "Quarta-feira";
  if (dayType === "thursday") return "Quinta-feira";
  if (dayType === "friday") return "Sexta-feira";
  if (dayType === "sunday") return "Domingo";
  return "Dia útil";
};

const getReadableDayTypeLabel = (dayType: DayTypeFilter) => {
  if (dayType === "holiday") return "FERIADO NACIONAL";
  if (dayType === "monday") return "Segunda-feira";
  if (dayType === "tuesday") return "Terça-feira";
  if (dayType === "wednesday") return "Quarta-feira";
  if (dayType === "thursday") return "Quinta-feira";
  if (dayType === "friday") return "Sexta-feira";
  if (dayType === "saturday") return "Sábado";
  if (dayType === "sunday") return "Domingo";
  return "Todos os dias";
};

const getDayTypeAccentClass = (dayType: DayTypeFilter) => {
  if (dayType === "holiday") return "text-amber-800 dark:text-amber-300 font-semibold";
  if (dayType === "saturday") return "text-sky-700 dark:text-sky-300 font-medium";
  if (dayType === "sunday") return "text-violet-700 dark:text-violet-300 font-medium";
  return "";
};

const MinhaAgenda = () => {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>(user?.id ?? "");
  const [bulkProfessionalIds, setBulkProfessionalIds] = useState<string[]>([]);
  const [savingSlot, setSavingSlot] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [bulkAmount, setBulkAmount] = useState("1");
  const [bulkUnit, setBulkUnit] = useState<BulkUnit>("days");
  const [bulkAction, setBulkAction] = useState<BulkActionType>("close");
  const [blockReason, setBlockReason] = useState("");
  const [savingBlock, setSavingBlock] = useState(false);
  const [blockSaved, setBlockSaved] = useState(false);
  const [periodStatusFilter, setPeriodStatusFilter] = useState<PeriodStatusFilter>("all");
  const [dayTypeFilter, setDayTypeFilter] = useState<DayTypeFilter>("all");
  const [pendingPeriodStatusFilter, setPendingPeriodStatusFilter] = useState<PeriodStatusFilter>("all");
  const [pendingDayTypeFilter, setPendingDayTypeFilter] = useState<DayTypeFilter>("all");
  const [filterStartDate, setFilterStartDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [filterEndDate, setFilterEndDate] = useState(() => format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [pendingFilterStartDate, setPendingFilterStartDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [pendingFilterEndDate, setPendingFilterEndDate] = useState(() => format(addDays(new Date(), 7), "yyyy-MM-dd"));

  const { data: role } = useQuery({
    queryKey: ["my-agenda-role", user?.id, profile?.tenant_id],
    enabled: !!user?.id && !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("tenant_id", profile!.tenant_id)
        .maybeSingle();
      if (error) throw error;
      return (data?.role ?? null) as AppRole | null;
    },
  });

  const isAdminScope = role === "owner" || role === "admin";

  const { data: professionals = [] } = useQuery({
    queryKey: ["my-agenda-professionals", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, email, accepting_bookings")
        .eq("tenant_id", profile!.tenant_id)
        .not("full_name", "is", null)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TeamProfessional[];
    },
  });

  const managedProfessional = useMemo(() => {
    if (!professionals.length) return null;
    if (isAdminScope) {
      return professionals.find((p) => p.user_id === selectedProfessionalId) ?? professionals[0];
    }
    return professionals.find((p) => p.user_id === user?.id) ?? professionals[0];
  }, [professionals, isAdminScope, selectedProfessionalId, user?.id]);

  const managedProfessionalId = managedProfessional?.user_id ?? null;
  const managedProfessionalName = managedProfessional?.full_name ?? null;

  const bulkProfessionals = useMemo(() => {
    if (!isAdminScope) {
      return managedProfessional ? [managedProfessional] : [];
    }
    return professionals.filter((professional) => bulkProfessionalIds.includes(professional.user_id));
  }, [bulkProfessionalIds, isAdminScope, managedProfessional, professionals]);

  const effectiveBulkProfessionalIds = useMemo(() => {
    if (!isAdminScope) return managedProfessionalId ? [managedProfessionalId] : [];
    if (bulkProfessionalIds.length > 0) return bulkProfessionalIds;
    return managedProfessionalId ? [managedProfessionalId] : [];
  }, [bulkProfessionalIds, isAdminScope, managedProfessionalId]);

  const resolvedBulkProfessionals = useMemo(() => {
    if (bulkProfessionals.length > 0) return bulkProfessionals;
    return professionals.filter((professional) => effectiveBulkProfessionalIds.includes(professional.user_id));
  }, [bulkProfessionals, professionals, effectiveBulkProfessionalIds]);

  const { data: appointments = [], isLoading } = useProfessionalAgenda(selectedDate, {
    professionalUserId: managedProfessionalId,
    professionalName: managedProfessionalName,
  });

  const { data: stats } = useProfessionalStats(selectedDate, {
    professionalUserId: managedProfessionalId,
    professionalName: managedProfessionalName,
  });

  const { data: clinicSettings } = useQuery({
    queryKey: ["my-agenda-clinic-settings", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinics")
        .select("settings")
        .eq("id", profile!.tenant_id)
        .single();
      if (error) throw error;
      return (data?.settings as Record<string, unknown> | null) ?? {};
    },
  });

  const workStart = Number(clinicSettings?.work_start_hour ?? 8);
  const workEnd = Number(clinicSettings?.work_end_hour ?? 18);
  const slotDuration = Number(clinicSettings?.slot_duration_minutes ?? 60);

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = workStart; h < workEnd; h++) {
      for (let m = 0; m < 60; m += slotDuration) {
        if (h + m / 60 >= workEnd) break;
        slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }
    }
    return slots;
  }, [workStart, workEnd, slotDuration]);

  const slotDate = format(selectedDate, "yyyy-MM-dd");

  const { data: slotOverrides = [] } = useQuery({
    queryKey: ["slot-overrides", profile?.tenant_id, managedProfessionalId, slotDate],
    enabled: !!profile?.tenant_id && !!managedProfessionalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_slot_overrides")
        .select("slot_time, is_available")
        .eq("tenant_id", profile!.tenant_id)
        .eq("professional_user_id", managedProfessionalId!)
        .eq("slot_date", slotDate);
      if (error) throw error;
      return (data ?? []) as Array<{ slot_time: string; is_available: boolean }>;
    },
  });

  const overrideMap = useMemo(() => {
    const map = new Map<string, boolean>();
    slotOverrides.forEach((item) => map.set(String(item.slot_time).slice(0, 5), item.is_available));
    return map;
  }, [slotOverrides]);

  const { data: periodBlocks = [] } = useQuery({
    queryKey: ["availability-blocks", profile?.tenant_id, managedProfessionalId],
    enabled: !!profile?.tenant_id && !!managedProfessionalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_availability_blocks")
        .select("id, start_at, end_at, reason")
        .eq("tenant_id", profile!.tenant_id)
        .eq("professional_user_id", managedProfessionalId!)
        .gte("end_at", new Date().toISOString())
        .order("start_at", { ascending: true })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; start_at: string; end_at: string; reason: string | null }>;
    },
  });

  const { data: futureOpenSlots = [] } = useQuery({
    queryKey: ["future-open-slots", profile?.tenant_id, managedProfessionalId],
    enabled: !!profile?.tenant_id && !!managedProfessionalId,
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("professional_slot_overrides")
        .select("slot_date, slot_time")
        .eq("tenant_id", profile!.tenant_id)
        .eq("professional_user_id", managedProfessionalId!)
        .eq("is_available", true)
        .gte("slot_date", today)
        .order("slot_date", { ascending: true })
        .order("slot_time", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{ slot_date: string; slot_time: string }>;
    },
  });

  const acceptingBookings = managedProfessional?.accepting_bookings ?? true;

  const toggleBulkProfessional = (professionalId: string, checked: boolean) => {
    setBulkProfessionalIds((current) => {
      if (checked) {
        return current.includes(professionalId) ? current : [...current, professionalId];
      }
      return current.filter((id) => id !== professionalId);
    });
  };

  const selectAllProfessionals = () => {
    setBulkProfessionalIds(professionals.map((professional) => professional.user_id));
  };

  const clearBulkProfessionals = () => {
    setBulkProfessionalIds([]);
  };

  useEffect(() => {
    if (!isAdminScope) {
      setBulkProfessionalIds(managedProfessionalId ? [managedProfessionalId] : []);
      return;
    }

    if (bulkProfessionalIds.length === 0 && managedProfessionalId) {
      setBulkProfessionalIds([managedProfessionalId]);
    }
  }, [isAdminScope, managedProfessionalId, bulkProfessionalIds.length]);

  const bookedTimes = useMemo(() => {
    const set = new Set<string>();
    appointments.forEach((apt) => {
      if (apt.status !== "cancelled" && apt.status !== "no_show") {
        set.add(format(new Date(apt.starts_at), "HH:mm"));
      }
    });
    return set;
  }, [appointments]);

  const blockedTimesByPeriod = useMemo(() => {
    const result = new Set<string>();
    const dateStart = new Date(`${slotDate}T00:00:00`);
    const dateEnd = new Date(`${slotDate}T23:59:59`);

    periodBlocks.forEach((block) => {
      const start = new Date(block.start_at);
      const end = new Date(block.end_at);
      if (end < dateStart || start > dateEnd) return;

      timeSlots.forEach((time) => {
        const slotInstant = new Date(`${slotDate}T${time}:00`);
        if (slotInstant >= start && slotInstant < end) {
          result.add(time);
        }
      });
    });

    return result;
  }, [periodBlocks, timeSlots, slotDate]);

  const releasePeriods = useMemo(() => {
    if (futureOpenSlots.length === 0) return [];

    const grouped = new Map<string, Date[]>();
    futureOpenSlots.forEach((slot) => {
      const key = slot.slot_date;
      const slotDateTime = new Date(`${slot.slot_date}T${String(slot.slot_time).slice(0, 5)}:00`);
      const current = grouped.get(key) ?? [];
      current.push(slotDateTime);
      grouped.set(key, current);
    });

    return Array.from(grouped.entries()).flatMap(([dateKey, instants]) => {
      const sorted = instants.sort((a, b) => a.getTime() - b.getTime());
      const periods: Array<{ id: string; start_at: string; end_at: string; reason: string | null }> = [];

      let rangeStart = sorted[0];
      let previous = sorted[0];

      for (let i = 1; i < sorted.length; i++) {
        const current = sorted[i];
        const diffMinutes = (current.getTime() - previous.getTime()) / (60 * 1000);
        if (diffMinutes > slotDuration) {
          periods.push({
            id: `${dateKey}-${rangeStart.toISOString()}`,
            start_at: rangeStart.toISOString(),
            end_at: new Date(previous.getTime() + slotDuration * 60 * 1000).toISOString(),
            reason: "Agenda liberada",
          });
          rangeStart = current;
        }
        previous = current;
      }

      periods.push({
        id: `${dateKey}-${rangeStart.toISOString()}-last`,
        start_at: rangeStart.toISOString(),
        end_at: new Date(previous.getTime() + slotDuration * 60 * 1000).toISOString(),
        reason: "Agenda liberada",
      });

      return periods;
    });
  }, [futureOpenSlots, slotDuration]);

  const pendingPeriodPreview = useMemo(() => {
    if (!blockStart) return null;

    const start = new Date(blockStart);
    const end = blockEnd
      ? new Date(blockEnd)
      : new Date(
          bulkUnit === "hours"
            ? start.getTime() + Math.max(1, Number(bulkAmount) || 1) * 60 * 60 * 1000
            : bulkUnit === "days"
              ? addDays(start, Math.max(1, Number(bulkAmount) || 1)).getTime()
              : bulkUnit === "weeks"
                ? addWeeks(start, Math.max(1, Number(bulkAmount) || 1)).getTime()
                : addMonths(start, Math.max(1, Number(bulkAmount) || 1)).getTime()
        );

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;

    return {
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      label: bulkAction === "close" ? "Bloqueio em análise" : "Liberação em análise",
    };
  }, [blockStart, blockEnd, bulkAmount, bulkUnit, bulkAction]);

  const isPeriodVisible = (startAt: string, endAt: string) => {
    const start = new Date(startAt);
    const end = new Date(endAt);
    const rangeStart = startOfDay(new Date(`${filterStartDate}T00:00:00`));
    const rangeEnd = endOfDay(new Date(`${filterEndDate}T00:00:00`));

    return end >= rangeStart && start <= rangeEnd;
  };

  const visibleReleasePeriods = useMemo(
    () =>
      releasePeriods.filter(
        (period) =>
          isPeriodVisible(period.start_at, period.end_at) &&
          (periodStatusFilter === "all" || periodStatusFilter === "open") &&
          (dayTypeFilter === "all" || getDayType(new Date(period.start_at)) === dayTypeFilter)
      ),
    [releasePeriods, filterStartDate, filterEndDate, periodStatusFilter, dayTypeFilter]
  );

  const visibleBlockedPeriods = useMemo(
    () =>
      periodBlocks.filter(
        (period) =>
          isPeriodVisible(period.start_at, period.end_at) &&
          (periodStatusFilter === "all" || periodStatusFilter === "blocked") &&
          (dayTypeFilter === "all" || getDayType(new Date(period.start_at)) === dayTypeFilter)
      ),
    [periodBlocks, filterStartDate, filterEndDate, periodStatusFilter, dayTypeFilter]
  );

  const visiblePendingPeriod = useMemo(() => {
    if (!pendingPeriodPreview) return null;
    if (periodStatusFilter !== "all" && periodStatusFilter !== "pending") return null;
    if (dayTypeFilter !== "all" && getDayType(new Date(pendingPeriodPreview.start_at)) !== dayTypeFilter) return null;
    return isPeriodVisible(pendingPeriodPreview.start_at, pendingPeriodPreview.end_at)
      ? pendingPeriodPreview
      : null;
  }, [pendingPeriodPreview, filterStartDate, filterEndDate, periodStatusFilter, dayTypeFilter]);

  const handleToggleBookings = async () => {
    if (!managedProfessionalId) return;
    setToggling(true);
    const newValue = !acceptingBookings;

    const { error } = await supabase
      .from("profiles")
      .update({ accepting_bookings: newValue })
      .eq("user_id", managedProfessionalId)
      .eq("tenant_id", profile!.tenant_id);

    if (error) {
      toast.error("Erro ao atualizar disponibilidade geral");
    } else {
      toast.success(newValue ? "Agenda geral aberta" : "Agenda geral fechada");
      queryClient.invalidateQueries({ queryKey: ["my-agenda-professionals"] });
    }
    setToggling(false);
  };

  const handleToggleSlot = async (time: string) => {
    if (!managedProfessionalId || !managedProfessionalName || !profile?.tenant_id || !user?.id) return;

    setSavingSlot(time);
    const defaultAvailability = acceptingBookings;
    const effective = overrideMap.has(time) ? overrideMap.get(time)! : defaultAvailability;
    const nextValue = !effective;

    const { error } = await supabase
      .from("professional_slot_overrides")
      .upsert(
        {
          tenant_id: profile.tenant_id,
          professional_user_id: managedProfessionalId,
          professional_name: managedProfessionalName,
          slot_date: slotDate,
          slot_time: `${time}:00`,
          is_available: nextValue,
          created_by: user.id,
        },
        { onConflict: "tenant_id,professional_user_id,slot_date,slot_time" }
      );

    if (error) {
      toast.error("Erro ao salvar horário");
    } else {
      toast.success(nextValue ? `Horário ${time} liberado` : `Horário ${time} fechado`);
      queryClient.invalidateQueries({ queryKey: ["slot-overrides"] });
    }

    setSavingSlot(null);
  };

  const handleCreateBlock = async () => {
    if (!profile?.tenant_id || !user?.id || resolvedBulkProfessionals.length === 0) {
      toast.error("Selecione ao menos um profissional para aplicar a ação.");
      return;
    }
    if (!blockStart) {
      toast.error("Informe o início da ação.");
      return;
    }

    const startRaw = new Date(blockStart);
    if (Number.isNaN(startRaw.getTime())) {
      toast.error("Informe uma data inicial válida.");
      return;
    }

    const startIso = startRaw.toISOString();
    const startDate = new Date(startIso);
    const amount = Math.max(1, Number(bulkAmount) || 1);
    const endDate = blockEnd
      ? new Date(new Date(blockEnd).toISOString())
      : new Date(
          bulkUnit === "hours"
            ? startDate.getTime() + amount * 60 * 60 * 1000
            : bulkUnit === "days"
              ? addDays(startDate, amount).getTime()
              : bulkUnit === "weeks"
                ? addWeeks(startDate, amount).getTime()
                : addMonths(startDate, amount).getTime()
        );
    const endIso = endDate.toISOString();

    if (new Date(endIso) <= new Date(startIso)) {
      toast.error("O fim deve ser maior que o início.");
      return;
    }

    setBlockSaved(false);
    let actionSaved = false;
    setSavingBlock(true);
    if (bulkAction === "close") {
      const { error } = await supabase.from("professional_availability_blocks").insert(
        resolvedBulkProfessionals.map((professional) => ({
          tenant_id: profile.tenant_id,
          professional_user_id: professional.user_id,
          professional_name: professional.full_name,
          start_at: startIso,
          end_at: endIso,
          reason: blockReason.trim() || null,
          created_by: user.id,
        }))
      );

      if (error) {
        toast.error("Erro ao criar bloqueio", { description: error.message });
      } else {
        toast.success("Bloqueio aplicado com sucesso.");
        setBlockStart("");
        setBlockEnd("");
        setBulkAmount("1");
        setBlockReason("");
        setBlockSaved(true);
        actionSaved = true;
        queryClient.invalidateQueries({ queryKey: ["availability-blocks"] });
      }
    } else {
      const slotsToOpen: Array<{
        tenant_id: string;
        professional_user_id: string;
        professional_name: string;
        slot_date: string;
        slot_time: string;
        is_available: boolean;
        created_by: string;
      }> = [];

      let cursor = new Date(startDate);
      while (cursor < endDate) {
        const dateKey = format(cursor, "yyyy-MM-dd");
        resolvedBulkProfessionals.forEach((professional) => {
          timeSlots.forEach((time) => {
            const slotInstant = new Date(`${dateKey}T${time}:00`);
            if (slotInstant >= startDate && slotInstant < endDate) {
              slotsToOpen.push({
                tenant_id: profile.tenant_id,
                professional_user_id: professional.user_id,
                professional_name: professional.full_name,
                slot_date: dateKey,
                slot_time: `${time}:00`,
                is_available: true,
                created_by: user.id,
              });
            }
          });
        });
        cursor = addDays(cursor, 1);
      }

      if (slotsToOpen.length === 0) {
        toast.error("Nenhum horário encontrado para liberar neste intervalo.");
        setSavingBlock(false);
        return;
      }

      const { error } = await supabase
        .from("professional_slot_overrides")
        .upsert(slotsToOpen, { onConflict: "tenant_id,professional_user_id,slot_date,slot_time" });

      if (error) {
        toast.error("Erro ao liberar agenda", { description: error.message });
      } else {
        toast.success("Agenda liberada para o intervalo selecionado.");
        setBlockStart("");
        setBlockEnd("");
        setBulkAmount("1");
        setBlockReason("");
        setBlockSaved(true);
        actionSaved = true;
        queryClient.invalidateQueries({ queryKey: ["slot-overrides"] });
      }
    }
    setSavingBlock(false);
    if (actionSaved) {
      window.setTimeout(() => setBlockSaved(false), 2500);
    }
  };

  const handleRemoveBlock = async (id: string) => {
    const { error } = await supabase
      .from("professional_availability_blocks")
      .delete()
      .eq("id", id)
      .eq("tenant_id", profile!.tenant_id);

    if (error) {
      toast.error("Erro ao remover bloqueio");
    } else {
      toast.success("Bloqueio removido.");
      queryClient.invalidateQueries({ queryKey: ["availability-blocks"] });
    }
  };

  const handleStatusChange = async (id: string, newStatus: AppointmentStatus) => {
    const { error } = await supabase.from("appointments").update({ status: newStatus }).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar status", { description: error.message });
    } else {
      queryClient.invalidateQueries({ queryKey: ["professional-agenda"] });
      queryClient.invalidateQueries({ queryKey: ["professional-stats"] });
    }
  };

  const handleWhatsAppReminder = async (apt: (typeof appointments)[number]) => {
    const { data: patient } = await supabase
      .from("patients")
      .select("phone")
      .eq("tenant_id", profile!.tenant_id)
      .eq("full_name", apt.patient_name)
      .maybeSingle();

    if (!patient?.phone) {
      toast.error("Paciente sem telefone");
      return;
    }

    const message = buildAppointmentReminder({
      patientName: apt.patient_name,
      date: format(new Date(apt.starts_at), "dd/MM/yyyy"),
      time: format(new Date(apt.starts_at), "HH:mm"),
      professionalName: apt.professional_name,
      type: apt.type,
    });

    const url = buildWhatsAppUrl(patient.phone, message);
    if (url) window.open(url, "_blank");
  };

  const applyPeriodFilters = () => {
    setPeriodStatusFilter(pendingPeriodStatusFilter);
    setDayTypeFilter(pendingDayTypeFilter);
    setFilterStartDate(pendingFilterStartDate);
    setFilterEndDate(pendingFilterEndDate);
  };

  const resetPeriodFilters = () => {
    setPendingPeriodStatusFilter("all");
    setPendingDayTypeFilter("all");
    setPeriodStatusFilter("all");
    setDayTypeFilter("all");
    const today = format(new Date(), "yyyy-MM-dd");
    const nextWeek = format(addDays(new Date(), 7), "yyyy-MM-dd");
    setPendingFilterStartDate(today);
    setPendingFilterEndDate(nextWeek);
    setFilterStartDate(today);
    setFilterEndDate(nextWeek);
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-4xl space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Gestão da Agenda</h1>
              <p className="text-sm text-muted-foreground">
                {managedProfessionalName ?? "Profissional"} | {isToday(selectedDate) ? "Hoje" : format(selectedDate, "dd/MM/yyyy")}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <span className="text-xs text-muted-foreground">Agenda geral</span>
              <Badge variant={acceptingBookings ? "default" : "outline"}>{acceptingBookings ? "Aberta" : "Fechada"}</Badge>
              <Switch checked={acceptingBookings} onCheckedChange={handleToggleBookings} disabled={toggling || resolvedBulkProfessionals.length === 0} />
            </div>
          </div>

          {isAdminScope && (
            <div className="max-w-sm">
              <Select value={managedProfessionalId ?? ""} onValueChange={setSelectedProfessionalId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar profissional" />
                </SelectTrigger>
                <SelectContent>
                  {professionals.map((prof) => (
                    <SelectItem key={prof.user_id} value={prof.user_id}>
                      <div className="flex flex-col py-1">
                        <span className="font-medium text-foreground">{prof.full_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {prof.phone || "WhatsApp não informado"} | {prof.email || "E-mail não informado"}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {!isAdminScope && managedProfessionalName && (
            <div className="rounded-lg border border-border bg-secondary/20 px-3 py-2 text-sm text-muted-foreground">
              Pesquisa e gestÃ£o aplicadas automaticamente Ã  agenda de <span className="font-medium text-foreground">{managedProfessionalName}</span>.
            </div>
          )}
          {!isAdminScope && resolvedBulkProfessionals.length === 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
              Seu perfil profissional ainda não foi vinculado corretamente à agenda. Atualize a equipe ou o cadastro para liberar bloqueios e liberações.
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Atendimentos" value={stats?.total ?? 0} loading={isLoading} />
          <StatCard label="Disponíveis" value={stats?.available ?? 0} loading={isLoading} />
          <StatCard label="Agendadas" value={stats?.pending ?? 0} loading={isLoading} />
          <StatCard label="Confirmadas" value={stats?.confirmed ?? 0} loading={isLoading} />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedDate((d) => subDays(d, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button className="text-sm font-semibold capitalize" onClick={() => setSelectedDate(new Date())}>
            {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </button>
          <Button variant="ghost" size="icon" onClick={() => setSelectedDate((d) => addDays(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">Liberar/fechar dias e horários</h2>
            <p className="text-xs text-muted-foreground">{format(selectedDate, "dd/MM/yyyy")}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {timeSlots.map((time) => {
              const override = overrideMap.get(time);
              const blockedByPeriod = blockedTimesByPeriod.has(time);
              const effective = blockedByPeriod ? false : (override ?? acceptingBookings);
              const busy = bookedTimes.has(time);
              return (
                <Button
                  key={time}
                  variant={effective ? "outline" : "secondary"}
                  size="sm"
                  disabled={savingSlot === time || blockedByPeriod}
                  className={effective ? "border-emerald-300 text-emerald-700" : "border-destructive/40 text-destructive"}
                  onClick={() => handleToggleSlot(time)}
                >
                  {time}{busy ? " *" : ""}{blockedByPeriod ? " !" : ""}
                </Button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">* horário com consulta registrada | ! bloqueado por período.</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-bold">Liberar ou bloquear por horário, dia, semana ou mês</h2>
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700">Liberado</Badge>
            <Badge className="border-rose-200 bg-rose-100 text-rose-700">Bloqueado</Badge>
            <Badge className="border-amber-200 bg-amber-100 text-amber-700">Não analisado</Badge>
          </div>
          {isAdminScope && (
            <div className="mb-4 space-y-3 rounded-lg border border-border bg-secondary/20 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Profissionais da ação em massa</p>
                  <p className="text-xs text-muted-foreground">Selecione um ou mais profissionais para liberar ou bloquear a agenda.</p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={selectAllProfessionals}>
                    Marcar todos
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={clearBulkProfessionals}>
                    Limpar
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {professionals.map((professional) => {
                  const checked = effectiveBulkProfessionalIds.includes(professional.user_id);
                  return (
                    <label
                      key={professional.user_id}
                      className="flex items-start gap-3 rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => toggleBulkProfessional(professional.user_id, value === true)}
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{professional.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          WhatsApp: {professional.phone || "não informado"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          E-mail: {professional.email || "não informado"}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bulk-action">Ação</Label>
              <Select value={bulkAction} onValueChange={(value) => setBulkAction(value as BulkActionType)}>
                <SelectTrigger id="bulk-action">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="close">Bloquear agenda</SelectItem>
                  <SelectItem value="open">Liberar agenda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="block-start">Início</Label>
              <Input
                id="block-start"
                type="datetime-local"
                value={blockStart}
                onChange={(e) => setBlockStart(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="block-end">Fim</Label>
              <Input
                id="block-end"
                type="datetime-local"
                value={blockEnd}
                min={blockStart || undefined}
                onChange={(e) => setBlockEnd(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-amount">Quantidade</Label>
              <Input
                id="bulk-amount"
                type="number"
                min={1}
                value={bulkAmount}
                onChange={(e) => setBulkAmount(e.target.value)}
                disabled={!!blockEnd}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-unit">Período</Label>
              <Select value={bulkUnit} onValueChange={(value) => setBulkUnit(value as BulkUnit)}>
                <SelectTrigger id="bulk-unit" disabled={!!blockEnd}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hours">Hora(s)</SelectItem>
                  <SelectItem value="days">Dia(s)</SelectItem>
                  <SelectItem value="weeks">Semana(s)</SelectItem>
                  <SelectItem value="months">Mês(es)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Informe o fim para definir a data e o horário exatos. Se deixar em branco, o sistema calculará o intervalo pela quantidade e pelo período.
          </p>
          <div className="mt-3 space-y-2">
            <Label htmlFor="block-reason">Motivo (opcional)</Label>
            <Textarea
              id="block-reason"
              rows={2}
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Férias, almoço, evento, indisponível..."
            />
          </div>
          <div className="mt-3">
            <Button
              size="sm"
              variant={blockSaved ? "secondary" : "default"}
              onClick={handleCreateBlock}
              disabled={savingBlock || resolvedBulkProfessionals.length === 0}
            >
              {savingBlock ? "Salvando..." : blockSaved ? "Salvo" : bulkAction === "close" ? "Salvar bloqueio" : "Salvar liberação"}
            </Button>
            {blockSaved && (
              <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Intervalo salvo com sucesso.
              </p>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-xs font-semibold text-muted-foreground">Períodos da agenda</p>
              <div className="grid gap-2 sm:grid-cols-4 lg:w-[860px]">
                <Input
                  type="date"
                  value={pendingFilterStartDate}
                  onChange={(e) => setPendingFilterStartDate(e.target.value)}
                  max={pendingFilterEndDate || undefined}
                  className="h-8 text-xs"
                />
                <Input
                  type="date"
                  value={pendingFilterEndDate}
                  onChange={(e) => setPendingFilterEndDate(e.target.value)}
                  min={pendingFilterStartDate || undefined}
                  className="h-8 text-xs"
                />
                <Select value={pendingPeriodStatusFilter} onValueChange={(value) => setPendingPeriodStatusFilter(value as PeriodStatusFilter)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Tipo da pesquisa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="open">Liberado</SelectItem>
                    <SelectItem value="blocked">Bloqueado</SelectItem>
                    <SelectItem value="pending">Não analisado</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={pendingDayTypeFilter} onValueChange={(value) => setPendingDayTypeFilter(value as DayTypeFilter)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Tipo de dia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os dias</SelectItem>
                    <SelectItem value="monday">Segunda-feira</SelectItem>
                    <SelectItem value="tuesday">Terça-feira</SelectItem>
                    <SelectItem value="wednesday">Quarta-feira</SelectItem>
                    <SelectItem value="thursday">Quinta-feira</SelectItem>
                    <SelectItem value="friday">Sexta-feira</SelectItem>
                    <SelectItem value="saturday">Sábado</SelectItem>
                    <SelectItem value="sunday">Domingo</SelectItem>
                    <SelectItem value="holiday">Feriados nacionais</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 lg:justify-end">
                <Button type="button" size="sm" variant="outline" onClick={resetPeriodFilters}>
                  Limpar
                </Button>
                <Button type="button" size="sm" onClick={applyPeriodFilters}>
                  OK
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Primeiro selecione a data inicial e a data final. Depois escolha o tipo da pesquisa: bloqueado, liberado ou não analisado.
            </p>
            {visiblePendingPeriod && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                      {format(new Date(visiblePendingPeriod.start_at), "dd/MM HH:mm")} {" -> "} {format(new Date(visiblePendingPeriod.end_at), "dd/MM HH:mm")}
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      {visiblePendingPeriod.label} | <span className={getDayTypeAccentClass(getDayType(new Date(visiblePendingPeriod.start_at)))}>{getReadableDayTypeLabel(getDayType(new Date(visiblePendingPeriod.start_at)))}</span>
                    </p>
                  </div>
                  <Badge className="border-amber-200 bg-amber-100 text-amber-700">Não analisado</Badge>
                </div>
              </div>
            )}
            {visibleReleasePeriods.map((period) => (
              <div key={period.id} className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                      {format(new Date(period.start_at), "dd/MM HH:mm")} {" -> "} {format(new Date(period.end_at), "dd/MM HH:mm")}
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      {period.reason} | <span className={getDayTypeAccentClass(getDayType(new Date(period.start_at)))}>{getReadableDayTypeLabel(getDayType(new Date(period.start_at)))}</span>
                    </p>
                  </div>
                  <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700">Liberado</Badge>
                </div>
              </div>
            ))}
            {visibleBlockedPeriods.map((block) => (
              <div key={block.id} className="flex items-center justify-between rounded-md border border-rose-200 bg-rose-50 px-3 py-2 dark:border-rose-900/50 dark:bg-rose-950/20">
                <div>
                  <p className="text-xs font-medium text-rose-800 dark:text-rose-300">
                    {format(new Date(block.start_at), "dd/MM HH:mm")} {" -> "} {format(new Date(block.end_at), "dd/MM HH:mm")}
                  </p>
                  <p className="text-[11px] text-rose-700 dark:text-rose-400">
                    {(block.reason || "Sem motivo informado")} | <span className={getDayTypeAccentClass(getDayType(new Date(block.start_at)))}>{getReadableDayTypeLabel(getDayType(new Date(block.start_at)))}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="border-rose-200 bg-rose-100 text-rose-700">Bloqueado</Badge>
                  <Button size="icon" variant="ghost" onClick={() => handleRemoveBlock(block.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {visibleBlockedPeriods.length === 0 && visibleReleasePeriods.length === 0 && !visiblePendingPeriod && (
              <p className="text-xs text-muted-foreground">Nenhum período cadastrado.</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : appointments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhuma consulta para este dia.
            </div>
          ) : (
            appointments.map((apt) => {
              const action = statusActions.find((a) => a.from === apt.status);
              return (
                <div key={apt.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{apt.patient_name}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(apt.starts_at), "HH:mm")} {apt.type ? `| ${apt.type}` : ""}</p>
                    </div>
                    <StatusChip status={apt.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {action && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(apt.id, action.to)}>
                        {action.label}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleWhatsAppReminder(apt)}>
                      <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> WhatsApp
                    </Button>
                  </div>
                  {apt.notes && <p className="mt-2 text-xs text-muted-foreground">{apt.notes}</p>}
                  {apt.audio_note_path && (
                    <div className="mt-2">
                      <AppointmentAudioPlayer audioPath={apt.audio_note_path} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

const StatCard = ({ label, value, loading }: { label: string; value: number; loading: boolean }) => (
  <div className="rounded-xl border border-border bg-card p-3 text-center">
    {loading ? <Skeleton className="mx-auto h-7 w-10" /> : <p className="text-2xl font-extrabold">{value}</p>}
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

export default MinhaAgenda;
