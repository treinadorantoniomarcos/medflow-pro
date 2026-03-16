import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Mail, Phone, Calendar, MapPin, FileText, CreditCard, Pencil, X, MessageCircle } from "lucide-react";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Patient } from "@/hooks/use-patients";
import { useDeletePatient, useUpdatePatient } from "@/hooks/use-patients";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PatientDetailSheetProps {
  patient: Patient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const genderLabel: Record<string, string> = {
  male: "Masculino",
  female: "Feminino",
  other: "Outro",
};

const PatientDetailSheet = ({ patient, open, onOpenChange }: PatientDetailSheetProps) => {
  const [editing, setEditing] = useState(false);
  const updatePatient = useUpdatePatient();
  const deletePatient = useDeletePatient();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Edit form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [cpf, setCpf] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("active");

  // Sync form when entering edit mode or patient changes
  useEffect(() => {
    if (patient && editing) {
      setFullName(patient.full_name);
      setEmail(patient.email ?? "");
      setPhone(patient.phone ?? "");
      setDob(patient.date_of_birth ?? "");
      setGender(patient.gender ?? "");
      setCpf(patient.cpf ?? "");
      setAddress(patient.address ?? "");
      setNotes(patient.notes ?? "");
      setStatus(patient.status);
    }
  }, [patient, editing]);

  // Reset edit mode when sheet closes
  useEffect(() => {
    if (!open) setEditing(false);
  }, [open]);

  const { data: appointments = [] } = useQuery({
    queryKey: ["patient-appointments", patient?.id],
    enabled: !!patient,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, starts_at, status, type, professional_name")
        .eq("tenant_id", patient!.tenant_id)
        .eq("patient_name", patient!.full_name)
        .order("starts_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data ?? [];
    },
  });

  if (!patient) return null;

  const initials = patient.full_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const statusLabelText = patient.status === "active" ? "Ativo" : "Inativo";

  const handleSave = async () => {
    try {
      await updatePatient.mutateAsync({
        id: patient.id,
        full_name: fullName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        date_of_birth: dob || undefined,
        gender: gender || undefined,
        cpf: cpf.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success("Paciente atualizado!");
      setEditing(false);
    } catch (err: any) {
      toast.error("Erro ao salvar", { description: err.message });
    }
  };

  const handleDelete = async () => {
    try {
      await deletePatient.mutateAsync(patient.id);
      toast.success("Paciente excluído com sucesso!");
      setConfirmDeleteOpen(false);
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao excluir paciente", { description: err.message });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[440px] overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg truncate">{patient.full_name}</SheetTitle>
              <Badge
                variant={patient.status === "active" ? "default" : "secondary"}
                className="mt-1"
              >
                {statusLabelText}
              </Badge>
            </div>
            <div className="flex gap-1 shrink-0">
              {!editing && buildWhatsAppUrl(patient.phone) && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                  asChild
                >
                  <a
                    href={buildWhatsAppUrl(patient.phone)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Abrir WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                </Button>
              )}
              <Button
                variant={editing ? "destructive" : "outline"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setEditing(!editing)}
              >
                {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </SheetHeader>

        <Separator />

        {editing ? (
          /* ========== EDIT MODE ========== */
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={100} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data de Nascimento</Label>
                <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
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
                <Label>CPF</Label>
                <Input value={cpf} onChange={(e) => setCpf(e.target.value)} maxLength={14} />
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={handleSave}
                disabled={updatePatient.isPending || !fullName.trim()}
              >
                {updatePatient.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        ) : (
          /* ========== VIEW MODE ========== */
          <>
            <div className="space-y-4 py-4">
              <h3 className="text-sm font-semibold text-foreground">Informações</h3>
              <div className="space-y-3">
                {patient.email && (
                  <InfoRow icon={<Mail className="h-4 w-4" />} label="E-mail" value={patient.email} />
                )}
                {patient.phone && (
                  <InfoRow icon={<Phone className="h-4 w-4" />} label="Telefone" value={patient.phone} />
                )}
                {patient.date_of_birth && (
                  <InfoRow
                    icon={<Calendar className="h-4 w-4" />}
                    label="Data de Nascimento"
                    value={format(new Date(patient.date_of_birth + "T12:00:00"), "dd/MM/yyyy")}
                  />
                )}
                {patient.gender && (
                  <InfoRow icon={<User className="h-4 w-4" />} label="Gênero" value={genderLabel[patient.gender] ?? patient.gender} />
                )}
                {patient.cpf && (
                  <InfoRow icon={<CreditCard className="h-4 w-4" />} label="CPF" value={patient.cpf} />
                )}
                {patient.address && (
                  <InfoRow icon={<MapPin className="h-4 w-4" />} label="Endereço" value={patient.address} />
                )}
                {patient.notes && (
                  <InfoRow icon={<FileText className="h-4 w-4" />} label="Observações" value={patient.notes} />
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-3 py-4">
              <h3 className="text-sm font-semibold text-foreground">
                Últimas Consultas ({appointments.length})
              </h3>
              {appointments.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma consulta encontrada.</p>
              ) : (
                <div className="space-y-2">
                  {appointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="rounded-md border border-border bg-secondary/50 p-3 space-y-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">
                          {format(new Date(apt.starts_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {apt.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{apt.professional_name}</p>
                      {apt.type && (
                        <p className="text-xs text-muted-foreground">{apt.type}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-[10px] text-muted-foreground pt-2">
              Cadastrado em {format(new Date(patient.created_at), "dd/MM/yyyy", { locale: ptBR })}
            </p>
            <Button
              variant="destructive"
              className="mt-4 w-full"
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={deletePatient.isPending}
            >
              {deletePatient.isPending ? "Excluindo..." : "Excluir paciente"}
            </Button>
          </>
        )}
      </SheetContent>
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir paciente</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o cadastro de {patient.full_name}. Use somente quando tiver certeza.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePatient.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletePatient.isPending}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-3">
    <span className="text-muted-foreground mt-0.5">{icon}</span>
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  </div>
);

export default PatientDetailSheet;
