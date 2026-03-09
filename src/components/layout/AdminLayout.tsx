import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Calendar,
  Stethoscope,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  Search,
  Bell,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import medfluxLogo from "@/assets/medflux-logo.png";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "owner" | "admin" | "professional" | "receptionist" | "patient";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems: Array<{ icon: any; label: string; path: string; roles: AppRole[] }> = [
  { icon: LayoutDashboard, label: "Inicio", path: "/", roles: ["owner", "admin", "professional", "receptionist"] },
  { icon: Calendar, label: "Agenda", path: "/agenda", roles: ["owner", "admin", "receptionist"] },
  { icon: Stethoscope, label: "Minha Agenda", path: "/minha-agenda", roles: ["owner", "admin", "professional"] },
  { icon: Users, label: "Pacientes", path: "/pacientes", roles: ["owner", "admin", "receptionist"] },
  { icon: MessageSquare, label: "Mensagens", path: "/mensagens", roles: ["owner", "admin", "receptionist"] },
  { icon: BarChart3, label: "Relatorios", path: "/relatorios", roles: ["owner", "admin"] },
  { icon: Settings, label: "Configuracoes", path: "/configuracoes", roles: ["owner", "admin"] },
];

const roleLabelMap: Record<AppRole, string> = {
  owner: "Owner",
  admin: "Admin",
  professional: "Profissional",
  receptionist: "Recepcao",
  patient: "Paciente",
};

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { profile, user, signOut } = useAuth();

  const { data: userRole } = useQuery<AppRole | null>({
    queryKey: ["layout-user-role", user?.id, profile?.tenant_id],
    enabled: !!user?.id && !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("tenant_id", profile!.tenant_id)
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return (data?.role as AppRole | undefined) ?? null;
    },
  });

  const visibleNavItems = userRole
    ? navItems.filter((item) => item.roles.includes(userRole))
    : navItems;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-border bg-card transition-transform duration-300 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-border px-5">
          <img src={medfluxLogo} alt="MedFlux Pro" className="h-9 w-9" />
          <span className="text-lg font-extrabold tracking-tight text-foreground">
            MedFlux <span className="font-semibold text-muted-foreground">Pro</span>
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {profile?.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
            </div>
            <div className="flex-1 truncate">
              <p className="text-sm font-semibold text-foreground">{profile?.full_name || "Usuario"}</p>
              <p className="text-xs text-muted-foreground">{(userRole && roleLabelMap[userRole]) || "Conta"}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar..." className="pl-9 bg-secondary border-0 h-10" />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground"
              title={theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
            >
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                3
              </span>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
