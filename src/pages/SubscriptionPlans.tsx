import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, Send } from "lucide-react";
import medfluxLogo from "@/assets/medflux-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  COURTESY_PLAN_DESCRIPTION,
  COURTESY_PLAN_KEY,
  COURTESY_PLAN_NAME,
  START_TRIAL_DAYS,
  PLATFORM_DEMO_VIDEO_URL,
  SUBSCRIPTION_TERM_LABEL,
  fallbackPlanOptions,
  getConfiguredPlatformDemoUrl,
  getPlanMarketingContent,
  PRO_CHECKOUT_URL,
  storePreferredPlan,
  SIGNATURE_CHECKOUT_URL,
  type PlanOption,
} from "@/lib/subscription-plans";

type CatalogPlan = {
  code: string;
  name: string;
  description: string | null;
  monthly_price_cents: number;
  period_days: number;
  trial_days: number;
  is_active: boolean;
};

const SubscriptionPlans = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { data: catalogPlans = [] } = useQuery({
    queryKey: ["public-subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("code, name, description, monthly_price_cents, period_days, trial_days, is_active")
        .eq("is_active", true)
        .order("monthly_price_cents", { ascending: true });

      if (error) throw error;
      return (data ?? []) as CatalogPlan[];
    },
  });

  const { data: platformSettings } = useQuery({
    queryKey: ["public-platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("plan_links, affiliate_url, video_url")
        .eq("id", 1)
        .single();

      if (error) throw error;
      return data as { plan_links: Record<string, string> | null; affiliate_url: string | null; video_url: string | null };
    },
  });

  const planOverride = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const value = params.get("plan");
    return value ? value.trim().toLowerCase() : undefined;
  }, [location.search]);

  const isUpgradeMode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("mode") === "upgrade";
  }, [location.search]);

  const availablePlans = useMemo<PlanOption[]>(() => {
    if (catalogPlans.length === 0) return fallbackPlanOptions;

    return catalogPlans.map((plan) => ({
      key: plan.code,
      name: plan.code === COURTESY_PLAN_KEY ? COURTESY_PLAN_NAME : plan.name,
      monthlyPrice: plan.monthly_price_cents / 100,
      description:
        plan.code === COURTESY_PLAN_KEY
          ? COURTESY_PLAN_DESCRIPTION
          : plan.description ??
        `Período de ${plan.period_days} dias${plan.trial_days > 0 ? ` | experiência de ${plan.trial_days} dias` : ""}`,
      periodDays: plan.period_days,
      trialDays: plan.code === COURTESY_PLAN_KEY ? START_TRIAL_DAYS : plan.trial_days,
      marketing: getPlanMarketingContent(plan.code),
    }));
  }, [catalogPlans]);

  const displayedPlans = useMemo(() => {
    if (!planOverride) return availablePlans;
    const filtered = availablePlans.filter((plan) => plan.key === planOverride);
    return filtered.length ? filtered : availablePlans;
  }, [availablePlans, planOverride]);

  const planLinks = (platformSettings?.plan_links ?? {}) as Record<string, string>;
  const affiliateInviteUrl = platformSettings?.affiliate_url?.trim() ?? "";
  const demoVideoUrl = getConfiguredPlatformDemoUrl(platformSettings?.video_url);
  const proCheckoutUrl = PRO_CHECKOUT_URL;
  const signatureCheckoutUrl = planLinks.signature?.trim() || SIGNATURE_CHECKOUT_URL;

  useEffect(() => {
    if (planOverride === "pro" && proCheckoutUrl) {
      window.location.replace(proCheckoutUrl);
      return;
    }
    if (planOverride === "signature" && signatureCheckoutUrl) {
      window.location.replace(signatureCheckoutUrl);
    }
  }, [planOverride, proCheckoutUrl, signatureCheckoutUrl]);

  if (planOverride === "pro") {
    window.location.replace(PRO_CHECKOUT_URL);
    return null;
  }

  const handleChoosePlan = (planKey: string) => {
    storePreferredPlan(planKey);
    navigate(`/register?plan=${encodeURIComponent(planKey)}`);
  };

  // Custom quote form state
  const [quoteForm, setQuoteForm] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    whatsapp: "",
    full_address: "",
    admin_count: 1,
    professional_count: 11,
    avg_clients: 0,
    app_type: "",
    additional_info: "",
  });
  const [sendingQuote, setSendingQuote] = useState(false);
  const [quoteSent, setQuoteSent] = useState(false);

  const handleQuoteSubmit = async () => {
    if (!quoteForm.company_name.trim() || !quoteForm.contact_name.trim() || !quoteForm.email.trim() || !quoteForm.whatsapp.trim()) {
      toast.error("Preencha os campos obrigatórios: empresa, contato, e-mail e WhatsApp.");
      return;
    }

    setSendingQuote(true);
    const { error } = await supabase.from("custom_quote_requests" as any).insert({
      company_name: quoteForm.company_name.trim(),
      contact_name: quoteForm.contact_name.trim(),
      email: quoteForm.email.trim().toLowerCase(),
      whatsapp: quoteForm.whatsapp.trim(),
      full_address: quoteForm.full_address.trim() || null,
      admin_count: quoteForm.admin_count,
      professional_count: quoteForm.professional_count,
      avg_clients: quoteForm.avg_clients,
      app_type: quoteForm.app_type.trim() || null,
      additional_info: quoteForm.additional_info.trim() || null,
    } as any);
    setSendingQuote(false);

    if (error) {
      toast.error("Falha ao enviar solicitação", { description: error.message });
      return;
    }

    setQuoteSent(true);
    toast.success("Solicitação recebida com sucesso! Entraremos em contato em até 48 horas úteis.");
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-3">
            <img src={medfluxLogo} alt="MedFlux Pro" className="h-14 w-14 rounded-2xl" />
            <div>
              <p className="text-sm font-semibold text-primary">Assinatura premium para clínicas e profissionais</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Escolha a solução ideal para a sua operação</h1>
            </div>
          </div>

        <p className="max-w-3xl text-sm text-muted-foreground">
          Compare as opções do MedFlux Pro e escolha a alternativa mais adequada ao porte e ao momento da sua operação.
        </p>
      </div>

        {isUpgradeMode && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
            Sua experiência premium de 21 dias chegou ao fim. Escolha um dos 3 planos abaixo e retome a operação com toda a base já registrada.
          </div>
        )}

        {planOverride && (
          <p className="text-sm text-muted-foreground">
            Mostrando apenas o plano <span className="font-semibold text-foreground">{planOverride.toUpperCase()}</span>.
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          {displayedPlans.map((plan) => (
            <Card key={plan.key} className="relative flex h-full flex-col border-border shadow-soft">
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  {plan.marketing.highlight && <Badge>{plan.marketing.highlight}</Badge>}
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-foreground">R$ {plan.monthlyPrice.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">
                    por mês | vigência de {SUBSCRIPTION_TERM_LABEL}{plan.trialDays ? ` | ${plan.trialDays} dias de experiência` : ""}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-5">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Para quem é</p>
                  <p className="text-sm text-muted-foreground">{plan.marketing.audience}</p>
                </div>

                <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Resumo</p>
                <p className="text-sm text-muted-foreground">{plan.marketing.summary}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Inclui</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {plan.marketing.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto space-y-2">
                  <Button
                    className="w-full"
                    onClick={() => {
                      const directUrl =
                        plan.key === "pro"
                          ? PRO_CHECKOUT_URL
                          : plan.key === "signature"
                            ? (planLinks[plan.key.toLowerCase()] ?? "").trim() || SIGNATURE_CHECKOUT_URL
                            : (planLinks[plan.key.toLowerCase()] ?? "").trim();
                      if (directUrl) {
                        window.open(directUrl, "_blank");
                        return;
                      }
                      handleChoosePlan(plan.key);
                    }}
                  >
                    {plan.key === "pro"
                      ? "Assinar Pro agora"
                      : plan.key === "signature"
                        ? "Assinar Signature agora"
                        : "Iniciar experiência Start"}
                  </Button>
                  <Button asChild variant="ghost" className="w-full">
                    <Link to={`/register?plan=${encodeURIComponent(plan.key)}`}>
                      {plan.key === "pro"
                        ? "Criar conta no Pro"
                        : plan.key === "signature"
                          ? "Criar conta no Signature"
                          : "Criar conta no Start"}
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(demoVideoUrl || PLATFORM_DEMO_VIDEO_URL, "_blank")}
                  >
                    Ver vídeo de demonstração
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Custom quote request card */}
        {!planOverride && !isUpgradeMode && (
          <Card className="border-dashed border-border shadow-soft">
            <CardContent className="p-6">
            <div className="mb-4 text-center">
                <p className="text-sm font-semibold text-primary">Operações com mais de 11 profissionais</p>
              <h2 className="mt-1 text-2xl font-extrabold text-foreground">Proposta executiva personalizada</h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
                Operações com mais de 11 profissionais seguem para uma proposta comercial executiva, construída para a realidade operacional da sua clínica.
              </p>
            </div>

            {quoteSent ? (
              <div className="rounded-xl border border-border bg-secondary/30 p-6 text-center">
                <Check className="mx-auto mb-3 h-10 w-10 text-primary" />
                <h3 className="text-lg font-bold text-foreground">Solicitação recebida!</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Nosso time comercial entrará em contato em até 48 horas úteis para alinhar implantação, capacidade e governança.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-center text-sm font-medium text-foreground">
                  Preencha os dados abaixo para solicitar uma proposta comercial personalizada.
                </p>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nome da empresa *</Label>
                    <Input
                      value={quoteForm.company_name}
                      onChange={(e) => setQuoteForm((prev) => ({ ...prev, company_name: e.target.value }))}
                      placeholder="Clínica / Hospital / Grupo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nome do contato *</Label>
                    <Input
                      value={quoteForm.contact_name}
                      onChange={(e) => setQuoteForm((prev) => ({ ...prev, contact_name: e.target.value }))}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail *</Label>
                    <Input
                      type="email"
                      value={quoteForm.email}
                      onChange={(e) => setQuoteForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="contato@empresa.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp *</Label>
                    <Input
                      value={quoteForm.whatsapp}
                      onChange={(e) => setQuoteForm((prev) => ({ ...prev, whatsapp: e.target.value }))}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Endereço completo</Label>
                    <Input
                      value={quoteForm.full_address}
                      onChange={(e) => setQuoteForm((prev) => ({ ...prev, full_address: e.target.value }))}
                      placeholder="Rua, número, bairro, cidade, estado"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantidade de admins</Label>
                    <Input
                      type="number"
                      min={1}
                      value={quoteForm.admin_count}
                      onChange={(e) => setQuoteForm((prev) => ({ ...prev, admin_count: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantidade de profissionais</Label>
                    <Input
                      type="number"
                      min={1}
                      value={quoteForm.professional_count}
                      onChange={(e) => setQuoteForm((prev) => ({ ...prev, professional_count: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Média de clientes/pacientes</Label>
                    <Input
                      type="number"
                      min={0}
                      value={quoteForm.avg_clients}
                      onChange={(e) => setQuoteForm((prev) => ({ ...prev, avg_clients: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de aplicativo desejado</Label>
                    <Select
                      value={quoteForm.app_type}
                      onValueChange={(value) => setQuoteForm((prev) => ({ ...prev, app_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clinica">Clínica médica</SelectItem>
                        <SelectItem value="odontologia">Odontologia</SelectItem>
                        <SelectItem value="estetica">Estética</SelectItem>
                        <SelectItem value="psicologia">Psicologia</SelectItem>
                        <SelectItem value="fisioterapia">Fisioterapia</SelectItem>
                        <SelectItem value="veterinaria">Veterinária</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Informações adicionais</Label>
                    <Textarea
                      value={quoteForm.additional_info}
                      onChange={(e) => setQuoteForm((prev) => ({ ...prev, additional_info: e.target.value }))}
                      placeholder="Descreva necessidades específicas, integrações, módulos extras..."
                      rows={3}
                    />
                  </div>
                </div>

                <Button className="w-full" onClick={handleQuoteSubmit} disabled={sendingQuote}>
                  <Send className="mr-2 h-4 w-4" />
                  {sendingQuote ? "Enviando..." : "Solicitar proposta personalizada"}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Nosso time comercial entrará em contato em até 48 horas úteis para alinhar implantação, capacidade e governança.
                </p>
              </div>
            )}
            </CardContent>
          </Card>
        )}

        {!planOverride && !isUpgradeMode && affiliateInviteUrl && (
          <Card className="border-primary/20 bg-primary/5 shadow-soft">
            <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Programa de afiliados</p>
                <h2 className="text-2xl font-extrabold text-foreground">Convite oficial para parceiros</h2>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Se você representa uma rede, comunidade ou carteira de leads, acesse o convite oficial e faça parte do programa de afiliados.
                </p>
              </div>
              <Button
                className="w-full md:w-auto"
                onClick={() => window.open(affiliateInviteUrl, "_blank")}
              >
                Quero ser afiliado
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-sm text-muted-foreground">
          Já tem conta? <Link to="/login" className="font-semibold text-primary hover:underline">Entre para concluir sua assinatura</Link>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlans;
