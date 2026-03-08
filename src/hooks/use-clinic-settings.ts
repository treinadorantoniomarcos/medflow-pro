import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ClinicSettings {
  whatsapp_reminders_enabled?: boolean;
  reminder_hours_before?: number;
}

export const useClinicSettings = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["clinic-settings", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinics")
        .select("settings")
        .eq("id", profile!.tenant_id)
        .single();

      if (error) throw error;
      return (data?.settings as ClinicSettings | null) ?? {};
    },
  });
};

export const useUpdateClinicSettings = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newSettings: Partial<ClinicSettings>) => {
      // Merge with existing
      const { data: clinic, error: fetchErr } = await supabase
        .from("clinics")
        .select("settings")
        .eq("id", profile!.tenant_id)
        .single();

      if (fetchErr) throw fetchErr;

      const merged = { ...((clinic?.settings as ClinicSettings) ?? {}), ...newSettings };

      const { error } = await supabase
        .from("clinics")
        .update({ settings: merged as any })
        .eq("id", profile!.tenant_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-settings"] });
      toast.success("Configurações salvas!");
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar", { description: err.message });
    },
  });
};

export const useNotificationsQueue = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["notifications-queue", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications_queue")
        .select("*")
        .eq("tenant_id", profile!.tenant_id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data ?? [];
    },
  });
};
