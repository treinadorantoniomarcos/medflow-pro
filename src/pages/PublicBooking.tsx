import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { format, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays,
  Clock,
  User,
  CheckCircle2,
  ChevronLeft,
  Stethoscope,
  Phone,
  CreditCard,
  Download,
  Share2,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import medfluxLogo from "@/assets/medflux-logo.png";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import AudioRecorder from "@/components/audio/AudioRecorder";
import HelpIcon from "@/components/tutorial/HelpIcon";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface ClinicInfo {
  id: string;
  name: string;
  logo_url: string | null;
  slug: string;
}

interface Professional {
  user_id: string;
  name: string;
  avatar_url: string | null;
  accepting_bookings: boolean;
}

interface SlotOverride {
  professional_name: string;
  slot_time: string;
  is_available: boolean;
}

interface PeriodBlock {
  professional_name: string;
  start_at: string;
  end_at: string;
  reason: string | null;
}

interface WorkHours {
  start: number;
  end: number;
  slotDuration: number;
}

type Step = "professional" | "datetime" | "info" | "confirmed";

const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const PublicBooking = () => {
  const { slug } = useParams<{ slug: string }>();
  const [clinic, setClinic] = useState<ClinicInfo | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [workHours, setWorkHours] = useState<WorkHours>({ start: 8, end: 18, slotDuration: 60 });
  const [bookedSlots, setBookedSlots] = useState<{ starts_at: string; professional_name: string }[]>([]);
  const [slotOverrides, setSlotOverrides] = useState<SlotOverride[]>([]);
  const [periodBlocks, setPeriodBlocks] = useState<PeriodBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>("professional");
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientCpf, setPatientCpf] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const confirmationRef = useRef<HTMLDivElement>(null);

  const handleAudioRecording = useCallback((blob: Blob | null) => {
    setAudioBlob(blob);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (!navigator.share || !selectedProfessional || !selectedDate) return;
    const dateStr = format(selectedDate, "dd/MM/yyyy");
    try {
      await navigator.share({
        title: `Agendamento - ${clinic?.name}`,
        text: `Consulta com ${selectedProfessional.name} em ${dateStr} Ã s ${selectedTime} - ${clinic?.name}`,
      });
    } catch { /* user cancelled */ }
  };

  const handleWhatsAppShare = () => {
    if (!selectedProfessional || !selectedDate || !patientPhone) return;

    const dateStr = format(selectedDate, "dd/MM/yyyy");
    const message = [
      `Confirmacao de agendamento`,
      ``,
      `Paciente: ${patientName}`,
      `Profissional: ${selectedProfessional.name}`,
      `Data: ${dateStr}`,
      `Horario: ${selectedTime}`,
      `Clinica: ${clinic?.name ?? "MedFlux Pro"}`,
      ``,
      `Seu agendamento foi confirmado com sucesso.`,
    ].join("\n");

    const url = buildWhatsAppUrl(patientPhone, message);
    if (!url) {
      toast.error("Numero de WhatsApp invalido.");
      return;
    }

    window.open(url, "_blank");
  };

  const fetchClinic = async () => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/public-booking?slug=${slug}`,
        { headers: { apikey: SUPABASE_ANON_KEY } }
      );
      if (!res.ok) { setError("ClÃ­nica nÃ£o encontrada"); setLoading(false); return; }
      const data = await res.json();
      setClinic(data.clinic);
      setProfessionals(data.professionals);
      setWorkHours(data.workHours);
      setLoading(false);
    } catch {
      setError("Erro ao carregar dados da clÃ­nica");
      setLoading(false);
    }
  };

  const fetchSlots = async (date: Date) => {
    if (!slug) return;
    const dateStr = format(date, "yyyy-MM-dd");
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/public-booking?slug=${slug}&date=${dateStr}`,
        { headers: { apikey: SUPABASE_ANON_KEY } }
      );
      if (res.ok) {
        const data = await res.json();
        setBookedSlots(data.bookedSlots);
        setSlotOverrides(data.slotOverrides ?? []);
        setPeriodBlocks(data.periodBlocks ?? []);
      }
    } catch { /* silent */ }
  };

  useEffect(() => { if (slug) fetchClinic(); }, [slug]);
  useEffect(() => { if (selectedDate) fetchSlots(selectedDate); }, [selectedDate]);

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    const { start, end, slotDuration } = workHours;
    for (let h = start; h < end; h++) {
      for (let m = 0; m < 60; m += slotDuration) {
        if (h + m / 60 >= end) break;
        slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }
    }
    return slots;
  }, [workHours]);

  const availableSlots = useMemo(() => {
    if (!selectedDate || !selectedProfessional) return timeSlots;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return timeSlots.filter((time) => {
      const slotIso = `${dateStr}T${time}:00`;
      const slotDateTime = new Date(slotIso);

      const blockedByPeriod = periodBlocks.some((block) => {
        if (block.professional_name !== selectedProfessional.name) return false;
        const start = new Date(block.start_at);
        const end = new Date(block.end_at);
        return slotDateTime >= start && slotDateTime < end;
      });
      if (blockedByPeriod) return false;

      const override = slotOverrides.find(
        (item) => item.professional_name === selectedProfessional.name && item.slot_time === time
      );
      if (override && !override.is_available) return false;
      return !bookedSlots.some(
        (b) =>
          b.professional_name === selectedProfessional.name &&
          b.starts_at.startsWith(slotIso.slice(0, 16))
      );
    });
  }, [timeSlots, bookedSlots, slotOverrides, periodBlocks, selectedDate, selectedProfessional]);

  const isFormValid = patientName.trim().length >= 3 && patientPhone.replace(/\D/g, "").length >= 10 && patientCpf.replace(/\D/g, "").length === 11;

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !selectedProfessional || !isFormValid) return;
    setSubmitting(true);

    const startsAt = `${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}:00`;

    let audioBase64: string | null = null;
    if (audioBlob) {
      try {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        audioBase64 = btoa(binary);
      } catch { /* skip audio */ }
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/public-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({
          slug,
          patient_name: patientName.trim(),
          patient_phone: patientPhone.replace(/\D/g, ""),
          patient_cpf: patientCpf.replace(/\D/g, ""),
          professional_name: selectedProfessional.name,
          starts_at: startsAt,
          audio_base64: audioBase64,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.error === "slot_already_booked") {
          toast.error("Esse horario acabou de ser reservado. Escolha outro.");
          setStep("datetime");
          setSelectedTime("");
          if (selectedDate) fetchSlots(selectedDate);
        } else if (err.error === "slot_closed_by_professional") {
          toast.error("Este horario foi fechado pelo profissional.", { description: "Escolha outro horario." });
          setStep("datetime");
          setSelectedTime("");
          if (selectedDate) fetchSlots(selectedDate);
        } else if (err.error === "slot_blocked_by_period") {
          toast.error("Horario indisponivel por bloqueio de agenda.", {
            description: "Escolha outro horario disponivel.",
          });
          setStep("datetime");
          setSelectedTime("");
          if (selectedDate) fetchSlots(selectedDate);
        } else if (err.error === "professional_not_accepting") {
          toast.error("Este profissional fechou a agenda.", { description: "Escolha outro profissional." });
          setStep("professional");
        } else {
          toast.error("Erro ao agendar. Tente novamente.");
        }
        setSubmitting(false);
        return;
      }
      setStep("confirmed");
    } catch {
      toast.error("Erro de conexÃ£o. Tente novamente.");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !clinic) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center space-y-3">
          <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <h1 className="text-xl font-bold text-foreground">ClÃ­nica nÃ£o encontrada</h1>
          <p className="text-sm text-muted-foreground">Verifique o link de agendamento com sua clÃ­nica.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src={clinic.logo_url || medfluxLogo} alt={clinic.name} className="h-10 w-10 rounded-lg object-cover" />
            <div>
              <h1 className="text-lg font-bold text-foreground">{clinic.name}</h1>
              <p className="text-xs text-muted-foreground">Agendamento online</p>
            </div>
          </div>
          <HelpIcon screen="public_booking" />
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-xl space-y-6">
          {/* Step indicator */}
          {step !== "confirmed" && (
            <div className="flex items-center gap-2 justify-center">
              {(["professional", "datetime", "info"] as Step[]).map((s, i) => (
                <div
                  key={s}
                  className={cn(
                    "h-2 w-12 rounded-full transition-colors",
                    step === s || (["professional", "datetime", "info"].indexOf(step) > i) ? "bg-primary" : "bg-muted"
                  )}
                />
              ))}
            </div>
          )}

          {/* Step 1: Select Professional */}
          {step === "professional" && (
            <div className="space-y-4 animate-fade-in" data-tutorial-target="booking-professional">
              <div className="text-center space-y-1">
                <Stethoscope className="h-8 w-8 mx-auto text-primary" />
                <h2 className="text-xl font-bold text-foreground">Escolha o profissional</h2>
                <p className="text-sm text-muted-foreground">Selecione com quem deseja agendar</p>
              </div>

              <div className="space-y-2">
                {professionals.filter((p) => p.accepting_bookings).length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">Nenhum profissional disponÃ­vel no momento.</p>
                ) : (
                  professionals.map((p) => {
                    const closed = !p.accepting_bookings;
                    return (
                      <button
                        key={p.name}
                        disabled={closed}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
                          closed
                            ? "border-border bg-muted/50 opacity-60 cursor-not-allowed"
                            : selectedProfessional?.name === p.name
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border bg-card hover:border-primary/40"
                        )}
                        onClick={() => {
                          if (closed) return;
                          setSelectedProfessional(p);
                          setStep("datetime");
                        }}
                      >
                        {p.avatar_url ? (
                          <img
                            src={p.avatar_url}
                            alt={p.name}
                            className={cn(
                              "h-12 w-12 rounded-full object-cover border-2 shrink-0",
                              closed ? "border-muted-foreground/20 grayscale" : "border-primary/20"
                            )}
                          />
                        ) : (
                          <div className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold shrink-0",
                            closed ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                          )}>
                            {p.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-foreground block truncate">{p.name}</span>
                          {closed && (
                            <span className="text-[10px] text-muted-foreground">Agenda fechada</span>
                          )}
                        </div>
                        {!closed && (
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Step 2: Select Date & Time */}
          {step === "datetime" && (
            <div className="space-y-4 animate-fade-in" data-tutorial-target="booking-datetime">
              <button
                onClick={() => { setStep("professional"); setSelectedDate(undefined); setSelectedTime(""); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </button>

              <div className="text-center space-y-1">
                <CalendarDays className="h-8 w-8 mx-auto text-primary" />
                <h2 className="text-xl font-bold text-foreground">Escolha a data e horÃ¡rio</h2>
                <p className="text-sm text-muted-foreground">
                  Profissional: <span className="font-medium text-foreground">{selectedProfessional?.name}</span>
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="bg-card rounded-xl border border-border p-3 flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => { setSelectedDate(d); setSelectedTime(""); }}
                    disabled={(date) => isBefore(date, startOfDay(new Date())) || date.getDay() === 0}
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </div>

                {selectedDate && (
                  <div className="flex-1 bg-card rounded-xl border border-border p-4 space-y-3">
                    <p className="text-sm font-semibold text-foreground">
                      {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </p>
                    {availableSlots.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">Nenhum horÃ¡rio disponÃ­vel nesta data.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 max-h-[260px] overflow-y-auto">
                        {availableSlots.map((time) => (
                          <button
                            key={time}
                            className={cn(
                              "rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                              selectedTime === time
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card text-foreground hover:border-primary/40"
                            )}
                            onClick={() => { setSelectedTime(time); setStep("info"); }}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Patient Info */}
          {step === "info" && (
            <div className="space-y-4 animate-fade-in" data-tutorial-target="booking-info">
              <button
                onClick={() => setStep("datetime")}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </button>

              <div className="text-center space-y-1">
                <User className="h-8 w-8 mx-auto text-primary" />
                <h2 className="text-xl font-bold text-foreground">Seus dados</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedProfessional?.name} â€” {selectedDate && format(selectedDate, "dd/MM")} Ã s {selectedTime}
                </p>
              </div>

              <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="patientName">Nome completo *</Label>
                  <Input
                    id="patientName"
                    placeholder="Seu nome completo"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    maxLength={100}
                  />
                  {patientName.length > 0 && patientName.trim().length < 3 && (
                    <p className="text-xs text-destructive">Nome deve ter pelo menos 3 caracteres</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patientPhone">WhatsApp *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="patientPhone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      className="pl-9"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(formatPhone(e.target.value))}
                      maxLength={16}
                    />
                  </div>
                  {patientPhone.length > 0 && patientPhone.replace(/\D/g, "").length < 10 && (
                    <p className="text-xs text-destructive">Informe um nÃºmero de WhatsApp vÃ¡lido</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patientCpf">CPF *</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="patientCpf"
                      placeholder="000.000.000-00"
                      className="pl-9"
                      value={patientCpf}
                      onChange={(e) => setPatientCpf(formatCpf(e.target.value))}
                      maxLength={14}
                    />
                  </div>
                  {patientCpf.length > 0 && patientCpf.replace(/\D/g, "").length < 11 && (
                    <p className="text-xs text-destructive">Informe um CPF vÃ¡lido com 11 dÃ­gitos</p>
                  )}
                </div>

                {/* Audio note */}
                <div className="space-y-2">
                  <Label>ObservaÃ§Ã£o em Ã¡udio</Label>
                  <AudioRecorder onRecordingComplete={handleAudioRecording} maxDurationSeconds={60} />
                  <p className="text-xs text-muted-foreground">Grave uma mensagem de atÃ© 60s para o profissional (opcional)</p>
                </div>

                {/* Summary */}
                <div className="rounded-lg bg-secondary/50 p-3 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resumo</p>
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Stethoscope className="h-3.5 w-3.5 text-primary" />
                    {selectedProfessional?.name}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" />
                    {selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    {selectedTime}
                  </div>
                </div>

                <Button className="w-full" disabled={!isFormValid || submitting} onClick={handleSubmit}>
                  {submitting ? "Agendando..." : "Confirmar agendamento"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === "confirmed" && (
            <div className="space-y-6 py-8 animate-fade-in">
              <div className="text-center space-y-2">
                <CheckCircle2 className="h-16 w-16 mx-auto text-primary" />
                <h2 className="text-2xl font-bold text-foreground">Agendamento confirmado!</h2>
                <p className="text-sm text-muted-foreground">Guarde este comprovante para sua referÃªncia.</p>
              </div>

              {/* Confirmation card */}
              <div ref={confirmationRef} data-print-area className="bg-card rounded-xl border border-border p-6 space-y-5">
                <div className="flex items-center gap-3 pb-4 border-b border-border">
                  <img src={clinic.logo_url || medfluxLogo} alt={clinic.name} className="h-10 w-10 rounded-lg object-cover" />
                  <div>
                    <p className="font-bold text-foreground">{clinic.name}</p>
                    <p className="text-xs text-muted-foreground">Comprovante de Agendamento</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Paciente</p>
                      <p className="text-sm font-semibold text-foreground">{patientName}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    {selectedProfessional?.avatar_url ? (
                      <img src={selectedProfessional.avatar_url} alt="" className="h-4 w-4 mt-0.5 rounded-full object-cover shrink-0" />
                    ) : (
                      <Stethoscope className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Profissional</p>
                      <p className="text-sm font-semibold text-foreground">{selectedProfessional?.name}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CalendarDays className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Data</p>
                      <p className="text-sm font-semibold text-foreground">
                        {selectedDate && format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">HorÃ¡rio</p>
                      <p className="text-sm font-semibold text-foreground">{selectedTime}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border text-center">
                  <p className="text-xs text-muted-foreground">
                    Em caso de impossibilidade, entre em contato para reagendar.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button className="flex-1" onClick={handlePrint}>
                  <Download className="h-4 w-4 mr-2" />
                  Salvar comprovante
                </Button>
                <Button variant="outline" className="flex-1" onClick={handleWhatsAppShare}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Enviar no WhatsApp
                </Button>
                {!!navigator.share && (
                  <Button variant="outline" className="flex-1" onClick={handleShare}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Compartilhar
                  </Button>
                )}
              </div>

              <div className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStep("professional");
                    setSelectedProfessional(null);
                    setSelectedDate(undefined);
                    setSelectedTime("");
                    setPatientName("");
                    setPatientPhone("");
                    setPatientCpf("");
                  }}
                >
                  Fazer novo agendamento
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-border bg-card px-4 py-3 text-center">
        <p className="text-xs text-muted-foreground">
          Powered by <span className="font-semibold text-primary">MedFlux Pro</span>
        </p>
      </footer>
    </div>
  );
};

export default PublicBooking;



