import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfDay, endOfDay, format } from "date-fns";
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
}

export const useWeekAppointments = (weekStart: Date, weekEnd: Date) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["appointments", "week", profile?.tenant_id, weekStart.toISOString(), weekEnd.toISOString()],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, patient_name, professional_name, starts_at, ends_at, status, type, notes")
        .eq("tenant_id", profile!.tenant_id)
        .gte("starts_at", startOfDay(weekStart).toISOString())
        .lte("starts_at", endOfDay(weekEnd).toISOString())
        .order("starts_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as AgendaAppointment[];
    },
  });
};

export const useProfessionals = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["professionals", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("professional_name")
        .eq("tenant_id", profile!.tenant_id);

      if (error) throw error;

      const unique = [...new Set((data ?? []).map((d) => d.professional_name))].sort();
      return unique;
    },
  });
};
