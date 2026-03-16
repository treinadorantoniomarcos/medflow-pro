import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type AppRole = "admin" | "owner" | "professional" | "receptionist" | "patient" | "super_admin";
type SubscriptionStatus = "trialing" | "active" | "past_due" | "paused" | "canceled";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, loading, needsOnboarding, profile, signOut } = useAuth();

  const { data: userRole, isLoading: loadingRole } = useQuery({
    queryKey: ["protected-route-role", user?.id, profile?.tenant_id],
    enabled: !!allowedRoles?.length && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, tenant_id")
        .eq("user_id", user!.id);

      if (error) throw error;
      const roles = (data ?? []) as Array<{ role: AppRole; tenant_id: string }>;
      const superAdmin = roles.find((item) => item.role === "super_admin");
      if (superAdmin) return "super_admin" as AppRole;
      const scoped = roles.find((item) => item.tenant_id === profile?.tenant_id);
      return (scoped?.role ?? null) as AppRole | null;
    },
  });

  const { data: accessState, isLoading: loadingSubscription } = useQuery({
    queryKey: ["protected-route-subscription", profile?.tenant_id, userRole],
    enabled: !!profile?.tenant_id && !!userRole && userRole !== "super_admin" && userRole !== "patient",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinics")
        .select("settings")
        .eq("id", profile!.tenant_id)
        .maybeSingle();

      if (error) throw error;

      const settings = (data?.settings ?? {}) as Record<string, any>;
      const subscription = (settings.subscription ?? {}) as Record<string, any>;
      const status = (["trialing", "active", "past_due", "paused", "canceled"].includes(subscription.status)
        ? subscription.status
        : "trialing") as SubscriptionStatus;
      const graceUntil = subscription.grace_until ? new Date(subscription.grace_until) : null;
      const currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end) : null;
      const now = new Date();

      const blockedByStatus = status === "paused" || status === "canceled";
      const blockedByGrace = status === "past_due" && graceUntil ? graceUntil < now : false;
      const expiredTrial = status === "trialing" && currentPeriodEnd ? currentPeriodEnd < now : false;

      return {
        status,
        expiredTrial,
        blocked: blockedByStatus || blockedByGrace,
      };
    },
  });

  if (loading || loadingRole || loadingSubscription) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;
  if (accessState?.expiredTrial) {
    return <Navigate to="/onboarding?mode=upgrade" replace />;
  }
  if (accessState?.blocked) {
    const pendingRelease = accessState.status === "paused";
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <h2 className="text-xl font-bold text-foreground">
            {pendingRelease ? "Aguardando liberacao do Super Admin" : "Acesso temporariamente bloqueado"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {pendingRelease ? (
              <>
                Seu cadastro e pagamento foram registrados. O acesso sera liberado apos validacao do Super Admin.
              </>
            ) : (
              <>
                Assinatura em status <span className="font-medium text-foreground">{accessState.status}</span>.
                Regularize a cobranca para reativar o uso da plataforma.
              </>
            )}
          </p>
          <Button className="mt-4 w-full" variant="outline" onClick={() => signOut()}>
            Sair
          </Button>
        </div>
      </div>
    );
  }
  if (allowedRoles?.length && (!userRole || !allowedRoles.includes(userRole))) {
    if (userRole === "super_admin") return <Navigate to="/super-admin" replace />;
    return <Navigate to={userRole === "patient" ? "/paciente/home" : "/"} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
