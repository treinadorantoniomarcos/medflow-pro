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

type PlanRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  monthly_price_cents: number;
  period_days: number;
  trial_days: number;
  is_courtesy: boolean;
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
  is_courtesy: boolean;
  is_active: boolean;
};

const emptyForm: PlanFormState = {
  id: null,
  code: "",
  name: "",
  description: "",
  monthly_price_brl: "0,00",
  period_days: "30",
  trial_days: "0",
  is_courtesy: false,
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
        .select("id, code, name, description, monthly_price_cents, period_days, trial_days, is_courtesy, is_active")
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
      name: plan.name,
      description: plan.description ?? "",
      monthly_price_brl: toBrl(plan.monthly_price_cents),
      period_days: String(plan.period_days),
      trial_days: String(plan.trial_days),
      is_courtesy: plan.is_courtesy,
      is_active: plan.is_active,
    });
  };

  const refreshPlans = () => {
    queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
    onPlansChanged?.();
  };

  const savePlan = async () => {
    if (!hasFormMinimum) {
      toast.error("Preencha codigo e nome do pacote.");
      return;
    }

    setSaving(true);

    const payload = {
      code: form.code.trim().toLowerCase(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      monthly_price_cents: parseBrlToCents(form.monthly_price_brl),
      period_days: Math.max(1, Number(form.period_days) || 30),
      trial_days: Math.max(0, Number(form.trial_days) || 0),
      is_courtesy: form.is_courtesy,
      is_active: form.is_active,
    };

    const query = form.id
      ? supabase.from("subscription_plans").update(payload).eq("id", form.id)
      : supabase.from("subscription_plans").insert(payload);

    const { error } = await query;
    setSaving(false);

    if (error) {
      toast.error("Falha ao salvar pacote", { description: error.message });
      return;
    }

    toast.success(form.id ? "Pacote atualizado" : "Pacote criado");
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

    toast.success(plan.is_active ? "Pacote bloqueado" : "Pacote liberado");
    refreshPlans();
  };

  const deletePlan = async (plan: PlanRow) => {
    const { error } = await supabase.from("subscription_plans").delete().eq("id", plan.id);

    if (error) {
      toast.error("Falha ao excluir pacote", { description: error.message });
      return;
    }

    toast.success("Pacote excluido");
    if (form.id === plan.id) resetForm();
    refreshPlans();
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-base">Catalogo de Pacotes e Cortesias</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label>Codigo</Label>
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
            <Label>Periodo (dias)</Label>
            <Input
              type="number"
              min={1}
              value={form.period_days}
              onChange={(e) => setForm((prev) => ({ ...prev, period_days: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Cortesia (dias)</Label>
            <Input
              type="number"
              min={0}
              value={form.trial_days}
              onChange={(e) => setForm((prev) => ({ ...prev, trial_days: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Descricao</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Resumo do pacote"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch
              checked={form.is_courtesy}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_courtesy: checked }))}
            />
            <Label>Pacote cortesia</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.is_active}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
            />
            <Label>Pacote liberado</Label>
          </div>

          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={resetForm}>Limpar</Button>
            <Button onClick={savePlan} disabled={!hasFormMinimum || saving}>
              {saving ? "Salvando..." : form.id ? "Atualizar pacote" : "Criar pacote"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando pacotes...</p>}
          {!isLoading && plans.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum pacote cadastrado.</p>
          )}

          {plans.map((plan) => (
            <div key={plan.id} className="flex flex-wrap items-center gap-2 rounded border border-border p-3">
              <div className="min-w-[190px] flex-1">
                <p className="text-sm font-semibold">
                  {plan.name} ({plan.code})
                </p>
                <p className="text-xs text-muted-foreground">
                  R$ {toBrl(plan.monthly_price_cents)} | periodo {plan.period_days} dias | cortesia {plan.trial_days} dias
                </p>
              </div>

              {plan.is_courtesy && <Badge variant="secondary">Cortesia</Badge>}
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
