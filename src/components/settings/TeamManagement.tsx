import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, Loader2, Users, Plus, Trash2, CircleDot } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  accepting_bookings: boolean;
  role?: string;
}

const roleLabels: Record<string, { label: string; className: string }> = {
  owner: { label: "Proprietário", className: "bg-primary/10 text-primary" },
  admin: { label: "Administrador", className: "bg-primary/10 text-primary" },
  professional: { label: "Profissional", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  receptionist: { label: "Recepcionista", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
};

const TeamManagement = () => {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetMemberRef = useRef<TeamMember | null>(null);

  // Fetch team members (profiles + roles)
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team-members", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, avatar_url, phone, accepting_bookings")
        .eq("tenant_id", profile!.tenant_id);

      if (error) throw error;

      // Fetch roles for all members
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
      toast.error("A imagem deve ter no máximo 2MB.");
      return;
    }

    setUploadingFor(member.id);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${member.user_id}/avatar.${ext}`;

      // Remove old files
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
              Gerencie os profissionais e suas fotos de perfil que aparecem no agendamento online
            </CardDescription>
          </div>
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
                  {/* Avatar */}
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

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {member.full_name ?? "Sem nome"}
                    </p>
                    {member.phone && (
                      <p className="text-xs text-muted-foreground truncate">{member.phone}</p>
                    )}
                  </div>

                  {/* Role badge */}
                  <Badge variant="secondary" className={cn("shrink-0 text-[10px]", rl.className)}>
                    {rl.label}
                  </Badge>

                  {/* Upload button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePhotoClick(member)}
                    disabled={isUploading}
                    className="shrink-0"
                  >
                    {isUploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Camera className="h-3.5 w-3.5 mr-1" />
                        <span className="hidden sm:inline text-xs">
                          {member.avatar_url ? "Trocar" : "Foto"}
                        </span>
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Hidden file input */}
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
