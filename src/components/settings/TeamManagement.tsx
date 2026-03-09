import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Camera, Loader2, Users, CircleDot, CalendarDays, Plus, MoreVertical, UserX, UserCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  accepting_bookings: boolean;
  is_active: boolean;
  role?: string;
}

const roleLabels: Record<string, { label: string; className: string }> = {
  owner: { label: "Proprietario", className: "bg-primary/10 text-primary" },
  admin: { label: "Administrador", className: "bg-primary/10 text-primary" },
  professional: { label: "Profissional", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  receptionist: { label: "Recepcionista", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
};

const TeamManagement = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState<"professional" | "receptionist" | "admin">("professional");
  const [inviteAccepting, setInviteAccepting] = useState(true);

  const [confirmAction, setConfirmAction] = useState<{ member: TeamMember; action: "deactivate" | "reactivate" | "remove" } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetMemberRef = useRef<TeamMember | null>(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team-members", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, avatar_url, phone, accepting_bookings, is_active")
        .eq("tenant_id", profile!.tenant_id);

      if (error) throw error;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("tenant_id", profile!.tenant_id);

      const roleMap = new Map<string, string>();
      (roles ?? []).forEach((r) => roleMap.set(r.user_id, r.role));

      return (profiles ?? []).map((p) => ({
        ...p,
        role: roleMap.get(p.user_id) ?? "professional",
      })) as TeamMember[];
    },
  });

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteName.trim() || !inviteEmail.trim()) {
      toast.error("Preencha nome e e-mail.");
      return;
    }

    setInviteLoading(true);
    const { data, error } = await supabase.functions.invoke("invite-team-member", {
      body: {
        full_name: inviteName.trim(),
        email: inviteEmail.trim().toLowerCase(),
        phone: invitePhone.trim() || null,
        role: inviteRole,
        accepting_bookings: inviteAccepting,
      },
    });

    if (error || !data?.ok) {
      const detail = (data && data.detail) || error?.message || "Falha ao convidar profissional.";
      const code = data?.error;

      if (code === "user_belongs_to_another_tenant") {
        toast.error("Este e-mail ja pertence a outro assinante.");
      } else if (code === "forbidden") {
        toast.error("Somente admin/owner pode convidar equipe.");
      } else {
        toast.error("Erro ao convidar profissional", { description: String(detail) });
      }
      setInviteLoading(false);
      return;
    }

    toast.success("Profissional convidado com sucesso!", {
      description: "Um e-mail de convite foi enviado para acesso.",
    });

    setInviteName("");
    setInviteEmail("");
    setInvitePhone("");
    setInviteRole("professional");
    setInviteAccepting(true);
    setInviteOpen(false);
    setInviteLoading(false);

    queryClient.invalidateQueries({ queryKey: ["team-members"] });
  };

  const handlePhotoClick = (member: TeamMember) => {
    targetMemberRef.current = member;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const member = targetMemberRef.current;
    if (!file || !member) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no maximo 2MB.");
      return;
    }

    setUploadingFor(member.id);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${member.user_id}/avatar.${ext}`;

      const { data: existing } = await supabase.storage.from("avatars").list(member.user_id);
      if (existing && existing.length > 0) {
        await supabase.storage.from("avatars").remove(existing.map((f) => `${member.user_id}/${f.name}`));
      }

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", member.id);
      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success(`Foto de ${member.full_name ?? "membro"} atualizada!`);
    } catch (err: any) {
      toast.error("Erro ao enviar foto", { description: err.message });
    } finally {
      setUploadingFor(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      targetMemberRef.current = null;
    }
  };

  const handleMemberAction = async () => {
    if (!confirmAction) return;
    const { member, action } = confirmAction;
    setActionLoading(true);

    const { data, error } = await supabase.functions.invoke("manage-team-member", {
      body: { action, target_user_id: member.user_id },
    });

    if (error || !data?.ok) {
      const code = data?.error;
      if (code === "cannot_modify_self") {
        toast.error("Você não pode modificar sua própria conta.");
      } else if (code === "cannot_modify_owner") {
        toast.error("Não é possível remover o proprietário.");
      } else if (code === "forbidden") {
        toast.error("Somente admin/owner pode gerenciar equipe.");
      } else {
        toast.error("Erro ao executar ação", { description: data?.detail || error?.message });
      }
      setActionLoading(false);
      setConfirmAction(null);
      return;
    }

    const messages: Record<string, string> = {
      deactivate: `${member.full_name ?? "Membro"} foi desativado.`,
      reactivate: `${member.full_name ?? "Membro"} foi reativado!`,
      remove: `${member.full_name ?? "Membro"} foi removido permanentemente.`,
    };
    toast.success(messages[action]);
    setActionLoading(false);
    setConfirmAction(null);
    queryClient.invalidateQueries({ queryKey: ["team-members"] });
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Equipe Profissional</CardTitle>
            <CardDescription>
              Gerencie profissionais, papeis e fotos exibidas no agendamento online.
            </CardDescription>
          </div>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                Novo profissional
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>Convidar membro da equipe</DialogTitle>
                <DialogDescription>
                  Cria acesso e vincula o profissional ao assinante atual.
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-3" onSubmit={handleInviteMember}>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Nome completo</label>
                  <Input
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Ex.: Maria da Silva"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">E-mail</label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="profissional@clinica.com"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Telefone</label>
                  <Input
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Papel</label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as typeof inviteRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Profissional</SelectItem>
                        <SelectItem value="receptionist">Recepcionista</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Agendamento publico</label>
                    <Select
                      value={inviteAccepting ? "open" : "closed"}
                      onValueChange={(v) => setInviteAccepting(v === "open")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Aberto</SelectItem>
                        <SelectItem value="closed">Fechado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={inviteLoading}>
                    {inviteLoading ? "Enviando..." : "Enviar convite"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum profissional encontrado.
          </p>
        ) : (
          <div className="space-y-3">
            {members.map((member) => {
              const rl = roleLabels[member.role ?? ""] ?? roleLabels.professional;
              const isUploading = uploadingFor === member.id;

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-4 rounded-xl border border-border p-4 transition-colors hover:bg-secondary/30"
                >
                  <button
                    onClick={() => handlePhotoClick(member)}
                    disabled={isUploading}
                    className="relative group shrink-0"
                    title="Trocar foto"
                  >
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.full_name ?? ""}
                        className="h-14 w-14 rounded-full object-cover border-2 border-primary/20"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {getInitials(member.full_name)}
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-background" />
                      ) : (
                        <Camera className="h-4 w-4 text-background" />
                      )}
                    </div>
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {member.full_name ?? "Sem nome"}
                    </p>
                    {member.phone && (
                      <p className="text-xs text-muted-foreground truncate">{member.phone}</p>
                    )}
                  </div>

                  <span
                    className={cn(
                      "flex items-center gap-1 shrink-0 text-xs font-medium rounded-full px-2 py-0.5 border",
                      member.accepting_bookings
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
                        : "bg-muted text-muted-foreground border-border"
                    )}
                  >
                    <CircleDot className="h-2.5 w-2.5" />
                    {member.accepting_bookings ? "Aberto" : "Fechado"}
                  </span>

                  <Badge variant="secondary" className={cn("shrink-0 text-xs", rl.className)}>
                    {rl.label}
                  </Badge>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/minha-agenda")}
                    className="shrink-0"
                    title="Ver agenda"
                  >
                    <CalendarDays className="h-3.5 w-3.5 mr-1" />
                    <span className="hidden sm:inline text-xs">Agenda</span>
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </CardContent>
    </Card>
  );
};

export default TeamManagement;
