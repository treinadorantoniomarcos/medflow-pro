import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Phone, Calendar, MapPin, FileText, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Patient } from "@/hooks/use-patients";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  // Fetch appointment history for this patient
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

  const statusLabel = patient.status === "active" ? "Ativo" : "Inativo";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[440px] overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              {initials}
            </div>
            <div className="flex-1">
              <SheetTitle className="text-lg">{patient.full_name}</SheetTitle>
              <Badge
                variant={patient.status === "active" ? "default" : "secondary"}
                className="mt-1"
              >
                {statusLabel}
              </Badge>
            </div>
          </div>
        </SheetHeader>

        <Separator />

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
      </SheetContent>
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
