import { useState } from "react";
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

const professionals = [
  { id: "1", name: "Dr. Pedro Pereira" },
  { id: "2", name: "Dra. Mariana Costa" },
  { id: "3", name: "Dr. Gustavo Leite" },
];

const NewAppointmentDialog = () => {
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Consulta agendada com sucesso!", {
      description: "O paciente receberá uma confirmação.",
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-success hover:bg-success/90 text-success-foreground font-semibold shadow-soft">
          <Plus className="h-4 w-4" />
          Novo agendamento
        </Button>
      </DialogTrigger>
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
            <Input id="patient" placeholder="Nome completo" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Horário</Label>
              <Input id="time" type="time" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Profissional</Label>
            <Select required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o profissional" />
              </SelectTrigger>
              <SelectContent>
                {professionals.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Consulta</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primeira">Primeira consulta</SelectItem>
                <SelectItem value="retorno">Retorno</SelectItem>
                <SelectItem value="revisao">Revisão</SelectItem>
                <SelectItem value="emergencia">Emergência</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" placeholder="Observações opcionais..." rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              Agendar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewAppointmentDialog;
