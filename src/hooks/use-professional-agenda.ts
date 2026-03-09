import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfDay, endOfDay } from "date-fns";
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
  audio_note_path: string | null;
  patient_avatar_url?: string | null;
}

export const useProfessionalAgenda = (date: Date) => {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!profile?.tenant_id) return;

    const channel = supabase
      .channel(`professional-agenda-${profile.tenant_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["professional-agenda"] });
          queryClient.invalidateQueries({ queryKey: ["professional-stats"] });
          queryClient.invalidateQueries({ queryKey: ["appointments"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.tenant_id, queryClient]);

  return useQuery({
    queryKey: ["professional-agenda", profile?.tenant_id, profile?.full_name, date.toISOString()],
    enabled: !!profile?.tenant_id && (!!profile?.full_name || !!user?.id),
    queryFn: async () => {
      const start = startOfDay(date).toISOString();
      const end = endOfDay(date).toISOString();

      const { data, error } = await supabase
        .from("appointments")
        .select("id, patient_name, professional_name, starts_at, ends_at, status, type, notes, audio_note_path")
        .eq("tenant_id", profile!.tenant_id)
        .eq("professional_user_id", user!.id)
        .gte("starts_at", start)
        .lte("starts_at", end)
        .order("starts_at", { ascending: true });

      if (error) throw error;
      if ((data ?? []).length > 0 || !profile?.full_name) {
        return (data ?? []) as ProfessionalAppointment[];
      }

      const { data: legacyData, error: legacyError } = await supabase
        .from("appointments")
        .select("id, patient_name, professional_name, starts_at, ends_at, status, type, notes, audio_note_path")
        .eq("tenant_id", profile.tenant_id)
        .eq("professional_name", profile.full_name)
        .gte("starts_at", start)
        .lte("starts_at", end)
        .order("starts_at", { ascending: true });

      if (legacyError) throw legacyError;
      return (legacyData ?? []) as ProfessionalAppointment[];
    },
  });
};

export const useProfessionalStats = (date: Date) => {
  const { profile, user } = useAuth();

  return useQuery({
    queryKey: ["professional-stats", profile?.tenant_id, profile?.full_name, date.toISOString()],
    enabled: !!profile?.tenant_id && (!!profile?.full_name || !!user?.id),
    queryFn: async () => {
      const start = startOfDay(date).toISOString();
      const end = endOfDay(date).toISOString();

      const { data, error } = await supabase
        .from("appointments")
        .select("status")
        .eq("tenant_id", profile!.tenant_id)
        .eq("professional_user_id", user!.id)
        .gte("starts_at", start)
        .lte("starts_at", end);

      if (error) throw error;
      let rows = data ?? [];
      if (rows.length === 0 && profile?.full_name) {
        const { data: legacyData, error: legacyError } = await supabase
          .from("appointments")
          .select("status")
          .eq("tenant_id", profile.tenant_id)
          .eq("professional_name", profile.full_name)
          .gte("starts_at", start)
          .lte("starts_at", end);

        if (legacyError) throw legacyError;
        rows = legacyData ?? [];
      }

      return {
        total: rows.length,
        confirmed: rows.filter((r) => r.status === "confirmed").length,
        completed: rows.filter((r) => r.status === "completed").length,
        pending: rows.filter((r) => r.status === "scheduled").length,
        inProgress: rows.filter((r) => r.status === "in_progress").length,
        available: rows.filter((r) => r.status === "available").length,
        cancelled: rows.filter((r) => r.status === "cancelled" || r.status === "no_show").length,
      };
    },
  });
};
