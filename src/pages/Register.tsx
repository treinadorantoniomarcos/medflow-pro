import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { UserPlus, Eye, EyeOff, Check } from "lucide-react";
import medfluxLogo from "@/assets/medflux-logo.png";
import { validateStrongPassword } from "@/lib/password-policy";
import PasswordStrengthIndicator from "@/components/auth/PasswordStrengthIndicator";
import { START_TRIAL_DAYS, getPlanMarketingContent } from "@/lib/subscription-plans";

const Register = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const passwordValidation = validateStrongPassword(password, email.trim());
    if (!passwordValidation.valid) {
      toast.error("Senha fora da politica de seguranca", {
        description: passwordValidation.errors[0],
      });
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas nao coincidem");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast.error("Erro ao criar conta", { description: error.message });
    } else {
      toast.success("Conta criada com sucesso!", {
        description: data.session
          ? "Sua degustacao do pacote Start sera iniciada agora."
          : "Verifique seu e-mail. Apos a confirmacao, voce seguira para a degustacao do pacote Start.",
      });
      navigate(data.session ? "/onboarding" : "/login");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-[520px] shadow-medium border-border">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <img src={medfluxLogo} alt="MedFlux Pro" className="h-14 w-14" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            Criar Conta
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comece a usar o MedFlux Pro
          </p>
        </CardHeader>
        <CardContent>
          <div className="mb-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Degustacao inicial</p>
            <div className="mt-2 flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-bold text-foreground">Pacote Start</p>
                <p className="text-sm text-muted-foreground">{getPlanMarketingContent("start").summary}</p>
              </div>
              <p className="text-sm font-semibold text-foreground">{START_TRIAL_DAYS} dias de cortesia</p>
            </div>
            <div className="mt-3 space-y-2">
              {getPlanMarketingContent("start").features.slice(0, 3).map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimo 12 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={12}
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <PasswordStrengthIndicator password={password} email={email} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={12}
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              <UserPlus className="h-4 w-4" />
              {loading ? "Criando..." : "Criar conta"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Ja tem conta?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Fazer login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
