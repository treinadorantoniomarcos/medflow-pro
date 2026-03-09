import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { addDays, addMonths, addYears, endOfDay, startOfDay } from "date-fns";
import type { AppointmentStatus } from "@/components/dashboard/StatusChip";

export interface AgendaAppointment {
  id: string;
  patient_name: string;
  professional_name: string;
  starts_at: string;
  ends_at: string | null;
  status: AppointmentStatus;
  type: string | null;
  notes: string | null;
  audio_note_path: string | null;
}

export type AgendaPeriod =
  | "today"
  | "week"
  | "15days"
  | "month"
  | "bimester"
  | "semester"
  | "year";

function getPeriodRange(period: AgendaPeriod, baseDate: Date) {
  const start = startOfDay(baseDate);

  switch (period) {
    case "today":
      return { start, end: endOfDay(baseDate) };
    case "week":
      return { start, end: endOfDay(addDays(start, 6)) };
    case "15days":
      return { start, end: endOfDay(addDays(start, 14)) };
    case "month":
      return { start, end: endOfDay(addMonths(start, 1)) };
    case "bimester":
      return { start, end: endOfDay(addMonths(start, 2)) };
    case "semester":
      return { start, end: endOfDay(addMonths(start, 6)) };
    case "year":
      return { start, end: endOfDay(addYears(start, 1)) };
    default:
      return { start, end: endOfDay(addDays(start, 6)) };
  }
}

export const useWeekAppointments = (weekStart: Date, weekEnd: Date) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["appointments", "week", profile?.tenant_id, weekStart.toISOString(), weekEnd.toISOString()],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, patient_name, professional_name, starts_at, ends_at, status, type, notes, audio_note_path")
        .eq("tenant_id", profile!.tenant_id)
        .gte("starts_at", startOfDay(weekStart).toISOString())
        .lte("starts_at", endOfDay(weekEnd).toISOString())
        .order("starts_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as AgendaAppointment[];
    },
  });
};

export interface ProfessionalInfo {
  name: string;
  accepting_bookings: boolean;
}

export const useProfessionals = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["professionals", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      // Get professionals from profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("full_name, accepting_bookings")
        .eq("tenant_id", profile!.tenant_id);

      // Also get unique names from appointments as fallback
      const { data: appts } = await supabase
        .from("appointments")
        .select("professional_name")
        .eq("tenant_id", profile!.tenant_id);

      const profileMap = new Map<string, boolean>();
      (profiles ?? []).forEach((p) => {
        if (p.full_name) profileMap.set(p.full_name, p.accepting_bookings);
      });

      const apptNames = [...new Set((appts ?? []).map((d) => d.professional_name))];
      apptNames.forEach((name) => {
        if (!profileMap.has(name)) profileMap.set(name, true);
      });

      const result: ProfessionalInfo[] = Array.from(profileMap.entries())
        .map(([name, accepting_bookings]) => ({ name, accepting_bookings }))
        .sort((a, b) => a.name.localeCompare(b.name));

      return result;
    },
  });
};

export const useAgendaAppointments = (period: AgendaPeriod, baseDate: Date) => {
  const { profile } = useAuth();
  const { start, end } = getPeriodRange(period, baseDate);

  return useQuery({
    queryKey: [
      "appointments",
      "agenda-period",
      period,
      profile?.tenant_id,
      start.toISOString(),
      end.toISOString(),
    ],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, patient_name, professional_name, starts_at, ends_at, status, type, notes, audio_note_path")
        .eq("tenant_id", profile!.tenant_id)
        .gte("starts_at", start.toISOString())
        .lte("starts_at", end.toISOString())
        .order("starts_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as AgendaAppointment[];
    },
  });
};
