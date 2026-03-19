import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, LifeBuoy, MessageSquarePlus, Send, ShieldCheck } from "lucide-react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AudioRecorderButton from "@/components/ui/audio-recorder-button";

type SupportStatus = "open" | "in_progress" | "answered" | "closed";

type SupportTicket = {
  id: string;
  tenant_id: string;
  requester_id: string;
  requester_name: string;
  requester_email: string | null;
  requester_attachment_name: string | null;
  requester_attachment_path: string | null;
  requester_attachment_mime_type: string | null;
  subject: string;
  message: string;
  status: SupportStatus;
  super_admin_response: string | null;
  response_attachment_name: string | null;
  response_attachment_path: string | null;
  response_attachment_mime_type: string | null;
  responded_at: string | null;
  created_at: string;
};

type AppRole = "owner" | "admin" | "professional" | "receptionist" | "patient" | "super_admin";

const statusLabel: Record<SupportStatus, string> = {
  open: "Aberto",
  in_progress: "Em atendimento",
  answered: "Respondido",
  closed: "Fechado",
};

const Suporte = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [ticketAudio, setTicketAudio] = useState<File | null>(null);
  const [savingTicket, setSavingTicket] = useState(false);
  const [savingReplyId, setSavingReplyId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, { status: SupportStatus; response: string; audio: File | null }>>({});
  const hasInitialized = useRef(false);

  const { data: role } = useQuery({
    queryKey: ["support-role", user?.id, profile?.tenant_id],
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

  const isSuperAdmin = role === "super_admin";

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["support-tickets", profile?.tenant_id, isSuperAdmin],
    enabled: !!profile?.tenant_id || isSuperAdmin,
    queryFn: async () => {
      let query = supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!isSuperAdmin) {
        query = query.eq("tenant_id", profile!.tenant_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as SupportTicket[];
    },
  });

  const ticketStats = useMemo(() => {
    return {
      total: tickets.length,
      open: tickets.filter((ticket) => ticket.status === "open").length,
      answered: tickets.filter((ticket) => ticket.status === "answered").length,
    };
  }, [tickets]);

  useEffect(() => {
    hasInitialized.current = true;
  }, [tickets.length]);

  useEffect(() => {
    if ((!profile?.tenant_id && !isSuperAdmin) || !user?.id) return;

    const channel = supabase
      .channel(`support-tickets-${isSuperAdmin ? "super-admin" : profile?.tenant_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_tickets",
          ...(isSuperAdmin ? {} : { filter: `tenant_id=eq.${profile?.tenant_id}` }),
        },
        (payload) => {
          const incoming = payload.new as SupportTicket;
          queryClient.invalidateQueries({ queryKey: ["support-tickets"] });

          if (!hasInitialized.current) return;
          if (isSuperAdmin) {
            toast.info("Novo chamado de suporte", {
              description: `${incoming.requester_name}: ${incoming.subject}`,
            });
            return;
          }

          if (incoming.requester_id !== user.id) {
            toast.info("Novo chamado registrado no suporte", {
              description: incoming.subject,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "support_tickets",
          ...(isSuperAdmin ? {} : { filter: `tenant_id=eq.${profile?.tenant_id}` }),
        },
        (payload) => {
          const updated = payload.new as SupportTicket;
          queryClient.invalidateQueries({ queryKey: ["support-tickets"] });

          if (!hasInitialized.current || isSuperAdmin) return;
          if (updated.super_admin_response || updated.response_attachment_path) {
            toast.info("Nova resposta do suporte", {
              description: updated.subject,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSuperAdmin, profile?.tenant_id, queryClient, user?.id]);

  const uploadSupportAttachment = async (file: File) => {
    if (!user || !profile?.tenant_id) throw new Error("Not authenticated");
    if (!file.type.startsWith("audio/")) throw new Error("Selecione um arquivo de audio valido.");
    if (file.size > 15 * 1024 * 1024) throw new Error("O audio deve ter no maximo 15MB.");

    const extension = file.name.split(".").pop() ?? "webm";
    const path = `${profile.tenant_id}/${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from("support-attachments")
      .upload(path, file, { upsert: false });

    if (error) throw error;

    return {
      path,
      name: file.name,
      mimeType: file.type || "audio/webm",
    };
  };

  const createTicket = async () => {
    if (!profile?.tenant_id || !user || !profile.full_name) return;
    if (!subject.trim() || !message.trim()) {
      toast.error("Preencha assunto e mensagem.");
      return;
    }

    setSavingTicket(true);

    let requesterAttachment:
      | { path: string; name: string; mimeType: string }
      | null = null;

    try {
      if (ticketAudio) requesterAttachment = await uploadSupportAttachment(ticketAudio);
    } catch (error: any) {
      setSavingTicket(false);
      toast.error("Falha ao anexar audio", { description: error.message });
      return;
    }

    const { error } = await supabase.from("support_tickets").insert({
      tenant_id: profile.tenant_id,
      requester_id: user.id,
      requester_name: profile.full_name,
      requester_email: user.email ?? null,
      requester_attachment_name: requesterAttachment?.name ?? null,
      requester_attachment_path: requesterAttachment?.path ?? null,
      requester_attachment_mime_type: requesterAttachment?.mimeType ?? null,
      subject: subject.trim(),
      message: message.trim(),
      status: "open",
    });
    setSavingTicket(false);

    if (error) {
      toast.error("Falha ao abrir chamado", { description: error.message });
      return;
    }

    toast.success("Chamado enviado para o Super Admin.");
    setSubject("");
    setMessage("");
    setTicketAudio(null);
    queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
  };

  const saveReply = async (ticket: SupportTicket) => {
    if (!user) return;
    const draft = replyDrafts[ticket.id] ?? {
      status: ticket.status,
      response: ticket.super_admin_response ?? "",
      audio: null,
    };

    setSavingReplyId(ticket.id);

    let responseAttachment:
      | { path: string; name: string; mimeType: string }
      | null = null;

    try {
      if (draft.audio) responseAttachment = await uploadSupportAttachment(draft.audio);
    } catch (error: any) {
      setSavingReplyId(null);
      toast.error("Falha ao anexar audio", { description: error.message });
      return;
    }

    const { error } = await supabase
      .from("support_tickets")
      .update({
        status: draft.status,
        super_admin_response: draft.response.trim() || null,
        response_attachment_name: responseAttachment?.name ?? ticket.response_attachment_name ?? null,
        response_attachment_path: responseAttachment?.path ?? ticket.response_attachment_path ?? null,
        response_attachment_mime_type: responseAttachment?.mimeType ?? ticket.response_attachment_mime_type ?? null,
        responded_by: user.id,
        responded_at: draft.response.trim() || responseAttachment ? new Date().toISOString() : null,
      })
      .eq("id", ticket.id);
    setSavingReplyId(null);

    if (error) {
      toast.error("Falha ao salvar resposta", { description: error.message });
      return;
    }

    toast.success("Chamado atualizado.");
    queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Suporte</h1>
            <p className="text-sm text-muted-foreground">
              {isSuperAdmin
                ? "Gerencie duvidas e chamados encaminhados pelos clientes."
                : "Encaminhe duvidas da plataforma diretamente para o Super Admin."}
            </p>
          </div>
          <div className="flex gap-3">
            <Card className="min-w-[120px]">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Chamados</p>
                <p className="text-xl font-bold">{ticketStats.total}</p>
              </CardContent>
            </Card>
            <Card className="min-w-[120px]">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Abertos</p>
                <p className="text-xl font-bold">{ticketStats.open}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {!isSuperAdmin && (
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquarePlus className="h-4 w-4 text-primary" />
                Novo chamado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Assunto</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex.: duvida sobre agenda, acesso, assinatura..." />
              </div>
              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Textarea
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Descreva a duvida ou problema para o Super Admin."
                />
              </div>
              <div className="flex items-center gap-3">
                <AudioRecorderButton
                  size="sm"
                  disabled={savingTicket}
                  onRecorded={(file) => {
                    setTicketAudio(file);
                    toast.success("Audio gravado e anexado ao chamado.");
                  }}
                />
                <p className="text-xs text-muted-foreground">Grave um audio para complementar o chamado.</p>
              </div>
              {ticketAudio && (
                <p className="text-xs text-muted-foreground">
                  Audio anexado: <span className="font-medium text-foreground">{ticketAudio.name}</span>
                </p>
              )}
              <Button onClick={createTicket} disabled={savingTicket}>
                <Send className="mr-1.5 h-4 w-4" />
                {savingTicket ? "Enviando..." : "Encaminhar ao Super Admin"}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LifeBuoy className="h-4 w-4 text-primary" />
              {isSuperAdmin ? "Chamados dos clientes" : "Meus chamados"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && <p className="text-sm text-muted-foreground">Carregando chamados...</p>}
            {!isLoading && tickets.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum chamado encontrado.</p>
            )}

            {tickets.map((ticket) => {
              const draft = replyDrafts[ticket.id] ?? {
                status: ticket.status,
                response: ticket.super_admin_response ?? "",
                audio: null,
              };
              const requesterAttachmentUrl = ticket.requester_attachment_path
                ? supabase.storage.from("support-attachments").getPublicUrl(ticket.requester_attachment_path).data.publicUrl
                : null;
              const responseAttachmentUrl = ticket.response_attachment_path
                ? supabase.storage.from("support-attachments").getPublicUrl(ticket.response_attachment_path).data.publicUrl
                : null;

              return (
                <div key={ticket.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.requester_name}
                        {ticket.requester_email ? ` | ${ticket.requester_email}` : ""}
                        {` | ${format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}`}
                      </p>
                    </div>
                    <Badge variant="outline">{statusLabel[ticket.status]}</Badge>
                  </div>

                  <div className="mt-3 rounded-lg bg-secondary/30 p-3 text-sm text-foreground">
                    {ticket.message}
                  </div>

                  {requesterAttachmentUrl && ticket.requester_attachment_mime_type?.startsWith("audio/") && (
                    <div className="mt-3 space-y-2">
                      <audio controls preload="none" className="w-full max-w-sm">
                        <source src={requesterAttachmentUrl} />
                        Seu navegador nao suporta audio.
                      </audio>
                      <a
                        href={requesterAttachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {ticket.requester_attachment_name ?? "Baixar audio do chamado"}
                      </a>
                    </div>
                  )}

                  {isSuperAdmin ? (
                    <div className="mt-4 space-y-3">
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={draft.status}
                          onValueChange={(value) =>
                            setReplyDrafts((prev) => ({
                              ...prev,
                              [ticket.id]: { ...draft, status: value as SupportStatus },
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Aberto</SelectItem>
                            <SelectItem value="in_progress">Em atendimento</SelectItem>
                            <SelectItem value="answered">Respondido</SelectItem>
                            <SelectItem value="closed">Fechado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Resposta do Super Admin</Label>
                        <Textarea
                          rows={4}
                          value={draft.response}
                          onChange={(e) =>
                            setReplyDrafts((prev) => ({
                              ...prev,
                              [ticket.id]: { ...draft, response: e.target.value },
                            }))
                          }
                          placeholder="Digite a orientacao para o cliente."
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <AudioRecorderButton
                          size="sm"
                          disabled={savingReplyId === ticket.id}
                          onRecorded={(file) => {
                            setReplyDrafts((prev) => ({
                              ...prev,
                              [ticket.id]: { ...draft, audio: file },
                            }));
                            toast.success("Audio gravado e anexado a resposta.");
                          }}
                        />
                        <p className="text-xs text-muted-foreground">Grave um audio para responder ao cliente.</p>
                      </div>
                      {draft.audio && (
                        <p className="text-xs text-muted-foreground">
                          Audio anexado: <span className="font-medium text-foreground">{draft.audio.name}</span>
                        </p>
                      )}
                      <Button onClick={() => saveReply(ticket)} disabled={savingReplyId === ticket.id}>
                        <ShieldCheck className="mr-1.5 h-4 w-4" />
                        {savingReplyId === ticket.id ? "Salvando..." : "Salvar resposta"}
                      </Button>
                    </div>
                  ) : (
                    (ticket.super_admin_response || responseAttachmentUrl) && (
                      <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200">
                        <p className="mb-1 font-semibold">Resposta do Super Admin</p>
                        {ticket.super_admin_response && <p>{ticket.super_admin_response}</p>}
                        {responseAttachmentUrl && ticket.response_attachment_mime_type?.startsWith("audio/") && (
                          <div className="mt-3 space-y-2">
                            <audio controls preload="none" className="w-full max-w-sm">
                              <source src={responseAttachmentUrl} />
                              Seu navegador nao suporta audio.
                            </audio>
                            <a
                              href={responseAttachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-300"
                            >
                              <Download className="h-3.5 w-3.5" />
                              {ticket.response_attachment_name ?? "Baixar audio da resposta"}
                            </a>
                          </div>
                        )}
                        {ticket.responded_at && (
                          <p className="mt-2 text-xs opacity-80">
                            Respondido em {format(new Date(ticket.responded_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Suporte;
