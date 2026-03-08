import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/components/dashboard/StatusChip";
import type { AgendaAppointment } from "@/hooks/use-agenda";
import StatusChip from "@/components/dashboard/StatusChip";
import { format } from "date-fns";

interface WeeklySlotCardProps {
  appointment: AgendaAppointment;
  compact?: boolean;
}

const WeeklySlotCard = ({ appointment, compact }: WeeklySlotCardProps) => {
  const time = format(new Date(appointment.starts_at), "HH:mm");

  const statusBorderMap: Record<AppointmentStatus, string> = {
    confirmed: "border-l-success",
    scheduled: "border-l-primary",
    in_progress: "border-l-warning",
    completed: "border-l-muted-foreground",
    no_show: "border-l-destructive",
    cancelled: "border-l-destructive",
    rescheduled: "border-l-accent",
    available: "border-l-lime",
  };

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-card p-2 shadow-soft border-l-[3px] transition-all hover:shadow-medium cursor-pointer",
        statusBorderMap[appointment.status],
        compact && "p-1.5"
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-bold tabular-nums text-foreground">{time}</span>
        <StatusChip status={appointment.status} className="scale-[0.85] origin-right" />
      </div>
      <p className="text-xs font-semibold text-foreground truncate mt-0.5">
        {appointment.patient_name}
      </p>
      {!compact && (
        <>
          <p className="text-[10px] text-muted-foreground truncate">
            {appointment.professional_name}
          </p>
          {appointment.type && (
            <p className="text-[10px] text-muted-foreground truncate">{appointment.type}</p>
          )}
        </>
      )}
    </div>
  );
};

export default WeeklySlotCard;
