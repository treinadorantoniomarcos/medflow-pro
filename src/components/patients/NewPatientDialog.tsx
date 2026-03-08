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
import { Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useCreatePatient } from "@/hooks/use-patients";

const NewPatientDialog = () => {
  const [open, setOpen] = useState(false);
  const createPatient = useCreatePatient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [cpf, setCpf] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setDob("");
    setGender("");
    setCpf("");
    setAddress("");
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPatient.mutateAsync({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        date_of_birth: dob || undefined,
        gender: gender || undefined,
        cpf: cpf.trim(),
        address: address.trim(),
        notes: notes.trim(),
      });
      toast.success("Paciente cadastrado com sucesso!");
      resetForm();
      setOpen(false);
    } catch (err: any) {
      toast.error("Erro ao cadastrar paciente", { description: err.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-success hover:bg-success/90 text-success-foreground font-semibold shadow-soft">
          <Plus className="h-4 w-4" />
          Novo paciente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5 text-primary" />
            Novo Paciente
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo</Label>
            <Input id="fullName" placeholder="Nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={100} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" placeholder="email@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" placeholder="(11) 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="dob">Data de Nascimento</Label>
              <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Gênero</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="female">Feminino</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(e.target.value)} maxLength={14} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" placeholder="Endereço" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" placeholder="Observações opcionais..." rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={createPatient.isPending}>
              {createPatient.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewPatientDialog;
