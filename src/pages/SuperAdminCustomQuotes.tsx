import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

interface QuoteForm {
  company_name: string;
  contact_name: string;
  email: string;
  whatsapp: string;
  full_address: string;
  admin_count: string;
  professional_count: string;
  avg_clients: string;
  app_type: string;
  additional_info: string;
}

const initialFormState: QuoteForm = {
  company_name: "",
  contact_name: "",
  email: "",
  whatsapp: "",
  full_address: "",
  admin_count: "",
  professional_count: "",
  avg_clients: "",
  app_type: "",
  additional_info: "",
};

type QuoteRequestRow = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  whatsapp: string;
  full_address: string | null;
  admin_count: number;
  professional_count: number;
  avg_clients: number;
  app_type: string | null;
  additional_info: string | null;
  status: string;
  created_at: string;
};

const SuperAdminCustomQuotes = () => {
  const [quoteStatusUpdating, setQuoteStatusUpdating] = useState<string | null>(null);
  const [form, setForm] = useState<QuoteForm>(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: quoteRequests = [], refetch } = useQuery({
    queryKey: ["super-admin-quote-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_quote_requests" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as QuoteRequestRow[];
    },
  });

  const updateQuoteStatus = async (quoteId: string, newStatus: string) => {
    setQuoteStatusUpdating(quoteId);
    const { error } = await supabase.from("custom_quote_requests" as any).update({ status: newStatus } as any).eq("id", quoteId);
    setQuoteStatusUpdating(null);

    if (error) {
      toast.error("Falha ao atualizar status", { description: error.message });
      return;
    }

    toast.success(`Status atualizado para ${newStatus}`);
    refetch();
  };

  const handleFormSubmit = async () => {
    if (!form.company_name.trim() || !form.contact_name.trim() || !form.email.trim()) {
      toast.error("Informe empresa, contato e e-mail.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("custom_quote_requests").insert({
      company_name: form.company_name.trim(),
      contact_name: form.contact_name.trim(),
      email: form.email.trim(),
      whatsapp: form.whatsapp.trim(),
      full_address: form.full_address.trim() || null,
      admin_count: Number(form.admin_count) || 0,
      professional_count: Number(form.professional_count) || 0,
      avg_clients: Number(form.avg_clients) || 0,
      app_type: form.app_type.trim() || null,
      additional_info: form.additional_info.trim() || null,
      status: "pending",
    });
    setSubmitting(false);

    if (error) {
      toast.error("Falha ao salvar solicitação", { description: error.message });
      return;
    }

    toast.success("Solicitação registrada");
    setForm(initialFormState);
    refetch();
    queryClient.invalidateQueries({ queryKey: ["super-admin-quote-requests"] });
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
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Orçamentos customizados</h1>
            <p className="text-sm text-muted-foreground">Solicitações de leads com mais de 11 profissionais.</p>
          </div>
        </div>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Formulário rápido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Campos obrigatórios para leads acima de 11 profissionais. Esses dados chegam direto ao comercial.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Input
                  value={form.company_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, company_name: e.target.value }))}
                  placeholder="Nome da clínica ou empresa"
                />
              </div>
              <div className="space-y-2">
                <Label>Contato principal</Label>
                <Input
                  value={form.contact_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, contact_name: e.target.value }))}
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="contato@empresa.com"
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input
                  value={form.whatsapp}
                  onChange={(e) => setForm((prev) => ({ ...prev, whatsapp: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="space-y-2">
                <Label>Endereço completo</Label>
                <Input
                  value={form.full_address}
                  onChange={(e) => setForm((prev) => ({ ...prev, full_address: e.target.value }))}
                  placeholder="Rua, número, bairro, cidade"
                />
              </div>
              <div className="space-y-2">
                <Label>Admins previstos</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.admin_count}
                  onChange={(e) => setForm((prev) => ({ ...prev, admin_count: e.target.value }))}
                  placeholder="Quantos admins/owners?"
                />
              </div>
              <div className="space-y-2">
                <Label>Profissionais</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.professional_count}
                  onChange={(e) => setForm((prev) => ({ ...prev, professional_count: e.target.value }))}
                  placeholder="Quantos médicos/fisioterapeutas?"
                />
              </div>
              <div className="space-y-2">
                <Label>Média de clientes</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.avg_clients}
                  onChange={(e) => setForm((prev) => ({ ...prev, avg_clients: e.target.value }))}
                  placeholder="Clientes/pacientes mensais"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Tipo de aplicativo desejado</Label>
                <Input
                  value={form.app_type}
                  onChange={(e) => setForm((prev) => ({ ...prev, app_type: e.target.value }))}
                  placeholder="Ex: app médico, recepção, financeiro"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Informações adicionais</Label>
                <textarea
                  value={form.additional_info}
                  onChange={(e) => setForm((prev) => ({ ...prev, additional_info: e.target.value }))}
                  placeholder="Observações relevantes para o comercial"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleFormSubmit} disabled={submitting} className="gap-2">
                <Save className="h-4 w-4" />
                {submitting ? "Enviando..." : "Registrar solicitação"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Pedidos recebidos</CardTitle>
          </CardHeader>
          <CardContent>
            {quoteRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma solicitação recebida.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-2 pr-4">Empresa</th>
                      <th className="pb-2 pr-4">Contato</th>
                      <th className="pb-2 pr-4">E-mail</th>
                      <th className="pb-2 pr-4">WhatsApp</th>
                      <th className="pb-2 pr-4">Profissionais</th>
                      <th className="pb-2 pr-4">Tipo</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2 pr-4">Data</th>
                      <th className="pb-2 pr-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quoteRequests.map((req) => (
                      <tr key={req.id} className="border-b border-border/70 align-top">
                        <td className="py-2 pr-4">
                          <p className="font-medium">{req.company_name}</p>
                          {req.full_address && <p className="text-xs text-muted-foreground">{req.full_address}</p>}
                        </td>
                        <td className="py-2 pr-4">{req.contact_name}</td>
                        <td className="py-2 pr-4 text-xs">{req.email}</td>
                        <td className="py-2 pr-4 text-xs">{req.whatsapp}</td>
                        <td className="py-2 pr-4 text-center">{req.professional_count}</td>
                        <td className="py-2 pr-4">{req.app_type ?? "—"}</td>
                        <td className="py-2 pr-4">
                          <Badge variant={req.status === "pending" ? "outline" : "default"}>
                            {req.status === "pending" ? "Pendente" : req.status === "contacted" ? "Contatado" : req.status === "closed" ? "Fechado" : req.status}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4 text-xs">{new Date(req.created_at).toLocaleDateString("pt-BR")}</td>
                        <td className="py-2 pr-4">
                          <div className="flex flex-col gap-1">
                            {req.status === "pending" && (
                              <Button size="sm" variant="outline" disabled={quoteStatusUpdating === req.id} onClick={() => updateQuoteStatus(req.id, "contacted")}>
                                Marcar contatado
                              </Button>
                            )}
                            {req.status === "contacted" && (
                              <Button size="sm" variant="outline" disabled={quoteStatusUpdating === req.id} onClick={() => updateQuoteStatus(req.id, "closed")}>
                                Fechar
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default SuperAdminCustomQuotes;
