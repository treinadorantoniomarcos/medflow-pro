import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Plus, CalendarPlus, ChevronsUpDown, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePatients } from "@/hooks/use-patients";
import { cn } from "@/lib/utils";

interface NewAppointmentDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultDate?: string;
  defaultTime?: string;
  hideTrigger?: boolean;
  lockedProfessionalUserId?: string;
  lockedProfessionalName?: string;
}

const NewAppointmentDialog = ({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultDate,
  defaultTime,
  hideTrigger = false,
  lockedProfessionalUserId,
  lockedProfessionalName,
}: NewAppointmentDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen;

  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPopoverOpen, setPatientPopoverOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [professionalUserId, setProfessionalUserId] = useState("");
  const [professionalName, setProfessionalName] = useState("");
  const [type, setType] = useState("");
  const [notes, setNotes] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);

  // Fetch all patients for the combobox
  const { data: patients = [] } = usePatients("");
  const { data: professionals = [] } = useQuery({
    queryKey: ["team-professionals", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("tenant_id", profile!.tenant_id)
        .not("full_name", "is", null)
        .order("full_name", { ascending: true });

      if (error) throw error;
      return (data ?? []) as { user_id: string; full_name: string }[];
    },
  });

  useEffect(() => {
    if (open) {
      setDate(defaultDate ?? "");
      setTime(defaultTime ?? "");
      setPatientId("");
      setPatientName("");
      setProfessionalUserId(lockedProfessionalUserId ?? "");
      setProfessionalName(lockedProfessionalName ?? "");
      setType("");
      setNotes("");
      setAudioFile(null);
    }
  }, [open, defaultDate, defaultTime, lockedProfessionalName, lockedProfessionalUserId]);

  const handleSelectPatient = (id: string) => {
    const patient = patients.find((p) => p.id === id);
    if (patient) {
      setPatientId(patient.id);
      setPatientName(patient.full_name);
    }
    setPatientPopoverOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id || !user || !patientName.trim() || !professionalName.trim()) return;

    setLoading(true);

    const startsAt = new Date(`${date}T${time}`).toISOString();

    let audioNotePath: string | null = null;
    if (audioFile) {
      if (!audioFile.type.startsWith("audio/")) {
        toast.error("Arquivo de áudio inválido");
        setLoading(false);
        return;
      }
      if (audioFile.size > 15 * 1024 * 1024) {
        toast.error("O áudio deve ter no máximo 15MB.");
        setLoading(false);
        return;
      }

      const extension = audioFile.name.split(".").pop() ?? "webm";
      audioNotePath = `${profile.tenant_id}/${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("appointment-audios")
        .upload(audioNotePath, audioFile, { upsert: false });

      if (uploadError) {
        toast.error("Erro ao enviar áudio", { description: uploadError.message });
        setLoading(false);
        return;
      }
    }

    const { error } = await supabase.from("appointments").insert({
      tenant_id: profile.tenant_id,
      patient_name: patientName.trim(),
      professional_user_id: professionalUserId || null,
      professional_name: professionalName.trim(),
      starts_at: startsAt,
      type: type || null,
      notes: notes.trim() || null,
      audio_note_path: audioNotePath,
      created_by: user.id,
      status: "scheduled",
    });

    if (error) {
      toast.error("Erro ao agendar", { description: error.message });
    } else {
      toast.success("Consulta agendada com sucesso!", {
        description: "O paciente receberá uma confirmação.",
      });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["professional-agenda"] });
      queryClient.invalidateQueries({ queryKey: ["professional-stats"] });
      setOpen(false);
    }
    setLoading(false);
  };

  const dialogContent = (
    <DialogContent className="sm:max-w-[480px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-lg">
          <CalendarPlus className="h-5 w-5 text-primary" />
          Novo Agendamento
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Patient combobox */}
        <div className="space-y-2">
          <Label>Paciente</Label>
          <Popover open={patientPopoverOpen} onOpenChange={setPatientPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={patientPopoverOpen}
                className="w-full justify-between font-normal"
              >
                {patientName || "Selecione um paciente..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar paciente..." />
                <CommandList>
                  <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
                  <CommandGroup>
                    {patients.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={p.full_name}
                        onSelect={() => handleSelectPatient(p.id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            patientId === p.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div>
                          <span className="text-sm font-medium">{p.full_name}</span>
                          {p.phone && (
                            <span className="ml-2 text-xs text-muted-foreground">{p.phone}</span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Profissional</Label>
          <Select
            value={professionalUserId}
            onValueChange={(value) => {
              setProfessionalUserId(value);
              const prof = professionals.find((item) => item.user_id === value);
              setProfessionalName(prof?.full_name ?? "");
            }}
            disabled={!!lockedProfessionalUserId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o profissional" />
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
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Horário</Label>
            <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Tipo de Consulta</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Primeira consulta">Primeira consulta</SelectItem>
              <SelectItem value="Retorno">Retorno</SelectItem>
              <SelectItem value="Entrega de exames">Entrega de exames</SelectItem>
              <SelectItem value="Revisão">Revisão</SelectItem>
              <SelectItem value="Emergência">Emergência</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea id="notes" placeholder="Observações opcionais..." rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="audio-note">Áudio (opcional)</Label>
          <Input
            id="audio-note"
            type="file"
            accept="audio/*"
            onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
          />
          {audioFile && (
            <p className="text-xs text-muted-foreground">
              Arquivo selecionado: {audioFile.name}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={loading || !patientName.trim() || !professionalName.trim()}>{loading ? "Agendando..." : "Agendar"}</Button>
        </div>
      </form>
    </DialogContent>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button className="gap-2 bg-success hover:bg-success/90 text-success-foreground font-semibold shadow-soft">
            <Plus className="h-4 w-4" />
            Novo agendamento
          </Button>
        </DialogTrigger>
      )}
      {dialogContent}
    </Dialog>
  );
};

export default NewAppointmentDialog;

