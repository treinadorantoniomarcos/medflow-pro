import AdminLayout from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Settings, MessageCircle, Bell, Clock, CheckCircle2, XCircle, AlertTriangle, Loader2, Link2, Copy, Check, Camera, UserCircle } from "lucide-react";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";
import { toast } from "sonner";

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

  const { data: clinicSlug } = useQuery({
    queryKey: ["clinic-slug", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("clinics")
        .select("slug")
        .eq("id", profile!.tenant_id)
        .single();
      return data?.slug ?? null;
    },
  });

  const bookingUrl = clinicSlug
    ? `${window.location.origin}/agendar/${clinicSlug}`
    : null;

  const whatsappEnabled = settings?.whatsapp_reminders_enabled ?? false;

  const handleToggleWhatsApp = () => {
    updateSettings.mutate({ whatsapp_reminders_enabled: !whatsappEnabled });
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
        </motion.div>

        {/* Booking link card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
        >
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Link2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">Link de Agendamento Online</CardTitle>
                  <CardDescription>
                    Compartilhe este link no WhatsApp, Instagram ou site para seus pacientes agendarem
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {bookingUrl ? (
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
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum slug configurado para a clínica. Entre em contato para configurar.
                </p>
              )}
            </CardContent>
          </Card>
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
                  <CardTitle className="text-base">Lembretes via WhatsApp</CardTitle>
                  <CardDescription>
                    Envie lembretes automáticos para pacientes antes das consultas
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingSettings ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="whatsapp-toggle" className="text-sm font-semibold">
                        Ativar lembretes automáticos
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Ao ativar, lembretes serão enfileirados 24h antes de cada consulta agendada
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
                        Os lembretes estão sendo enfileirados. Para envio real via WhatsApp,
                        é necessário configurar a API do WhatsApp Business da Meta. Entre em contato
                        para configurar a integração completa.
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
                  <CardTitle className="text-base">Fila de Notificações</CardTitle>
                  <CardDescription>Últimas notificações enfileiradas</CardDescription>
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
                    Nenhuma notificação na fila ainda.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Notificações aparecerão aqui quando consultas forem agendadas.
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
                                {format(new Date(item.appointment_date), "dd/MM 'às' HH:mm", { locale: ptBR })}
                              </span>
                              <span>•</span>
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
