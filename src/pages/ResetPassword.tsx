import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import medfluxLogo from "@/assets/medflux-logo.png";
import { validateStrongPassword } from "@/lib/password-policy";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateStrongPassword(password);
    if (!validation.valid) {
      toast.error("Senha fora da politica de seguranca", {
        description: validation.errors[0],
      });
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas nao coincidem");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error("Erro ao redefinir senha", { description: error.message });
    } else {
      toast.success("Senha redefinida com sucesso!");
      navigate("/");
    }
    setLoading(false);
  };

  if (!isRecovery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-[420px] shadow-medium border-border">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Link invalido ou expirado.</p>
            <Button className="mt-4" onClick={() => navigate("/login")}>
              Voltar ao login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-[420px] shadow-medium border-border">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <img src={medfluxLogo} alt="MedFlux Pro" className="h-14 w-14" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            Nova Senha
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Defina sua nova senha
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimo 12 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={12}
              />
              <p className="text-xs text-muted-foreground">
                Use 12+ caracteres com maiuscula, minuscula, numero e simbolo.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={12}
              />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              <KeyRound className="h-4 w-4" />
              {loading ? "Salvando..." : "Redefinir senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
