import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Enums } from "@/integrations/supabase/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Enums<"app_role">[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, loading, needsOnboarding, profile } = useAuth();

  const { data: userRole, isLoading: loadingRole } = useQuery({
    queryKey: ["protected-route-role", user?.id, profile?.tenant_id],
    enabled: !!allowedRoles?.length && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, tenant_id")
        .eq("user_id", user!.id);

      if (error) throw error;
      const roles = (data ?? []) as Array<{ role: Enums<"app_role">; tenant_id: string }>;
      const superAdmin = roles.find((item) => item.role === "super_admin");
      if (superAdmin) return "super_admin" as Enums<"app_role">;
      const scoped = roles.find((item) => item.tenant_id === profile?.tenant_id);
      return (scoped?.role ?? null) as Enums<"app_role"> | null;
    },
  });

  if (loading || loadingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;
  if (allowedRoles?.length && (!userRole || !allowedRoles.includes(userRole))) {
    if (userRole === "super_admin") return <Navigate to="/super-admin" replace />;
    return <Navigate to={userRole === "patient" ? "/paciente/home" : "/"} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
