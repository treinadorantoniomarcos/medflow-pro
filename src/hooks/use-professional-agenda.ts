import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfDay, endOfDay, addDays, format } from "date-fns";
import type { AppointmentStatus } from "@/components/dashboard/StatusChip";

export interface ProfessionalAppointment {
  id: string;
  patient_name: string;
  professional_name: string;
  starts_at: string;
  ends_at: string | null;
  status: AppointmentStatus;
  type: string | null;
  notes: string | null;
}

export const useProfessionalAgenda = (date: Date) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["professional-agenda", profile?.tenant_id, profile?.full_name, date.toISOString()],
    enabled: !!profile?.tenant_id && !!profile?.full_name,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, patient_name, professional_name, starts_at, ends_at, status, type, notes")
        .eq("tenant_id", profile!.tenant_id)
        .eq("professional_name", profile!.full_name!)
        .gte("starts_at", startOfDay(date).toISOString())
        .lte("starts_at", endOfDay(date).toISOString())
        .order("starts_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as ProfessionalAppointment[];
    },
  });
};

export const useProfessionalStats = (date: Date) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["professional-stats", profile?.tenant_id, profile?.full_name, date.toISOString()],
    enabled: !!profile?.tenant_id && !!profile?.full_name,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("status")
        .eq("tenant_id", profile!.tenant_id)
        .eq("professional_name", profile!.full_name!)
        .gte("starts_at", startOfDay(date).toISOString())
        .lte("starts_at", endOfDay(date).toISOString());

      if (error) throw error;

      const rows = data ?? [];
      return {
        total: rows.length,
        confirmed: rows.filter((r) => r.status === "confirmed").length,
        completed: rows.filter((r) => r.status === "completed").length,
        pending: rows.filter((r) => r.status === "scheduled").length,
        inProgress: rows.filter((r) => r.status === "in_progress").length,
      };
    },
  });
};
