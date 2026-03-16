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
import { Badge } from "@/components/ui/badge";
import medfluxLogo from "@/assets/medflux-logo.png";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "owner" | "admin" | "professional" | "receptionist" | "patient" | "super_admin";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems: Array<{ icon: any; label: string; path: string; roles: AppRole[] }> = [
  { icon: LayoutDashboard, label: "Super Admin", path: "/super-admin", roles: ["super_admin"] },
  { icon: LayoutDashboard, label: "Início", path: "/", roles: ["owner", "admin", "professional", "receptionist"] },
  { icon: Calendar, label: "Visualização da Agenda", path: "/agenda", roles: ["owner", "admin", "receptionist"] },
  { icon: Stethoscope, label: "Gestão da Agenda", path: "/minha-agenda", roles: ["owner", "admin", "professional"] },
  { icon: Users, label: "Pacientes Cadastrados", path: "/pacientes", roles: ["owner", "admin", "receptionist", "professional"] },
  { icon: MessageSquare, label: "Mensagens", path: "/mensagens", roles: ["owner", "admin", "receptionist"] },
  { icon: BarChart3, label: "Relatórios", path: "/relatorios", roles: ["owner", "admin"] },
  { icon: Settings, label: "Configurações", path: "/configuracoes", roles: ["owner", "admin"] },
];

const roleLabelMap: Record<AppRole, string> = {
  owner: "Owner",
  admin: "Admin",
  professional: "Profissional",
  receptionist: "Recepção",
  patient: "Paciente",
  super_admin: "Super Admin",
};

const roleStyleMap: Record<AppRole, { badgeClass: string; cardClass: string }> = {
  super_admin: {
    badgeClass: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800",
    cardClass: "border-rose-200/70 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/20",
  },
  owner: {
    badgeClass: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800",
    cardClass: "border-violet-200/70 bg-violet-50/60 dark:border-violet-900/50 dark:bg-violet-950/20",
  },
  admin: {
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    cardClass: "border-blue-200/70 bg-blue-50/60 dark:border-blue-900/50 dark:bg-blue-950/20",
  },
  professional: {
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
    cardClass: "border-emerald-200/70 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20",
  },
  receptionist: {
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    cardClass: "border-amber-200/70 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20",
  },
  patient: {
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    cardClass: "border-slate-200/70 bg-slate-50/60 dark:border-slate-700/60 dark:bg-slate-900/30",
  },
};

const roleGuideMap: Record<AppRole, { info: string; actions: string }> = {
  super_admin: {
    info: "Métricas globais de assinantes, equipe e uso da plataforma.",
    actions: "Gerir acessos administrativos, acompanhar a operação e exportar relatórios.",
  },
  owner: {
    info: "Visão completa da clínica: agenda, pacientes, relatórios e equipe.",
    actions: "Convidar equipe, definir regras operacionais e liberar agendas.",
  },
  admin: {
    info: "Visão operacional da clínica com indicadores e gestão da equipe.",
    actions: "Gerir agendas, profissionais, pacientes, configurações e relatórios.",
  },
  professional: {
    info: "Agenda própria, atendimentos do dia e status dos pacientes.",
    actions: "Confirmar consultas, iniciar/concluir atendimentos e ajustar disponibilidade.",
  },
  receptionist: {
    info: "Fila diária de agendamentos e dados de pacientes da clínica.",
    actions: "Agendar/remarcar consultas, atualizar dados e apoiar a comunicação.",
  },
  patient: {
    info: "Próximas consultas e histórico básico de agendamentos.",
    actions: "Agendar, confirmar presença e acessar mensagens com a clínica.",
  },
};

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { profile, user, signOut } = useAuth();

  const { data: userRole } = useQuery<AppRole | null>({
    queryKey: ["layout-user-role", user?.id, profile?.tenant_id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, tenant_id")
        .eq("user_id", user!.id);

      if (error) throw error;

      const roles = (data ?? []) as Array<{ role: AppRole; tenant_id: string }>;
      if (roles.some((item) => item.role === "super_admin")) return "super_admin";
      const scoped = roles.find((item) => item.tenant_id === profile?.tenant_id);
      return scoped?.role ?? null;
    },
  });

  const visibleNavItems = userRole
    ? navItems.filter((item) => item.roles.includes(userRole))
    : navItems;
  const roleStyle = userRole ? roleStyleMap[userRole] : null;
  const roleGuide = userRole ? roleGuideMap[userRole] : null;

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
              <p className="text-sm font-semibold text-foreground">{profile?.full_name || "Usuário"}</p>
              {userRole ? (
                <Badge variant="outline" className={cn("mt-1 text-[10px] font-semibold", roleStyle?.badgeClass)}>
                  {roleLabelMap[userRole]}
                </Badge>
              ) : (
                <p className="text-xs text-muted-foreground">Conta</p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
          {userRole && roleGuide && (
            <div className={cn("mt-3 rounded-md border p-2.5", roleStyle?.cardClass)}>
              <p className="text-[11px] font-semibold text-foreground">Seu perfil: {roleLabelMap[userRole]}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">Informações:</span> {roleGuide.info}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">Ações:</span> {roleGuide.actions}
              </p>
            </div>
          )}
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
