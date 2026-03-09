import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, ArrowLeft } from "lucide-react";
import medfluxLogo from "@/assets/medflux-logo.png";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error("Erro ao enviar e-mail", { description: error.message });
    } else {
      setSent(true);
      toast.success("E-mail enviado!", { description: "Verifique sua caixa de entrada." });
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-[420px] shadow-medium border-border">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <img src={medfluxLogo} alt="MedFlux Pro" className="h-14 w-14" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            Recuperar Senha
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {sent
              ? "Verifique seu e-mail para redefinir a senha"
              : "Digite seu e-mail para receber o link de recuperacao"}
          </p>
        </CardHeader>
        <CardContent>
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={loading}>
                <Mail className="h-4 w-4" />
                {loading ? "Enviando..." : "Enviar link"}
              </Button>
            </form>
          ) : (
            <div className="text-center py-4">
              <Mail className="h-12 w-12 text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Um link foi enviado para <strong>{email}</strong>
              </p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ArrowLeft className="h-3 w-3" />
              Voltar ao login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
