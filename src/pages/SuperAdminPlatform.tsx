import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Link2, QrCode, Save } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { getSubscriptionShareUrl } from "@/lib/subscription-plans";
import { toast } from "sonner";

type PlatformSettingsRow = {
  checkout_url: string | null;
  updated_at: string;
};

const SuperAdminPlatform = () => {
  const queryClient = useQueryClient();
  const [checkoutUrlDraft, setCheckoutUrlDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const subscriptionShareUrl = getSubscriptionShareUrl(window.location.origin);

  const { data: platformSettings } = useQuery({
    queryKey: ["super-admin-platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("checkout_url, updated_at")
        .eq("id", 1)
        .single();

      if (error) throw error;
      return data as PlatformSettingsRow;
    },
  });

  useEffect(() => {
    setCheckoutUrlDraft(platformSettings?.checkout_url ?? "");
  }, [platformSettings?.checkout_url]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ id: 1, checkout_url: checkoutUrlDraft.trim() || null }, { onConflict: "id" });
    setSaving(false);

    if (error) {
      toast.error("Falha ao salvar link da plataforma", { description: error.message });
      return;
    }

    toast.success("Link da plataforma salvo.");
    queryClient.invalidateQueries({ queryKey: ["super-admin-platform-settings"] });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Plataforma</h1>
            <p className="text-sm text-muted-foreground">Checkout único, link público e QR Code de divulgação.</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/super-admin">Voltar ao Super Admin</Link>
          </Button>
        </div>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Link da plataforma / checkout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border bg-secondary/40 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Checkout oficial da Kiwify ou landing page externa</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Este é o link único que leva o lead direto para escolher o pacote antes de assinar. Use em campanhas, botões de venda e materiais comerciais.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={checkoutUrlDraft}
                onChange={(e) => setCheckoutUrlDraft(e.target.value)}
                placeholder="https://dashboard.kiwify.com.br/products/..."
                className="font-mono text-sm"
              />
              <Button className="gap-2" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? "Salvando..." : "Salvar link"}
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={async () => {
                  const urlToCopy = checkoutUrlDraft.trim() || `${window.location.origin}/assinar`;
                  await navigator.clipboard.writeText(urlToCopy);
                  setCopied(true);
                  toast.success("Link copiado!");
                  window.setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>

            <div className="grid gap-2 text-sm text-muted-foreground">
              <p>
                Destino: <span className="font-medium text-foreground">{checkoutUrlDraft || "/assinar"}</span>
              </p>
              <p>Se o campo estiver vazio, a plataforma continua com o link público padrão de assinatura.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Link público de assinatura</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-[1fr_220px]">
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-secondary/40 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Divulgação para clínicas e profissionais</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Disponibilize este link nas redes sociais, no comercial e em campanhas para levar novos assinantes diretamente para a página pública de planos.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Input readOnly value={subscriptionShareUrl} className="font-mono text-sm" onFocus={(e) => e.target.select()} />
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={async () => {
                    await navigator.clipboard.writeText(subscriptionShareUrl);
                    toast.success("Link de assinatura copiado");
                  }}
                >
                  <Copy className="h-4 w-4" />
                  Copiar link
                </Button>
              </div>

              <div className="grid gap-2 text-sm text-muted-foreground">
                <p>
                  Destino: <span className="font-medium text-foreground">/assinar</span>
                </p>
                <p>Uso recomendado: bio do Instagram, WhatsApp comercial, landing pages de campanha e materiais de vendas.</p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <QrCode className="h-4 w-4 text-primary" />
                QR Code
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <QRCodeSVG
                  value={subscriptionShareUrl}
                  size={160}
                  level="M"
                  includeMargin={false}
                  bgColor="transparent"
                  fgColor="currentColor"
                  className="text-foreground"
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Escaneie para abrir a página pública de assinatura ou o checkout configurado.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default SuperAdminPlatform;
