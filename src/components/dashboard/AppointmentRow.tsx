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
        "flex w-full items-center gap-3 rounded-lg bg-card p-3.5 text-left shadow-soft transition-all hover:shadow-medium hover:scale-[1.005] active:scale-[0.998]",
        className
      )}
    >
      {/* Avatar */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
        {appointment.patientInitials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground truncate">
            {appointment.patientName}
          </span>
          {appointment.alert && (
            <span className="text-[10px] font-medium text-warning bg-warning/10 px-1.5 py-0.5 rounded">
              ⚠ {appointment.alert}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{appointment.type}</p>
      </div>

      {/* Status */}
      <StatusChip status={appointment.status} />

      {/* Time */}
      <span className="text-lg font-bold tabular-nums text-foreground">{appointment.time}</span>

      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
};

export default AppointmentRow;
