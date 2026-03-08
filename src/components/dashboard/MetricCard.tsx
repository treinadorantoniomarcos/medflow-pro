import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  value: string | number;
  label: string;
  icon?: LucideIcon;
  variant?: "default" | "accent" | "success" | "warning";
  className?: string;
}

const MetricCard = ({ value, label, icon: Icon, variant = "default", className }: MetricCardProps) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-border bg-card p-4 shadow-soft transition-all hover:shadow-medium",
        variant === "accent" && "border-accent/30 bg-accent/5",
        variant === "success" && "border-success/30 bg-success/5",
        variant === "warning" && "border-warning/30 bg-warning/5",
        className
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            "mb-1 h-5 w-5 text-muted-foreground",
            variant === "accent" && "text-accent",
            variant === "success" && "text-success",
            variant === "warning" && "text-warning"
          )}
        />
      )}
      <span className="text-3xl font-extrabold tracking-tight text-foreground">{value}</span>
      <span className="mt-0.5 text-xs font-medium text-muted-foreground text-center">{label}</span>
    </div>
  );
};

export default MetricCard;
