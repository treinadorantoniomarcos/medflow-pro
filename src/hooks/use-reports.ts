import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfMonth, endOfMonth, subMonths, format, eachDayOfInterval, startOfDay } from "date-fns";

export interface DailyCount {
  date: string;
  count: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface ProfessionalCount {
  professional_name: string;
  count: number;
}

export const useReportData = (monthsBack: number = 0) => {
  const { profile } = useAuth();

  const targetMonth = subMonths(new Date(), monthsBack);
  const from = startOfMonth(targetMonth);
  const to = endOfMonth(targetMonth);

  const baseQuery = {
    enabled: !!profile?.tenant_id,
  };

  // Daily appointment counts
  const dailyCounts = useQuery({
    ...baseQuery,
    queryKey: ["report-daily", profile?.tenant_id, from.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("starts_at")
        .eq("tenant_id", profile!.tenant_id)
        .gte("starts_at", from.toISOString())
        .lte("starts_at", to.toISOString())
        .order("starts_at", { ascending: true });

      if (error) throw error;

      // Group by day
      const days = eachDayOfInterval({ start: from, end: to });
      const countMap = new Map<string, number>();
      days.forEach((d) => countMap.set(format(d, "yyyy-MM-dd"), 0));

      (data ?? []).forEach((row) => {
        const key = format(new Date(row.starts_at), "yyyy-MM-dd");
        countMap.set(key, (countMap.get(key) ?? 0) + 1);
      });

      return Array.from(countMap.entries()).map(([date, count]) => ({
        date,
        label: format(new Date(date + "T12:00:00"), "dd"),
        count,
      }));
    },
  });

  // Status distribution
  const statusCounts = useQuery({
    ...baseQuery,
    queryKey: ["report-status", profile?.tenant_id, from.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("status")
        .eq("tenant_id", profile!.tenant_id)
        .gte("starts_at", from.toISOString())
        .lte("starts_at", to.toISOString());

      if (error) throw error;

      const countMap = new Map<string, number>();
      (data ?? []).forEach((row) => {
        countMap.set(row.status, (countMap.get(row.status) ?? 0) + 1);
      });

      return Array.from(countMap.entries())
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count);
    },
  });

  // Professional distribution
  const professionalCounts = useQuery({
    ...baseQuery,
    queryKey: ["report-professional", profile?.tenant_id, from.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("professional_name")
        .eq("tenant_id", profile!.tenant_id)
        .gte("starts_at", from.toISOString())
        .lte("starts_at", to.toISOString());

      if (error) throw error;

      const countMap = new Map<string, number>();
      (data ?? []).forEach((row) => {
        countMap.set(row.professional_name, (countMap.get(row.professional_name) ?? 0) + 1);
      });

      return Array.from(countMap.entries())
        .map(([professional_name, count]) => ({ professional_name, count }))
        .sort((a, b) => b.count - a.count);
    },
  });

  // Total count for the period
  const total = (dailyCounts.data ?? []).reduce((sum, d) => sum + d.count, 0);

  return {
    dailyCounts,
    statusCounts,
    professionalCounts,
    total,
    from,
    to,
    isLoading: dailyCounts.isLoading || statusCounts.isLoading || professionalCounts.isLoading,
  };
};
