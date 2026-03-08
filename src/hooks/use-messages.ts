import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Message {
  id: string;
  tenant_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

export const useMessages = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["messages", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("tenant_id", profile!.tenant_id)
        .order("created_at", { ascending: true })
        .limit(200);

      if (error) throw error;
      return (data ?? []) as Message[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!profile?.tenant_id) return;

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        (payload) => {
          queryClient.setQueryData<Message[]>(
            ["messages", profile.tenant_id],
            (old) => [...(old ?? []), payload.new as Message]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.tenant_id, queryClient]);

  return query;
};

export const useSendMessage = () => {
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (content: string) => {
      if (!user || !profile?.tenant_id || !profile.full_name) {
        throw new Error("Not authenticated");
      }

      const { error } = await supabase.from("messages").insert({
        tenant_id: profile.tenant_id,
        sender_id: user.id,
        sender_name: profile.full_name,
        content: content.trim(),
      });

      if (error) throw error;
    },
  });
};

export const useTeamMembers = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["team-members", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .eq("tenant_id", profile!.tenant_id)
        .order("full_name", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
};
