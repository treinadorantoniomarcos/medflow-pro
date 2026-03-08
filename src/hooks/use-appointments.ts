import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { addDays, addMonths, addYears, endOfDay, format, startOfDay } from "date-fns";
import type { AppointmentStatus } from "@/components/dashboard/StatusChip";
import type { Appointment } from "@/components/dashboard/AppointmentRow";

export type DashboardPeriod =
  | "today"
  | "week"
  | "15days"
  | "month"
  | "bimester"
  | "semester"
  | "year";

function getPeriodRange(period: DashboardPeriod) {
  const now = new Date();
  const start = startOfDay(now);

  switch (period) {
    case "today":
      return { start, end: endOfDay(now) };
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
      return { start, end: endOfDay(now) };
  }
}

function useAppointmentsRealtime() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!profile?.tenant_id) return;

    const channel = supabase
      .channel(`appointments-dashboard-${profile.tenant_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["appointments"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
          queryClient.invalidateQueries({ queryKey: ["professional-agenda"] });
          queryClient.invalidateQueries({ queryKey: ["professional-stats"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.tenant_id, queryClient]);
}

export const useAppointmentsByPeriod = (period: DashboardPeriod) => {
  const { profile } = useAuth();
  useAppointmentsRealtime();
  const { start, end } = getPeriodRange(period);

  return useQuery({
    queryKey: ["appointments", "period", period, profile?.tenant_id, start.toISOString(), end.toISOString()],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("tenant_id", profile!.tenant_id)
        .gte("starts_at", start.toISOString())
        .lte("starts_at", end.toISOString())
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

export const useDashboardMetrics = (period: DashboardPeriod) => {
  const { profile } = useAuth();
  useAppointmentsRealtime();
  const { start, end } = getPeriodRange(period);

  return useQuery({
    queryKey: ["dashboard-metrics", period, profile?.tenant_id, start.toISOString(), end.toISOString()],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const rangeStart = start.toISOString();
      const rangeEnd = end.toISOString();

      // Appointments count in selected period
      const { count: todayCount } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", profile!.tenant_id)
        .gte("starts_at", rangeStart)
        .lte("starts_at", rangeEnd);

      // Available slots
      const { count: availableCount } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", profile!.tenant_id)
        .eq("status", "available")
        .gte("starts_at", rangeStart)
        .lte("starts_at", rangeEnd);

      // Pending (scheduled, not confirmed)
      const { count: pendingCount } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", profile!.tenant_id)
        .eq("status", "scheduled")
        .gte("starts_at", rangeStart)
        .lte("starts_at", rangeEnd);

      return {
        todayCount: todayCount ?? 0,
        availableCount: availableCount ?? 0,
        pendingCount: pendingCount ?? 0,
      };
    },
  });
};
