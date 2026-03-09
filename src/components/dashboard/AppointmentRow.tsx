import { ChevronRight } from "lucide-react";
import StatusChip, { type AppointmentStatus } from "./StatusChip";
import { cn } from "@/lib/utils";

export interface Appointment {
  id: string;
  time: string;
  patientName: string;
  patientInitials: string;
  type: string;
  status: AppointmentStatus;
  alert?: string;
  progress?: number;
}

interface AppointmentRowProps {
  appointment: Appointment;
  className?: string;
  onClick?: () => void;
}

const AppointmentRow = ({ appointment, className, onClick }: AppointmentRowProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg bg-card p-4 text-left shadow-soft transition-all hover:shadow-medium hover:scale-[1.005] active:scale-[0.998]",
        className
      )}
    >
      <div className="min-w-[68px] shrink-0">
        <p className="text-xl font-extrabold tabular-nums text-foreground">{appointment.time}</p>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Horario</p>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{appointment.patientName}</p>
        <p className="text-xs text-muted-foreground">{appointment.type}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <StatusChip status={appointment.status} />
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>

      {appointment.alert && (
        <span className="hidden lg:inline-flex items-center rounded bg-warning/10 px-2 py-1 text-[10px] font-medium text-warning">
          {appointment.alert}
        </span>
      )}
    </button>
  );
};

export default AppointmentRow;
