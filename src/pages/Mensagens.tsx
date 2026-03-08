import { useState, useRef, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { MessageSquare, Send, Users } from "lucide-react";
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

const Mensagens = () => {
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useMessages();
  const { data: members = [] } = useTeamMembers();
  const sendMessage = useSendMessage();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      await sendMessage.mutateAsync(input);
      setInput("");
      inputRef.current?.focus();
    } catch (err: any) {
      toast.error("Erro ao enviar mensagem", { description: err.message });
    }
  };

  // Group messages by date
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
        {/* Team sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden md:flex w-[220px] flex-col rounded-lg border border-border bg-card shadow-soft shrink-0"
        >
          <div className="flex items-center gap-2 p-3 border-b border-border">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Equipe</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{members.length}</span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {members.map((m) => {
                const initials = m.full_name
                  ?.split(" ")
                  .map((n: string) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() ?? "?";
                const isMe = m.user_id === user?.id;

                return (
                  <div
                    key={m.user_id}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5",
                      isMe && "bg-primary/5"
                    )}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary shrink-0">
                      {initials}
                    </div>
                    <span className="text-xs font-medium text-foreground truncate">
                      {m.full_name ?? "Sem nome"}
                      {isMe && <span className="text-muted-foreground ml-1">(você)</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </motion.div>

        {/* Chat area */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-1 flex-col rounded-lg border border-border bg-card shadow-soft overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-3 border-b border-border">
            <MessageSquare className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-sm font-bold text-foreground">Chat da Equipe</h1>
              <p className="text-[10px] text-muted-foreground">
                {members.length} membro{members.length !== 1 ? "s" : ""} • Tempo real
              </p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={cn("flex gap-2", i % 2 === 0 ? "" : "justify-end")}>
                  <Skeleton className="h-10 w-48 rounded-lg" />
                </div>
              ))
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma mensagem ainda.
                </p>
                <p className="text-xs text-muted-foreground">
                  Envie a primeira mensagem para sua equipe!
                </p>
              </div>
            ) : (
              groupedMessages.map((group) => (
                <div key={group.date} className="space-y-3">
                  {/* Date separator */}
                  <div className="flex items-center gap-3">
                    <Separator className="flex-1" />
                    <span className="text-[10px] font-medium text-muted-foreground shrink-0">
                      {group.label}
                    </span>
                    <Separator className="flex-1" />
                  </div>

                  {group.messages.map((msg, i) => {
                    const isOwn = msg.sender_id === user?.id;
                    const prevMsg = i > 0 ? group.messages[i - 1] : null;
                    const showName = !prevMsg || prevMsg.sender_id !== msg.sender_id;
                    const initials = msg.sender_name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    return (
                      <div
                        key={msg.id}
                        className={cn("flex gap-2", isOwn ? "justify-end" : "")}
                      >
                        {!isOwn && showName && (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/20 text-[10px] font-bold text-accent shrink-0 mt-1">
                            {initials}
                          </div>
                        )}
                        {!isOwn && !showName && <div className="w-7 shrink-0" />}

                        <div
                          className={cn(
                            "max-w-[70%] space-y-0.5",
                            isOwn ? "items-end" : "items-start"
                          )}
                        >
                          {showName && (
                            <p
                              className={cn(
                                "text-[10px] font-semibold",
                                isOwn
                                  ? "text-right text-primary"
                                  : "text-foreground"
                              )}
                            >
                              {isOwn ? "Você" : msg.sender_name}
                            </p>
                          )}
                          <div
                            className={cn(
                              "rounded-xl px-3 py-2 text-sm break-words",
                              isOwn
                                ? "bg-primary text-primary-foreground rounded-tr-sm"
                                : "bg-secondary text-foreground rounded-tl-sm"
                            )}
                          >
                            {msg.content}
                          </div>
                          <p
                            className={cn(
                              "text-[9px] text-muted-foreground",
                              isOwn ? "text-right" : ""
                            )}
                          >
                            {format(new Date(msg.created_at), "HH:mm")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-3">
            <Input
              ref={inputRef}
              placeholder="Digite sua mensagem..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-secondary border-0"
              maxLength={1000}
              autoComplete="off"
            />
            <Button
              type="submit"
              size="icon"
              className="h-9 w-9 shrink-0"
              disabled={!input.trim() || sendMessage.isPending}
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
