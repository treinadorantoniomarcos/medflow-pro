import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Link2, QrCode, Save } from "lucide-react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { getSubscriptionShareUrl } from "@/lib/subscription-plans";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

const SuperAdminPlatform = () => {
  const queryClient = useQueryClient();
  const [platformCheckoutUrlDraft, setPlatformCheckoutUrlDraft] = useState("");
  const [savingPlatformSettings, setSavingPlatformSettings] = useState(false);
  const [copiedCheckoutLink, setCopiedCheckoutLink] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const subscriptionShareUrl = getSubscriptionShareUrl(window.location.origin);
  const [copiedPlan, setCopiedPlan] = useState<string | null>(null);
  const [planLinksDraft, setPlanLinksDraft] = useState<Record<string, string>>({});
  const [savingPlanLinks, setSavingPlanLinks] = useState(false);

  const { data: platformSettings } = useQuery({
    queryKey: ["super-admin-platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("checkout_url, updated_at")
        .eq("id", 1)
        .single();
      if (error) throw error;
      return data as { checkout_url: string | null; updated_at: string };
    },
  });

  useEffect(() => {
    setPlatformCheckoutUrlDraft(platformSettings?.checkout_url ?? "");
  }, [platformSettings?.checkout_url]);

  useEffect(() => {
    setPlanLinksDraft(platformSettings?.plan_links ?? {});
  }, [platformSettings?.plan_links]);

  const { data: planRows = [] } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("code, name")
        .order("monthly_price_cents", { ascending: true });

      if (error) throw error;
      return (data ?? []) as Array<{ code: string; name: string }>;
    },
  });

  const copyPlanLink = async (planCode: string, url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedPlan(planCode);
    window.setTimeout(() => setCopiedPlan(null), 2500);
    toast.success("Link copiado");
  };

  const savePlanLinks = async () => {
    setSavingPlanLinks(true);
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ id: 1, plan_links: planLinksDraft }, { onConflict: "id" });
    setSavingPlanLinks(false);

    if (error) {
      toast.error("Falha ao salvar links por plano", { description: error.message });
      return;
    }

    toast.success("Links de planos salvos");
    queryClient.invalidateQueries({ queryKey: ["super-admin-platform-settings"] });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/super-admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Configuração da Plataforma</h1>
            <p className="text-sm text-muted-foreground">Links de checkout e divulgação pública.</p>
          </div>
        </div>

        {/* Checkout link */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Checkout oficial da Kiwify ou landing page externa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border bg-secondary/40 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Link único de checkout</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Este é o link único que leva o lead direto para escolher o pacote antes de assinar. Use em campanhas, botões de venda e materiais comerciais.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={platformCheckoutUrlDraft}
                onChange={(e) => setPlatformCheckoutUrlDraft(e.target.value)}
                placeholder="https://dashboard.kiwify.com.br/products/..."
                className="font-mono text-sm"
              />
              <Button
                className="gap-2"
                onClick={async () => {
                  setSavingPlatformSettings(true);
                  const { error } = await supabase
                    .from("platform_settings")
                    .upsert({ id: 1, checkout_url: platformCheckoutUrlDraft.trim() || null }, { onConflict: "id" });
                  setSavingPlatformSettings(false);
                  if (error) {
                    toast.error("Falha ao salvar link da plataforma", { description: error.message });
                    return;
                  }
                  toast.success("Link da plataforma salvo.");
                  queryClient.invalidateQueries({ queryKey: ["super-admin-platform-settings"] });
                }}
                disabled={savingPlatformSettings}
              >
                <Save className="h-4 w-4" />
                {savingPlatformSettings ? "Salvando..." : "Salvar link"}
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={async () => {
                  const urlToCopy = platformCheckoutUrlDraft.trim() || `${window.location.origin}/assinar`;
                  await navigator.clipboard.writeText(urlToCopy);
                  setCopiedCheckoutLink(true);
                  toast.success("Link copiado!");
                  window.setTimeout(() => setCopiedCheckoutLink(false), 2000);
                }}
              >
                {copiedCheckoutLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedCheckoutLink ? "Copiado" : "Copiar"}
              </Button>
            </div>

            <div className="grid gap-2 text-sm text-muted-foreground">
              <p>
                Destino: <span className="font-medium text-foreground">{platformCheckoutUrlDraft || "/assinar"}</span>
              </p>
              <p>Se o campo estiver vazio, a plataforma continua com o link público padrão de assinatura.</p>
            </div>
          </CardContent>
        </Card>

        {/* Public share link + QR */}
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
                    setCopiedShareLink(true);
                    toast.success("Link de assinatura copiado");
                    window.setTimeout(() => setCopiedShareLink(false), 2000);
                  }}
                >
                  {copiedShareLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedShareLink ? "Copiado" : "Copiar link"}
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

        <Card className="shadow-soft">
          <CardHeader className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Links individuais por plano</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={savePlanLinks}
              disabled={savingPlanLinks}
            >
              {savingPlanLinks ? "Salvando..." : "Salvar links"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Gere um link exclusivo para cada pacote e cole dentro da Kiwify com o botão abaixo.
              Os links usam o checkout configurado (ou a página pública) com `?plan={code}`.
            </p>
            {planRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Carregando planos...</p>
            ) : (
              <div className="space-y-3">
                {planRows.map((plan) => {
                  const name = plan.name || plan.code;
                  const defaultLink = `${platformCheckoutUrlDraft.trim() || subscriptionShareUrl}?plan=${plan.code}`;
                  const overrideLink = (planLinksDraft[plan.code] ?? "").trim();
                  const effectiveLink = overrideLink || defaultLink;
                  return (
                    <div key={plan.code} className="space-y-2 rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">{name}</p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => copyPlanLink(plan.code, effectiveLink)}
                          >
                              {copiedPlan === plan.code ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                              {copiedPlan === plan.code ? "Copiado" : "Copiar"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open("https://dashboard.kiwify.com.br/products", "_blank")}
                          >
                            Colar na Kiwify
                          </Button>
                        </div>
                      </div>
                      <Input
                        readOnly
                        value={effectiveLink}
                        className="font-mono text-xs"
                        onFocus={(e) => e.target.select()}
                      />
                      <Input
                        value={planLinksDraft[plan.code] ?? ""}
                        onChange={(e) =>
                          setPlanLinksDraft((prev) => ({ ...prev, [plan.code]: e.target.value }))
                        }
                        placeholder="Cole o link do Kiwify para este plano (opcional)"
                        className="text-xs"
                      />
                      <p className="text-xs text-muted-foreground">Link padrão usado quando o campo acima estiver vazio:</p>
                      <p className="text-xs text-muted-foreground break-words">{defaultLink}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default SuperAdminPlatform;
