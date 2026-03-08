import { cn } from "@/lib/utils";

export type AppointmentStatus =
  | "confirmada"
  | "agendada"
  | "em_atendimento"
  | "concluida"
  | "no_show"
  | "cancelada"
  | "remarcada"
  | "disponivel";

const statusConfig: Record<AppointmentStatus, { label: string; className: string }> = {
  confirmada: { label: "Confirmada", className: "bg-success/15 text-success border-success/25" },
  agendada: { label: "Agendada", className: "bg-primary/15 text-primary border-primary/25" },
  em_atendimento: { label: "Em atendimento", className: "bg-warning/15 text-warning border-warning/25" },
  concluida: { label: "Concluída", className: "bg-muted text-muted-foreground border-border" },
  no_show: { label: "No-show", className: "bg-destructive/15 text-destructive border-destructive/25" },
  cancelada: { label: "Cancelada", className: "bg-destructive/10 text-destructive border-destructive/20" },
  remarcada: { label: "Remarcada", className: "bg-accent/15 text-accent border-accent/25" },
  disponivel: { label: "Disponível", className: "bg-lime/15 text-lime border-lime/25" },
};

interface StatusChipProps {
  status: AppointmentStatus;
  className?: string;
}

const StatusChip = ({ status, className }: StatusChipProps) => {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        config.className,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
};

export default StatusChip;
