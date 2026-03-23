import AdminLayout from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import {
  Settings, MessageCircle, Bell, Clock, CheckCircle2, XCircle,
  AlertTriangle, Link2, Copy, Check,
  Mail, Share2, Download, CalendarDays,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useClinicSettings, useUpdateClinicSettings, useNotificationsQueue } from "@/hooks/use-clinic-settings";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import TeamManagement from "@/components/settings/TeamManagement";
import HelpIcon from "@/components/tutorial/HelpIcon";

const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  pending: { label: "Pendente", icon: <Clock className="h-3 w-3" />, className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  ready: { label: "Pronto", icon: <CheckCircle2 className="h-3 w-3" />, className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  sent: { label: "Enviado", icon: <CheckCircle2 className="h-3 w-3" />, className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  failed: { label: "Falhou", icon: <XCircle className="h-3 w-3" />, className: "bg-destructive/10 text-destructive" },
};

const Configuracoes = () => {
  const { profile } = useAuth();
  const { data: settings, isLoading: loadingSettings } = useClinicSettings();
  const updateSettings = useUpdateClinicSettings();
  const { data: queue = [], isLoading: loadingQueue } = useNotificationsQueue();
  const [copied, setCopied] = useState(false);
  const [copiedAgenda, setCopiedAgenda] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const qrAgendaRef = useRef<HTMLDivElement>(null);

  const { data: clinicData } = useQuery({
    queryKey: ["clinic-slug", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("clinics")
        .select("slug, name")
        .eq("id", profile!.tenant_id)
        .single();
      return data;
    },
  });

  const clinicSlug = clinicData?.slug ?? null;
  const clinicName = clinicData?.name ?? "";

  const bookingUrl = clinicSlug
    ? `${window.location.origin}/agendar/${clinicSlug}`
    : null;

  const whatsappEnabled = settings?.whatsapp_reminders_enabled ?? false;

  const handleToggleWhatsApp = () => {
    updateSettings.mutate({ whatsapp_reminders_enabled: !whatsappEnabled });
  };

  const handleDownloadQR = useCallback(() => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      canvas.width = 512;
      canvas.height = 512;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);
      const link = document.createElement("a");
      link.download = `qrcode-${clinicSlug ?? "agenda"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  }, [clinicSlug]);

  const handleShareWhatsApp = () => {
    if (!bookingUrl) return;
    const text = `Agende sua consulta na ${clinicName}: ${bookingUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleShareEmail = () => {
    if (!bookingUrl) return;
    const subject = `Agende sua consulta - ${clinicName}`;
    const body = `Olá!\n\nAgende sua consulta online:\n${bookingUrl}\n\nAtenciosamente,\n${clinicName}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const handleShareNative = async () => {
    if (!bookingUrl || !navigator.share) return;
    try {
      await navigator.share({
        title: `Agende sua consulta - ${clinicName}`,
        text: `Agende sua consulta online na ${clinicName}`,
        url: bookingUrl,
      });
    } catch { /* cancelled */ }
  };

  const pendingCount = queue.filter((n) => n.status === "pending").length;
  const sentCount = queue.filter((n) => n.status === "sent" || n.status === "ready").length;
  const failedCount = queue.filter((n) => n.status === "failed").length;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <Settings className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Configurações</h1>
            <p className="text-sm text-muted-foreground">
              Gestão de notificações e preferências da clínica
            </p>
          </div>
          <HelpIcon screen="configuracoes" />
        </motion.div>

        {/* Booking link + QR code card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
        >
          <Card className="shadow-soft" data-tutorial-target="config-link">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Link2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">Link de Agendamento Online</CardTitle>
                  <CardDescription>
                    Compartilhe por WhatsApp, e-mail, Instagram ou redes sociais
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {bookingUrl ? (
                <>
                  {/* Link + copy */}
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={bookingUrl}
                      className="bg-secondary border-0 text-sm font-mono"
                      onFocus={(e) => e.target.select()}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(bookingUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      title="Copiar link"
                    >
                      {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>

                  <Separator />

                  {/* QR Code + share buttons */}
                  <div className="flex flex-col sm:flex-row items-center gap-6" data-tutorial-target="config-qr">
                    {/* QR Code */}
                    <div className="flex flex-col items-center gap-3">
                      <div
                        ref={qrRef}
                        className="rounded-xl border border-border bg-card p-4"
                      >
                        <QRCodeSVG
                          value={bookingUrl}
                          size={160}
                          level="M"
                          includeMargin={false}
                          bgColor="transparent"
                          fgColor="currentColor"
                          className="text-foreground"
                        />
                      </div>
                    <Button variant="outline" size="sm" onClick={handleDownloadQR}>
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Baixar QR Code
                    </Button>
                  </div>

                  {/* Share buttons */}
                  <div className="flex-1 space-y-3 w-full sm:w-auto" data-tutorial-target="config-share-actions">
                      <p className="text-sm font-semibold text-foreground">Compartilhar via</p>
                      <div className="grid gap-2">
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={handleShareWhatsApp}
                        >
                          <MessageCircle className="h-4 w-4 mr-2 text-primary" />
                          WhatsApp
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={handleShareEmail}
                        >
                          <Mail className="h-4 w-4 mr-2 text-primary" />
                          E-mail
                        </Button>
                        {typeof navigator !== "undefined" && !!navigator.share && (
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={handleShareNative}
                          >
                            <Share2 className="h-4 w-4 mr-2 text-primary" />
                            Mais opÃ§Ãµes (Instagram, etc.)
                          </Button>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Use o QR Code em materiais impressos, stories do Instagram ou cartÃ£o de visita digital.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum slug configurado para a clÃ­nica. Entre em contato para configurar.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Professional agenda link card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.035 }}
        >
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">Agenda dos Profissionais</CardTitle>
                  <CardDescription>
                    Link direto para os profissionais acessarem sua agenda pessoal
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4" data-tutorial-target="config-qr">
              {(() => {
                const agendaUrl = `${window.location.origin}/minha-agenda`;
                return (
                  <>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={agendaUrl}
                        className="bg-secondary border-0 text-sm font-mono"
                        onFocus={(e) => e.target.select()}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(agendaUrl);
                          setCopiedAgenda(true);
                          setTimeout(() => setCopiedAgenda(false), 2000);
                        }}
                        title="Copiar link"
                      >
                        {copiedAgenda ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>

                    <Separator />

                    {/* QR Code + share buttons */}
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="flex flex-col items-center gap-3">
                        <div
                          ref={qrAgendaRef}
                          className="rounded-xl border border-border bg-card p-4"
                        >
                          <QRCodeSVG
                            value={agendaUrl}
                            size={160}
                            level="M"
                            includeMargin={false}
                            bgColor="transparent"
                            fgColor="currentColor"
                            className="text-foreground"
                          />
                        </div>
                        <Button variant="outline" size="sm" onClick={() => {
                          if (!qrAgendaRef.current) return;
                          const svg = qrAgendaRef.current.querySelector("svg");
                          if (!svg) return;
                          const canvas = document.createElement("canvas");
                          const ctx = canvas.getContext("2d")!;
                          const svgData = new XMLSerializer().serializeToString(svg);
                          const img = new Image();
                          img.onload = () => {
                            canvas.width = 512;
                            canvas.height = 512;
                            ctx.fillStyle = "#ffffff";
                            ctx.fillRect(0, 0, 512, 512);
                            ctx.drawImage(img, 0, 0, 512, 512);
                            const link = document.createElement("a");
                            link.download = "qrcode-agenda-profissional.png";
                            link.href = canvas.toDataURL("image/png");
                            link.click();
                          };
                          img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
                        }}>
                          <Download className="h-3.5 w-3.5 mr-1.5" />
                          Baixar QR Code
                        </Button>
                      </div>

                      <div className="flex-1 space-y-3 w-full sm:w-auto">
                        <p className="text-sm font-semibold text-foreground">Compartilhar via</p>
                        <div className="grid gap-2">
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => {
                              const text = `Acesse sua agenda profissional: ${agendaUrl}`;
                              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                            }}
                          >
                            <MessageCircle className="h-4 w-4 mr-2 text-primary" />
                            WhatsApp
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => {
                              const subject = `Acesse sua agenda - ${clinicName}`;
                              const body = `OlÃ¡!\n\nAcesse sua agenda profissional pelo link:\n${agendaUrl}\n\nAtenciosamente,\n${clinicName}`;
                              window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                            }}
                          >
                            <Mail className="h-4 w-4 mr-2 text-primary" />
                            E-mail
                          </Button>
                          {typeof navigator !== "undefined" && !!navigator.share && (
                            <Button
                              variant="outline"
                              className="w-full justify-start"
                              onClick={async () => {
                                try {
                                  await navigator.share({
                                    title: `Agenda Profissional - ${clinicName}`,
                                    text: `Acesse sua agenda profissional`,
                                    url: agendaUrl,
                                  });
                                } catch { /* cancelled */ }
                              }}
                            >
                              <Share2 className="h-4 w-4 mr-2 text-primary" />
                              Mais opÃ§Ãµes
                            </Button>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Compartilhe este link com os profissionais da equipe para que acessem suas agendas individuais.
                        </p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </motion.div>

        {/* Team management */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
        >
          <TeamManagement />
        </motion.div>

        {/* WhatsApp settings card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30 shrink-0">
                  <MessageCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">Lembretes por Aplicativo e WhatsApp</CardTitle>
                  <CardDescription>
                    Envie lembretes automáticos para pacientes antes das consultas (D-1 e 2h antes)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4" data-tutorial-target="config-share-panel">
              {loadingSettings ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="whatsapp-toggle" className="text-sm font-semibold">
                        Ativar lembretes automÃ¡ticos
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Ao ativar, lembretes serão enfileirados no app e no WhatsApp em D-1 e 2h antes da consulta
                      </p>
                    </div>
                    <Switch
                      id="whatsapp-toggle"
                      checked={whatsappEnabled}
                      onCheckedChange={handleToggleWhatsApp}
                      disabled={updateSettings.isPending}
                    />
                  </div>

                  {whatsappEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="rounded-lg border border-border bg-secondary/50 p-4 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <span className="text-xs font-semibold text-foreground">
                          API do WhatsApp Business
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Os lembretes estÃ£o sendo enfileirados. Para envio real via WhatsApp,
                        Ã© necessÃ¡rio configurar a API do WhatsApp Business da Meta. Entre em contato
                        para configurar a integraÃ§Ã£o completa.
                      </p>
                    </motion.div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Notification stats */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3"
        >
          <Card className="shadow-soft">
            <CardContent className="flex items-center gap-3 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30 shrink-0">
                <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Pendentes</p>
                <p className="text-lg font-bold text-foreground">{pendingCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardContent className="flex items-center gap-3 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30 shrink-0">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Enviados</p>
                <p className="text-lg font-bold text-foreground">{sentCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardContent className="flex items-center gap-3 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 shrink-0">
                <XCircle className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Falhas</p>
                <p className="text-lg font-bold text-foreground">{failedCount}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent notifications queue */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Fila de NotificaÃ§Ãµes</CardTitle>
                  <CardDescription>Ãšltimas notificaÃ§Ãµes enfileiradas</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingQueue ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : queue.length === 0 ? (
                <div className="py-8 text-center">
                  <Bell className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma notificaÃ§Ã£o na fila ainda.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    NotificaÃ§Ãµes aparecerÃ£o aqui quando consultas forem agendadas.
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-[320px]">
                  <div className="space-y-2">
                    {queue.map((item) => {
                      const cfg = statusConfig[item.status] ?? statusConfig.pending;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 rounded-lg border border-border p-3"
                        >
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {item.patient_name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>
                                {format(new Date(item.appointment_date), "dd/MM 'Ã s' HH:mm", { locale: ptBR })}
                              </span>
                              <span>â€¢</span>
                              <span className="truncate">{item.professional_name}</span>
                            </div>
                            {item.last_error && (
                              <p className="text-[10px] text-destructive truncate">{item.last_error}</p>
                            )}
                          </div>
                          <Badge
                            variant="secondary"
                            className={cn("gap-1 text-[10px] shrink-0", cfg.className)}
                          >
                            {cfg.icon}
                            {cfg.label}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default Configuracoes;


