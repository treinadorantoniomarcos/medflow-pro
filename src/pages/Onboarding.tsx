import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, User, ArrowRight, Sparkles } from "lucide-react";
import medfluxLogo from "@/assets/medflux-logo.png";

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [clinicName, setClinicName] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // 1. Create clinic
      const { data: clinic, error: clinicError } = await supabase
        .from("clinics")
        .insert({ name: clinicName.trim() })
        .select("id")
        .single();

      if (clinicError) throw clinicError;

      // 2. Create profile
      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: user.id,
        tenant_id: clinic.id,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
      });

      if (profileError) throw profileError;

      // 3. Assign owner role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: user.id,
        tenant_id: clinic.id,
        role: "owner",
      });

      if (roleError) throw roleError;

      await refreshProfile();
      toast.success("Tudo pronto!", { description: "Sua clínica foi configurada." });
      navigate("/");
    } catch (err: any) {
      toast.error("Erro no cadastro", { description: err.message });
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-[480px] shadow-medium border-border">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <img src={medfluxLogo} alt="MedFlux Pro" className="h-14 w-14" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              Bem-vindo ao MedFlux Pro
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {step === 1
              ? "Vamos configurar sua clínica"
              : "Agora, seus dados pessoais"}
          </p>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className={`h-2 w-16 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
            <div className={`h-2 w-16 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2); } : handleSubmit} className="space-y-5">
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 text-primary mb-2">
                  <Building2 className="h-5 w-5" />
                  <span className="text-sm font-semibold">Dados da Clínica</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinicName">Nome da Clínica</Label>
                  <Input
                    id="clinicName"
                    placeholder="Ex: Clínica Saúde Viva"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>
                <Button type="submit" className="w-full gap-2" disabled={!clinicName.trim()}>
                  Próximo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 text-primary mb-2">
                  <User className="h-5 w-5" />
                  <span className="text-sm font-semibold">Seus Dados</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome completo</Label>
                  <Input
                    id="fullName"
                    placeholder="Seu nome completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone (opcional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={20}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(1)}
                  >
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 gap-2"
                    disabled={loading || !fullName.trim()}
                  >
                    {loading ? "Criando..." : "Finalizar"}
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
