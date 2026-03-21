import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  MessageCircle,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import HelpIcon from "@/components/tutorial/HelpIcon";

const PatientHome = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  const { data: clinicSlug } = useQuery({
    queryKey: ["patient-clinic-slug", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinics")
        .select("slug")
        .eq("id", profile!.tenant_id)
        .maybeSingle();

      if (error) throw error;
      return data?.slug ?? null;
    },
  });

  const { data: nextAppointment, isLoading } = useQuery({
    queryKey: ["patient-next-appointment", profile?.tenant_id, user?.id, profile?.full_name],
    enabled: !!profile?.tenant_id && !!user?.id,
    queryFn: async () => {
      const now = new Date().toISOString();
      const baseQuery = supabase
        .from("appointments")
        .select("id, patient_name, professional_name, starts_at, status, type")
        .eq("tenant_id", profile!.tenant_id)
        .gte("starts_at", now)
        .in("status", ["scheduled", "confirmed", "rescheduled"])
        .order("starts_at", { ascending: true })
        .limit(1);

      let { data, error } = await baseQuery.eq("patient_user_id", user!.id);
      if (error) throw error;

      if ((!data || data.length === 0) && profile?.full_name) {
        const fallback = await supabase
          .from("appointments")
          .select("id, patient_name, professional_name, starts_at, status, type")
          .eq("tenant_id", profile.tenant_id)
          .eq("patient_name", profile.full_name)
          .gte("starts_at", now)
          .in("status", ["scheduled", "confirmed", "rescheduled"])
          .order("starts_at", { ascending: true })
          .limit(1);

        if (fallback.error) throw fallback.error;
        data = fallback.data;
      }

      return data?.[0] ?? null;
    },
  });

  const dateLabel = useMemo(() => {
    if (!nextAppointment?.starts_at) return null;
    return format(new Date(nextAppointment.starts_at), "EEEE, dd 'de' MMMM 'às' HH:mm", {
      locale: ptBR,
    });
  }, [nextAppointment?.starts_at]);

  const handleConfirm = async () => {
    if (!nextAppointment) return;
    if (nextAppointment.status !== "scheduled") {
      toast.info("Consulta já confirmada.");
      return;
    }

    const { error } = await supabase
      .from("appointments")
      .update({ status: "confirmed" })
      .eq("id", nextAppointment.id)
      .eq("tenant_id", profile!.tenant_id);

    if (error) {
      toast.error("Não foi possível confirmar automaticamente.", {
        description: "Use a opção de mensagens para confirmar com a clínica.",
      });
      return;
    }

    toast.success("Consulta confirmada com sucesso.");
    queryClient.invalidateQueries({ queryKey: ["patient-next-appointment"] });
  };

  const bookingPath = clinicSlug ? `/agendar/${clinicSlug}` : "/agenda";

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto w-full max-w-2xl space-y-5">
        <header className="space-y-1">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Paciente</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Sua agenda</h1>
            </div>
            <HelpIcon screen="patient_home" />
          </div>
          <p className="text-sm text-muted-foreground">
            Visualize sua próxima consulta e confirme em poucos toques.
          </p>
        </header>

        <Card className="rounded-[20px] border-border shadow-soft" data-tutorial-target="patient-next-appointment">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" />
              Próxima consulta
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : !nextAppointment ? (
              <p className="text-sm text-muted-foreground">Nenhuma consulta futura encontrada.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  <p className="text-lg font-extrabold capitalize">{dateLabel}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <UserRound className="h-4 w-4" />
                  <p>{nextAppointment.professional_name}</p>
                  {nextAppointment.type && <p>• {nextAppointment.type}</p>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2" data-tutorial-target="patient-actions">
          <Button className="min-h-14 text-base font-semibold" onClick={() => navigate(bookingPath)} data-tutorial-target="patient-booking">
            Agendar nova consulta
          </Button>
          <Button
            variant="outline"
            className="min-h-14 text-base font-semibold"
            onClick={() => navigate("/mensagens")}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Mensagens da clínica
          </Button>
          <Button
            variant="outline"
            className="min-h-12"
            disabled={!nextAppointment}
            onClick={handleConfirm}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Confirmar consulta
          </Button>
          <Button
            variant="outline"
            className="min-h-12"
            onClick={() => navigate(bookingPath)}
          >
            Remarcar consulta
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PatientHome;

