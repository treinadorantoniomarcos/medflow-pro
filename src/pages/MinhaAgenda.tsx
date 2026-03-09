import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { addDays, format, isToday, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, MessageCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import StatusChip from "@/components/dashboard/StatusChip";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AppointmentAudioPlayer from "@/components/agenda/AppointmentAudioPlayer";
import { buildAppointmentReminder, buildWhatsAppUrl } from "@/lib/whatsapp";
import type { AppointmentStatus } from "@/components/dashboard/StatusChip";
import { useProfessionalAgenda, useProfessionalStats } from "@/hooks/use-professional-agenda";

type AppRole = "owner" | "admin" | "professional" | "receptionist" | "patient" | "super_admin";

type TeamProfessional = {
  user_id: string;
  full_name: string;
  accepting_bookings: boolean;
};

const statusActions: { from: AppointmentStatus; to: AppointmentStatus; label: string }[] = [
  { from: "scheduled", to: "confirmed", label: "Confirmar" },
  { from: "confirmed", to: "in_progress", label: "Iniciar" },
  { from: "in_progress", to: "completed", label: "Concluir" },
];

const MinhaAgenda = () => {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>(user?.id ?? "");
  const [savingSlot, setSavingSlot] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [savingBlock, setSavingBlock] = useState(false);

  const { data: role } = useQuery({
    queryKey: ["my-agenda-role", user?.id, profile?.tenant_id],
    enabled: !!user?.id && !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("tenant_id", profile!.tenant_id)
        .maybeSingle();
      if (error) throw error;
      return (data?.role ?? null) as AppRole | null;
    },
  });

  const isAdminScope = role === "owner" || role === "admin";

  const { data: professionals = [] } = useQuery({
    queryKey: ["my-agenda-professionals", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, accepting_bookings")
        .eq("tenant_id", profile!.tenant_id)
        .not("full_name", "is", null)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TeamProfessional[];
    },
  });

  const managedProfessional = useMemo(() => {
    if (!professionals.length) return null;
    if (isAdminScope) {
      return professionals.find((p) => p.user_id === selectedProfessionalId) ?? professionals[0];
    }
    return professionals.find((p) => p.user_id === user?.id) ?? professionals[0];
  }, [professionals, isAdminScope, selectedProfessionalId, user?.id]);

  const managedProfessionalId = managedProfessional?.user_id ?? null;
  const managedProfessionalName = managedProfessional?.full_name ?? null;

  const { data: appointments = [], isLoading } = useProfessionalAgenda(selectedDate, {
    professionalUserId: managedProfessionalId,
    professionalName: managedProfessionalName,
  });

  const { data: stats } = useProfessionalStats(selectedDate, {
    professionalUserId: managedProfessionalId,
    professionalName: managedProfessionalName,
  });

  const { data: clinicSettings } = useQuery({
    queryKey: ["my-agenda-clinic-settings", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinics")
        .select("settings")
        .eq("id", profile!.tenant_id)
        .single();
      if (error) throw error;
      return (data?.settings as Record<string, unknown> | null) ?? {};
    },
  });

  const workStart = Number(clinicSettings?.work_start_hour ?? 8);
  const workEnd = Number(clinicSettings?.work_end_hour ?? 18);
  const slotDuration = Number(clinicSettings?.slot_duration_minutes ?? 60);

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = workStart; h < workEnd; h++) {
      for (let m = 0; m < 60; m += slotDuration) {
        if (h + m / 60 >= workEnd) break;
        slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }
    }
    return slots;
  }, [workStart, workEnd, slotDuration]);

  const slotDate = format(selectedDate, "yyyy-MM-dd");

  const { data: slotOverrides = [] } = useQuery({
    queryKey: ["slot-overrides", profile?.tenant_id, managedProfessionalId, slotDate],
    enabled: !!profile?.tenant_id && !!managedProfessionalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_slot_overrides")
        .select("slot_time, is_available")
        .eq("tenant_id", profile!.tenant_id)
        .eq("professional_user_id", managedProfessionalId!)
        .eq("slot_date", slotDate);
      if (error) throw error;
      return (data ?? []) as Array<{ slot_time: string; is_available: boolean }>;
    },
  });

  const overrideMap = useMemo(() => {
    const map = new Map<string, boolean>();
    slotOverrides.forEach((item) => map.set(String(item.slot_time).slice(0, 5), item.is_available));
    return map;
  }, [slotOverrides]);

  const { data: periodBlocks = [] } = useQuery({
    queryKey: ["availability-blocks", profile?.tenant_id, managedProfessionalId],
    enabled: !!profile?.tenant_id && !!managedProfessionalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_availability_blocks")
        .select("id, start_at, end_at, reason")
        .eq("tenant_id", profile!.tenant_id)
        .eq("professional_user_id", managedProfessionalId!)
        .gte("end_at", new Date().toISOString())
        .order("start_at", { ascending: true })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; start_at: string; end_at: string; reason: string | null }>;
    },
  });

  const acceptingBookings = managedProfessional?.accepting_bookings ?? true;

  const bookedTimes = useMemo(() => {
    const set = new Set<string>();
    appointments.forEach((apt) => {
      if (apt.status !== "cancelled" && apt.status !== "no_show") {
        set.add(format(new Date(apt.starts_at), "HH:mm"));
      }
    });
    return set;
  }, [appointments]);

  const blockedTimesByPeriod = useMemo(() => {
    const result = new Set<string>();
    const dateStart = new Date(`${slotDate}T00:00:00`);
    const dateEnd = new Date(`${slotDate}T23:59:59`);

    periodBlocks.forEach((block) => {
      const start = new Date(block.start_at);
      const end = new Date(block.end_at);
      if (end < dateStart || start > dateEnd) return;

      timeSlots.forEach((time) => {
        const slotInstant = new Date(`${slotDate}T${time}:00`);
        if (slotInstant >= start && slotInstant < end) {
          result.add(time);
        }
      });
    });

    return result;
  }, [periodBlocks, timeSlots, slotDate]);

  const handleToggleBookings = async () => {
    if (!managedProfessionalId) return;
    setToggling(true);
    const newValue = !acceptingBookings;

    const { error } = await supabase
      .from("profiles")
      .update({ accepting_bookings: newValue })
      .eq("user_id", managedProfessionalId)
      .eq("tenant_id", profile!.tenant_id);

    if (error) {
      toast.error("Erro ao atualizar disponibilidade geral");
    } else {
      toast.success(newValue ? "Agenda geral aberta" : "Agenda geral fechada");
      queryClient.invalidateQueries({ queryKey: ["my-agenda-professionals"] });
    }
    setToggling(false);
  };

  const handleToggleSlot = async (time: string) => {
    if (!managedProfessionalId || !managedProfessionalName || !profile?.tenant_id || !user?.id) return;

    setSavingSlot(time);
    const defaultAvailability = acceptingBookings;
    const effective = overrideMap.has(time) ? overrideMap.get(time)! : defaultAvailability;
    const nextValue = !effective;

    const { error } = await supabase
      .from("professional_slot_overrides")
      .upsert(
        {
          tenant_id: profile.tenant_id,
          professional_user_id: managedProfessionalId,
          professional_name: managedProfessionalName,
          slot_date: slotDate,
          slot_time: `${time}:00`,
          is_available: nextValue,
          created_by: user.id,
        },
        { onConflict: "tenant_id,professional_user_id,slot_date,slot_time" }
      );

    if (error) {
      toast.error("Erro ao salvar horario");
    } else {
      toast.success(nextValue ? `Horario ${time} liberado` : `Horario ${time} fechado`);
      queryClient.invalidateQueries({ queryKey: ["slot-overrides"] });
    }

    setSavingSlot(null);
  };

  const handleCreateBlock = async () => {
    if (!managedProfessionalId || !managedProfessionalName || !profile?.tenant_id || !user?.id) return;
    if (!blockStart || !blockEnd) {
      toast.error("Informe inicio e fim do bloqueio.");
      return;
    }

    const startIso = new Date(blockStart).toISOString();
    const endIso = new Date(blockEnd).toISOString();
    if (new Date(endIso) <= new Date(startIso)) {
      toast.error("O fim deve ser maior que o inicio.");
      return;
    }

    setSavingBlock(true);
    const { error } = await supabase.from("professional_availability_blocks").insert({
      tenant_id: profile.tenant_id,
      professional_user_id: managedProfessionalId,
      professional_name: managedProfessionalName,
      start_at: startIso,
      end_at: endIso,
      reason: blockReason.trim() || null,
      created_by: user.id,
    });

    if (error) {
      toast.error("Erro ao criar bloqueio", { description: error.message });
    } else {
      toast.success("Bloqueio por periodo criado.");
      setBlockStart("");
      setBlockEnd("");
      setBlockReason("");
      queryClient.invalidateQueries({ queryKey: ["availability-blocks"] });
    }
    setSavingBlock(false);
  };

  const handleRemoveBlock = async (id: string) => {
    const { error } = await supabase
      .from("professional_availability_blocks")
      .delete()
      .eq("id", id)
      .eq("tenant_id", profile!.tenant_id);

    if (error) {
      toast.error("Erro ao remover bloqueio");
    } else {
      toast.success("Bloqueio removido.");
      queryClient.invalidateQueries({ queryKey: ["availability-blocks"] });
    }
  };

  const handleStatusChange = async (id: string, newStatus: AppointmentStatus) => {
    const { error } = await supabase.from("appointments").update({ status: newStatus }).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar status", { description: error.message });
    } else {
      queryClient.invalidateQueries({ queryKey: ["professional-agenda"] });
      queryClient.invalidateQueries({ queryKey: ["professional-stats"] });
    }
  };

  const handleWhatsAppReminder = async (apt: (typeof appointments)[number]) => {
    const { data: patient } = await supabase
      .from("patients")
      .select("phone")
      .eq("tenant_id", profile!.tenant_id)
      .eq("full_name", apt.patient_name)
      .maybeSingle();

    if (!patient?.phone) {
      toast.error("Paciente sem telefone");
      return;
    }

    const message = buildAppointmentReminder({
      patientName: apt.patient_name,
      date: format(new Date(apt.starts_at), "dd/MM/yyyy"),
      time: format(new Date(apt.starts_at), "HH:mm"),
      professionalName: apt.professional_name,
      type: apt.type,
    });

    const url = buildWhatsAppUrl(patient.phone, message);
    if (url) window.open(url, "_blank");
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-4xl space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Agenda Profissional</h1>
              <p className="text-sm text-muted-foreground">
                {managedProfessionalName ?? "Profissional"} | {isToday(selectedDate) ? "Hoje" : format(selectedDate, "dd/MM/yyyy")}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <span className="text-xs text-muted-foreground">Agenda geral</span>
              <Badge variant={acceptingBookings ? "default" : "outline"}>{acceptingBookings ? "Aberta" : "Fechada"}</Badge>
              <Switch checked={acceptingBookings} onCheckedChange={handleToggleBookings} disabled={toggling || !managedProfessionalId} />
            </div>
          </div>

          {isAdminScope && (
            <div className="max-w-sm">
              <Select value={managedProfessionalId ?? ""} onValueChange={setSelectedProfessionalId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar profissional" />
                </SelectTrigger>
                <SelectContent>
                  {professionals.map((prof) => (
                    <SelectItem key={prof.user_id} value={prof.user_id}>
                      {prof.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Atendimentos" value={stats?.total ?? 0} loading={isLoading} />
          <StatCard label="Disponiveis" value={stats?.available ?? 0} loading={isLoading} />
          <StatCard label="Agendadas" value={stats?.pending ?? 0} loading={isLoading} />
          <StatCard label="Confirmadas" value={stats?.confirmed ?? 0} loading={isLoading} />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedDate((d) => subDays(d, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button className="text-sm font-semibold capitalize" onClick={() => setSelectedDate(new Date())}>
            {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </button>
          <Button variant="ghost" size="icon" onClick={() => setSelectedDate((d) => addDays(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">Liberar/fechar dias e horarios</h2>
            <p className="text-xs text-muted-foreground">{format(selectedDate, "dd/MM/yyyy")}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {timeSlots.map((time) => {
              const override = overrideMap.get(time);
              const blockedByPeriod = blockedTimesByPeriod.has(time);
              const effective = blockedByPeriod ? false : (override ?? acceptingBookings);
              const busy = bookedTimes.has(time);
              return (
                <Button
                  key={time}
                  variant={effective ? "outline" : "secondary"}
                  size="sm"
                  disabled={savingSlot === time || blockedByPeriod}
                  className={effective ? "border-emerald-300 text-emerald-700" : "border-destructive/40 text-destructive"}
                  onClick={() => handleToggleSlot(time)}
                >
                  {time}{busy ? " *" : ""}{blockedByPeriod ? " !" : ""}
                </Button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">* horario com consulta registrada | ! bloqueado por periodo.</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-bold">Bloqueio em massa por periodo</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="block-start">Inicio</Label>
              <Input
                id="block-start"
                type="datetime-local"
                value={blockStart}
                onChange={(e) => setBlockStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="block-end">Fim</Label>
              <Input
                id="block-end"
                type="datetime-local"
                value={blockEnd}
                onChange={(e) => setBlockEnd(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <Label htmlFor="block-reason">Motivo (opcional)</Label>
            <Textarea
              id="block-reason"
              rows={2}
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Ferias, almoco, evento, indisponivel..."
            />
          </div>
          <div className="mt-3">
            <Button size="sm" onClick={handleCreateBlock} disabled={savingBlock || !managedProfessionalId}>
              {savingBlock ? "Salvando..." : "Adicionar bloqueio"}
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Bloqueios ativos/futuros</p>
            {periodBlocks.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum bloqueio cadastrado.</p>
            ) : (
              periodBlocks.map((block) => (
                <div key={block.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <div>
                    <p className="text-xs font-medium">
                      {format(new Date(block.start_at), "dd/MM HH:mm")} {" -> "} {format(new Date(block.end_at), "dd/MM HH:mm")}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{block.reason || "Sem motivo informado"}</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => handleRemoveBlock(block.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : appointments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhuma consulta para este dia.
            </div>
          ) : (
            appointments.map((apt) => {
              const action = statusActions.find((a) => a.from === apt.status);
              return (
                <div key={apt.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{apt.patient_name}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(apt.starts_at), "HH:mm")} {apt.type ? `| ${apt.type}` : ""}</p>
                    </div>
                    <StatusChip status={apt.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {action && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(apt.id, action.to)}>
                        {action.label}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleWhatsAppReminder(apt)}>
                      <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> WhatsApp
                    </Button>
                  </div>
                  {apt.notes && <p className="mt-2 text-xs text-muted-foreground">{apt.notes}</p>}
                  {apt.audio_note_path && (
                    <div className="mt-2">
                      <AppointmentAudioPlayer audioPath={apt.audio_note_path} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

const StatCard = ({ label, value, loading }: { label: string; value: number; loading: boolean }) => (
  <div className="rounded-xl border border-border bg-card p-3 text-center">
    {loading ? <Skeleton className="mx-auto h-7 w-10" /> : <p className="text-2xl font-extrabold">{value}</p>}
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

export default MinhaAgenda;
