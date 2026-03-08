import { useState, useEffect } from "react";
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
import { Plus, CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

interface NewAppointmentDialogProps {
  /** Control open state externally */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Pre-fill date (YYYY-MM-DD) */
  defaultDate?: string;
  /** Pre-fill time (HH:mm) */
  defaultTime?: string;
  /** Hide the trigger button when controlled externally */
  hideTrigger?: boolean;
}

const NewAppointmentDialog = ({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultDate,
  defaultTime,
  hideTrigger = false,
}: NewAppointmentDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen;

  const [patientName, setPatientName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [professionalName, setProfessionalName] = useState("");
  const [type, setType] = useState("");
  const [notes, setNotes] = useState("");

  // Sync defaults when dialog opens
  useEffect(() => {
    if (open) {
      setDate(defaultDate ?? "");
      setTime(defaultTime ?? "");
      setPatientName("");
      setProfessionalName("");
      setType("");
      setNotes("");
    }
  }, [open, defaultDate, defaultTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id || !user) return;

    setLoading(true);

    const startsAt = new Date(`${date}T${time}`).toISOString();

    const { error } = await supabase.from("appointments").insert({
      tenant_id: profile.tenant_id,
      patient_name: patientName.trim(),
      professional_name: professionalName.trim(),
      starts_at: startsAt,
      type: type || null,
      notes: notes.trim() || null,
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
        <div className="space-y-2">
          <Label htmlFor="patient">Nome do Paciente</Label>
          <Input id="patient" placeholder="Nome completo" value={patientName} onChange={(e) => setPatientName(e.target.value)} required maxLength={100} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="professional">Nome do Profissional</Label>
          <Input id="professional" placeholder="Nome do profissional" value={professionalName} onChange={(e) => setProfessionalName(e.target.value)} required maxLength={100} />
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
              <SelectItem value="Revisão">Revisão</SelectItem>
              <SelectItem value="Emergência">Emergência</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea id="notes" placeholder="Observações opcionais..." rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={loading}>{loading ? "Agendando..." : "Agendar"}</Button>
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
