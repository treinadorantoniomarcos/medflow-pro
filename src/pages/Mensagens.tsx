import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Download, MessageSquare, Paperclip, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMessages, useSendMessage, useTeamMembers } from "@/hooks/use-messages";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AudioRecorderButton from "@/components/ui/audio-recorder-button";

type AppRole = "owner" | "admin" | "professional" | "receptionist" | "patient" | "super_admin";

const GROUP_CHAT_ID = "__group__";

const Mensagens = () => {
  const { user, profile } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<string>(GROUP_CHAT_ID);
  const selectedRecipientId = selectedConversation === GROUP_CHAT_ID ? null : selectedConversation;
  const { data: messages = [], isLoading } = useMessages(selectedRecipientId);
  const { data: members = [] } = useTeamMembers();
  const sendMessage = useSendMessage();
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: role } = useQuery({
    queryKey: ["messages-role", user?.id, profile?.tenant_id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, tenant_id")
        .eq("user_id", user!.id);
      if (error) throw error;

      const roles = (data ?? []) as Array<{ role: AppRole; tenant_id: string }>;
      if (roles.some((item) => item.role === "super_admin")) return "super_admin";
      const scoped = roles.find((item) => item.tenant_id === profile?.tenant_id);
      return scoped?.role ?? null;
    },
  });

  const canSelectRecipient = role === "owner" || role === "admin" || role === "professional";
  const availableRecipients = useMemo(
    () => members.filter((member) => member.user_id !== user?.id),
    [members, user?.id]
  );
  const selectedRecipient = availableRecipients.find((member) => member.user_id === selectedRecipientId) ?? null;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !attachment) return;

    try {
      await sendMessage.mutateAsync({
        content: input,
        file: attachment,
        recipientId: selectedRecipient?.user_id ?? null,
        recipientName: selectedRecipient?.full_name ?? null,
      });
      setInput("");
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      inputRef.current?.focus();
    } catch (err: any) {
      toast.error("Erro ao enviar mensagem", { description: err.message });
    }
  };

  const groupedMessages = messages.reduce<{ date: string; label: string; messages: typeof messages }[]>(
    (groups, msg) => {
      const d = new Date(msg.created_at);
      const dateKey = format(d, "yyyy-MM-dd");
      const existing = groups.find((g) => g.date === dateKey);

      const label = isToday(d)
        ? "Hoje"
        : isYesterday(d)
          ? "Ontem"
          : format(d, "dd 'de' MMMM", { locale: ptBR });

      if (existing) {
        existing.messages.push(msg);
      } else {
        groups.push({ date: dateKey, label, messages: [msg] });
      }
      return groups;
    },
    []
  );

  return (
    <AdminLayout>
      <div className="flex h-[calc(100vh-7rem)] gap-4">
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden w-[240px] shrink-0 flex-col rounded-lg border border-border bg-card shadow-soft md:flex"
        >
          <div className="flex items-center gap-2 border-b border-border p-3">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Conversas</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{availableRecipients.length}</span>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-1 p-2">
              <button
                type="button"
                onClick={() => setSelectedConversation(GROUP_CHAT_ID)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left",
                  selectedConversation === GROUP_CHAT_ID ? "bg-primary/10 text-primary" : "hover:bg-secondary"
                )}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  GR
                </div>
                <div>
                  <p className="text-xs font-semibold">Grupo da equipe</p>
                  <p className="text-[10px] text-muted-foreground">Mensagem para todos</p>
                </div>
              </button>

              {availableRecipients.map((member) => {
                const initials = member.full_name
                  ?.split(" ")
                  .map((name: string) => name[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() ?? "?";

                return (
                  <button
                    type="button"
                    key={member.user_id}
                    onClick={() => canSelectRecipient && setSelectedConversation(member.user_id)}
                    disabled={!canSelectRecipient}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left",
                      selectedConversation === member.user_id ? "bg-primary/10 text-primary" : "hover:bg-secondary",
                      !canSelectRecipient && "cursor-not-allowed opacity-70"
                    )}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-foreground">{member.full_name ?? "Sem nome"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {canSelectRecipient ? "Conversa direta" : "Visualização da equipe"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-soft"
        >
          <div className="border-b border-border p-3">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-primary" />
              <div>
                <h1 className="text-sm font-bold text-foreground">
                  {selectedRecipient ? `Conversa com ${selectedRecipient.full_name}` : "Chat da Equipe"}
                </h1>
                <p className="text-[10px] text-muted-foreground">
                  {selectedRecipient
                    ? "Mensagem direcionada ao destinatário selecionado"
                    : `${members.length} membro${members.length !== 1 ? "s" : ""} | Tempo real`}
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Espaço para clientes conversarem com os profissionais e encaminharem arquivos para download dentro do grupo.
            </p>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className={cn("flex gap-2", index % 2 === 0 ? "" : "justify-end")}>
                  <Skeleton className="h-10 w-48 rounded-lg" />
                </div>
              ))
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <MessageSquare className="mb-2 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
                <p className="text-xs text-muted-foreground">
                  {selectedRecipient
                    ? "Envie a primeira mensagem para este destinatário."
                    : "Use este grupo para falar com a equipe e compartilhar arquivos."}
                </p>
              </div>
            ) : (
              groupedMessages.map((group) => (
                <div key={group.date} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Separator className="flex-1" />
                    <span className="shrink-0 text-[10px] font-medium text-muted-foreground">{group.label}</span>
                    <Separator className="flex-1" />
                  </div>

                  {group.messages.map((message, index) => {
                    const isOwn = message.sender_id === user?.id;
                    const previousMessage = index > 0 ? group.messages[index - 1] : null;
                    const showName = !previousMessage || previousMessage.sender_id !== message.sender_id;
                    const initials = message.sender_name
                      .split(" ")
                      .map((name) => name[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();
                    const attachmentUrl = message.attachment_path
                      ? supabase.storage.from("message-attachments").getPublicUrl(message.attachment_path).data.publicUrl
                      : null;

                    return (
                      <div key={message.id} className={cn("flex gap-2", isOwn && "justify-end")}>
                        {!isOwn && showName && (
                          <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[10px] font-bold text-accent">
                            {initials}
                          </div>
                        )}
                        {!isOwn && !showName && <div className="w-7 shrink-0" />}

                        <div className="max-w-[70%] space-y-1">
                          {showName && (
                            <p className={cn("text-[10px] font-semibold", isOwn ? "text-right text-primary" : "text-foreground")}>
                              {isOwn ? "Voce" : message.sender_name}
                            </p>
                          )}

                          {message.content && (
                            <div
                              className={cn(
                                "rounded-xl px-3 py-2 text-sm break-words",
                                isOwn
                                  ? "rounded-tr-sm bg-primary text-primary-foreground"
                                  : "rounded-tl-sm bg-secondary text-foreground"
                              )}
                            >
                              {message.content}
                            </div>
                          )}

                          {attachmentUrl && (
                            <div className="space-y-2">
                              {message.attachment_mime_type?.startsWith("audio/") ? (
                                <audio controls preload="none" className="w-full max-w-sm">
                                  <source src={attachmentUrl} />
                                  Seu navegador não suporta áudio.
                                </audio>
                              ) : null}
                              <a
                                href={attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={cn(
                                  "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium",
                                  isOwn ? "border-primary/30 text-primary" : "border-border text-foreground"
                                )}
                              >
                                <Paperclip className="h-3.5 w-3.5" />
                                {message.attachment_name ?? "Arquivo enviado"}
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          )}

                          <p className={cn("text-[9px] text-muted-foreground", isOwn && "text-right")}>
                            {format(new Date(message.created_at), "HH:mm")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {attachment && (
            <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
              Arquivo pronto para envio: <span className="font-medium text-foreground">{attachment.name}</span>
            </div>
          )}

          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-3">
            <Input
              ref={inputRef}
              placeholder={selectedRecipient ? `Mensagem para ${selectedRecipient.full_name}...` : "Digite sua mensagem..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 border-0 bg-secondary"
              maxLength={1000}
              autoComplete="off"
            />
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
            />
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="h-4 w-4" />
            </Button>
            <AudioRecorderButton
              size="icon"
              className="h-9 w-9 shrink-0"
              disabled={sendMessage.isPending}
              onRecorded={(file) => {
                setAttachment(file);
                toast.success("Audio gravado e anexado.");
              }}
            />
            <Button
              type="submit"
              size="icon"
              className="h-9 w-9 shrink-0"
              disabled={(!input.trim() && !attachment) || sendMessage.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default Mensagens;
