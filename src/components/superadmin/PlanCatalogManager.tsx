import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  COURTESY_PLAN_DESCRIPTION,
  COURTESY_PLAN_KEY,
  COURTESY_PLAN_NAME,
  START_TRIAL_DAYS,
  SUBSCRIPTION_TERM_DAYS,
  SUBSCRIPTION_TERM_LABEL,
} from "@/lib/subscription-plans";

type PlanRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  monthly_price_cents: number;
  period_days: number;
  trial_days: number;
  is_active: boolean;
};

type PlanFormState = {
  id: string | null;
  code: string;
  name: string;
  description: string;
  monthly_price_brl: string;
  period_days: string;
  trial_days: string;
  is_active: boolean;
};

const emptyForm: PlanFormState = {
  id: null,
  code: "",
  name: "",
  description: "",
  monthly_price_brl: "0,00",
  period_days: String(SUBSCRIPTION_TERM_DAYS),
  trial_days: "0",
  is_active: true,
};

const toBrl = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
const parseBrlToCents = (input: string) => {
  const normalized = input.replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, "");
  const value = Number(normalized);
  if (Number.isNaN(value) || value < 0) return 0;
  return Math.round(value * 100);
};

interface PlanCatalogManagerProps {
  onPlansChanged?: () => void;
}

const PlanCatalogManager = ({ onPlansChanged }: PlanCatalogManagerProps) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PlanFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("id, code, name, description, monthly_price_cents, period_days, trial_days, is_active")
        .order("monthly_price_cents", { ascending: true });

      if (error) throw error;
      return (data ?? []) as PlanRow[];
    },
  });

  const hasFormMinimum = useMemo(
    () => form.code.trim().length > 1 && form.name.trim().length > 1,
    [form.code, form.name]
  );

  const resetForm = () => setForm(emptyForm);

  const hydrateForm = (plan: PlanRow) => {
    setForm({
      id: plan.id,
      code: plan.code,
      name: plan.code === COURTESY_PLAN_KEY ? COURTESY_PLAN_NAME : plan.name,
      description:
        plan.code === COURTESY_PLAN_KEY
          ? COURTESY_PLAN_DESCRIPTION
          : plan.description ?? "",
      monthly_price_brl: toBrl(plan.monthly_price_cents),
      period_days: String(plan.period_days),
      trial_days: String(plan.code === COURTESY_PLAN_KEY ? START_TRIAL_DAYS : plan.trial_days),
      is_active: plan.is_active,
    });
  };

  const refreshPlans = () => {
    queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
    onPlansChanged?.();
  };

  const savePlan = async () => {
    if (!hasFormMinimum) {
      toast.error("Preencha o código e o nome do plano.");
      return;
    }

    const parsedTrialDays = Math.max(0, Number(form.trial_days) || 0);
    const planCode = form.code.trim().toLowerCase();
    const trialPlanLike = planCode === "start" || planCode === COURTESY_PLAN_KEY;
    if (trialPlanLike && parsedTrialDays !== 0 && parsedTrialDays !== START_TRIAL_DAYS) {
      toast.error(`O Start deve usar 21 dias de experiência ou 0 para desativar a oferta temporariamente.`);
      return;
    }

    if (!trialPlanLike && parsedTrialDays !== 0) {
      toast.error("Somente o plano Start pode ter experiência. Os demais planos devem ficar com 0 dias.");
      return;
    }

    setSaving(true);

    const payload = {
      code: planCode,
      name: form.name.trim(),
      description: form.description.trim() || null,
      monthly_price_cents: parseBrlToCents(form.monthly_price_brl),
      period_days: SUBSCRIPTION_TERM_DAYS,
      trial_days: parsedTrialDays,
      is_active: form.is_active,
    };

    const query = form.id
      ? supabase.from("subscription_plans").update(payload).eq("id", form.id)
      : supabase.from("subscription_plans").insert(payload);

    const { error } = await query;
    setSaving(false);

    if (error) {
      toast.error("Falha ao salvar plano", { description: error.message });
      return;
    }

    toast.success(form.id ? "Plano atualizado" : "Plano criado");
    resetForm();
    refreshPlans();
  };

  const toggleActive = async (plan: PlanRow) => {
    const { error } = await supabase
      .from("subscription_plans")
      .update({ is_active: !plan.is_active })
      .eq("id", plan.id);

    if (error) {
      toast.error("Falha ao alterar status", { description: error.message });
      return;
    }

    toast.success(plan.is_active ? "Plano bloqueado" : "Plano liberado");
    refreshPlans();
  };

  const deletePlan = async (plan: PlanRow) => {
    const { error } = await supabase.from("subscription_plans").delete().eq("id", plan.id);

    if (error) {
      toast.error("Falha ao excluir plano", { description: error.message });
      return;
    }

    toast.success("Plano excluído");
    if (form.id === plan.id) resetForm();
    refreshPlans();
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-base">Catálogo de Planos e Experiência</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label>Código</Label>
            <Input
              value={form.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
              placeholder="ex: pro"
            />
          </div>
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="ex: Pro"
            />
          </div>
          <div className="space-y-1">
            <Label>Valor mensal (R$)</Label>
            <Input
              value={form.monthly_price_brl}
              onChange={(e) => setForm((prev) => ({ ...prev, monthly_price_brl: e.target.value }))}
              placeholder="0,00"
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
             <Label>Vigência</Label>
             <Input
               readOnly
               value={form.period_days}
             />
             <p className="text-xs text-muted-foreground">Assinaturas padronizadas em {SUBSCRIPTION_TERM_LABEL}.</p>
          </div>
          <div className="space-y-1">
            <Label>Experiência (dias)</Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={form.trial_days}
              onChange={(e) => setForm((prev) => ({ ...prev, trial_days: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Use 21 dias no Start. Os demais planos devem permanecer com 0 dias.</p>
          </div>
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Resumo do plano"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch
              checked={form.is_active}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
            />
            <Label>Plano ativo</Label>
          </div>

          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={resetForm}>Limpar</Button>
            <Button onClick={savePlan} disabled={!hasFormMinimum || saving}>
              {saving ? "Salvando..." : form.id ? "Atualizar plano" : "Criar plano"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando planos...</p>}
          {!isLoading && plans.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum plano cadastrado.</p>
          )}

          {plans.map((plan) => (
            <div key={plan.id} className="flex flex-wrap items-center gap-2 rounded border border-border p-3">
              <div className="min-w-[190px] flex-1">
                <p className="text-sm font-semibold">
                  {plan.code === COURTESY_PLAN_KEY ? COURTESY_PLAN_NAME : plan.name} ({plan.code})
                </p>
                <p className="text-xs text-muted-foreground">
                  R$ {toBrl(plan.monthly_price_cents)} | vigência {SUBSCRIPTION_TERM_LABEL} | experiência {plan.code === COURTESY_PLAN_KEY ? START_TRIAL_DAYS : plan.trial_days} dias
                </p>
              </div>

              <Badge variant={plan.is_active ? "default" : "outline"}>{plan.is_active ? "Liberado" : "Bloqueado"}</Badge>

              <Button size="sm" variant="outline" onClick={() => hydrateForm(plan)}>Editar</Button>
              <Button size="sm" variant="outline" onClick={() => toggleActive(plan)}>
                {plan.is_active ? "Bloquear" : "Liberar"}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => deletePlan(plan)}>Excluir</Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PlanCatalogManager;




