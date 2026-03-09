import { useMemo } from "react";
import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
  email?: string;
}

interface Criterion {
  label: string;
  met: boolean;
}

const PasswordStrengthIndicator = ({ password, email }: PasswordStrengthIndicatorProps) => {
  const criteria: Criterion[] = useMemo(() => {
    const emailPrefix = email?.split("@")[0]?.trim().toLowerCase();
    return [
      { label: "12+ caracteres", met: password.length >= 12 },
      { label: "Letra minúscula", met: /[a-z]/.test(password) },
      { label: "Letra maiúscula", met: /[A-Z]/.test(password) },
      { label: "Número", met: /[0-9]/.test(password) },
      { label: "Caractere especial", met: /[^A-Za-z0-9]/.test(password) },
      { label: "Sem espaços", met: password.length > 0 && !/\s/.test(password) },
      ...(emailPrefix && emailPrefix.length >= 3
        ? [{ label: "Não contém parte do e-mail", met: !password.toLowerCase().includes(emailPrefix) }]
        : []),
    ];
  }, [password, email]);

  const metCount = criteria.filter((c) => c.met).length;
  const total = criteria.length;
  const ratio = total > 0 ? metCount / total : 0;

  const strengthLabel = ratio === 0
    ? ""
    : ratio < 0.5
      ? "Fraca"
      : ratio < 1
        ? "Média"
        : "Forte";

  const barColor = ratio === 0
    ? "bg-muted"
    : ratio < 0.5
      ? "bg-destructive"
      : ratio < 1
        ? "bg-yellow-500"
        : "bg-green-500";

  if (password.length === 0) return null;

  return (
    <div className="space-y-2 animate-fade-in">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
        <span className={`text-xs font-medium min-w-[40px] text-right ${
          ratio < 0.5 ? "text-destructive" : ratio < 1 ? "text-yellow-500" : "text-green-500"
        }`}>
          {strengthLabel}
        </span>
      </div>

      {/* Criteria checklist */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {criteria.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5">
            {c.met ? (
              <Check className="h-3 w-3 text-green-500 shrink-0" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
            <span className={`text-xs ${c.met ? "text-green-500" : "text-muted-foreground"}`}>
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;
