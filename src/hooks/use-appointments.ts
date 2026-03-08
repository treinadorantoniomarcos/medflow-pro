import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfDay, endOfDay, format } from "date-fns";
import type { AppointmentStatus } from "@/components/dashboard/StatusChip";
import type { Appointment } from "@/components/dashboard/AppointmentRow";

export const useTodayAppointments = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["appointments", "today", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const now = new Date();
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("tenant_id", profile!.tenant_id)
        .gte("starts_at", startOfDay(now).toISOString())
        .lte("starts_at", endOfDay(now).toISOString())
        .order("starts_at", { ascending: true });

      if (error) throw error;

      return (data ?? []).map((row): Appointment => {
        const initials = row.patient_name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();

        return {
          id: row.id,
          time: format(new Date(row.starts_at), "HH:mm"),
          patientName: row.patient_name,
          patientInitials: initials,
          type: row.type || "Consulta",
          status: row.status as AppointmentStatus,
          alert: row.notes ?? undefined,
        };
      });
    },
  });
};

export const useDashboardMetrics = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["dashboard-metrics", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const now = new Date();
      const todayStart = startOfDay(now).toISOString();
      const todayEnd = endOfDay(now).toISOString();

      // Today's appointments count
      const { count: todayCount } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", profile!.tenant_id)
        .gte("starts_at", todayStart)
        .lte("starts_at", todayEnd);

      // Available slots
      const { count: availableCount } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", profile!.tenant_id)
        .eq("status", "available")
        .gte("starts_at", todayStart)
        .lte("starts_at", todayEnd);

      // Pending (agendada, not confirmed)
      const { count: pendingCount } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", profile!.tenant_id)
        .eq("status", "agendada")
        .gte("starts_at", todayStart)
        .lte("starts_at", todayEnd);

      return {
        todayCount: todayCount ?? 0,
        availableCount: availableCount ?? 0,
        pendingCount: pendingCount ?? 0,
      };
    },
  });
};
