import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Message {
  attachment_mime_type?: string | null;
  attachment_name?: string | null;
  attachment_path?: string | null;
  id: string;
  tenant_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

interface SendMessageInput {
  content: string;
  file?: File | null;
}

export const useMessages = () => {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const hasInitialized = useRef(false);

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
    if (query.data) {
      hasInitialized.current = true;
    }
  }, [query.data]);

  useEffect(() => {
    if (!profile?.tenant_id || !user?.id) return;

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
          const incoming = payload.new as Message;
          queryClient.setQueryData<Message[]>(
            ["messages", profile.tenant_id],
            (old) => [...(old ?? []), incoming]
          );

          if (hasInitialized.current && incoming.sender_id !== user.id) {
            toast.info("Nova mensagem no chat", {
              description: `${incoming.sender_name}: ${incoming.content || incoming.attachment_name || "Arquivo enviado"}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.tenant_id, queryClient, user?.id]);

  return query;
};

export const useSendMessage = () => {
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ content, file }: SendMessageInput) => {
      if (!user || !profile?.tenant_id || !profile.full_name) {
        throw new Error("Not authenticated");
      }

      if (!content.trim() && !file) {
        throw new Error("Mensagem vazia");
      }

      let attachmentPath: string | null = null;
      let attachmentName: string | null = null;
      let attachmentMimeType: string | null = null;

      if (file) {
        if (file.size > 15 * 1024 * 1024) {
          throw new Error("O arquivo deve ter no máximo 15MB.");
        }

        const extension = file.name.split(".").pop() ?? "bin";
        attachmentPath = `${profile.tenant_id}/${user.id}/${crypto.randomUUID()}.${extension}`;
        attachmentName = file.name;
        attachmentMimeType = file.type || "application/octet-stream";

        const { error: uploadError } = await supabase.storage
          .from("message-attachments")
          .upload(attachmentPath, file, { upsert: false });

        if (uploadError) throw uploadError;
      }

      const { error } = await supabase.from("messages").insert({
        tenant_id: profile.tenant_id,
        sender_id: user.id,
        sender_name: profile.full_name,
        content: content.trim(),
        attachment_name: attachmentName,
        attachment_path: attachmentPath,
        attachment_mime_type: attachmentMimeType,
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
