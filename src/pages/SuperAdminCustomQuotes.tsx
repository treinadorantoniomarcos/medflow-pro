import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type QuoteRow = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  whatsapp: string;
  address_full: string;
  admin_count: number;
  professional_count: number;
  patient_volume: string;
  desired_app_type: string;
  additional_info: string | null;
  source_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

const SuperAdminCustomQuotes = () => {
  const queryClient = useQueryClient();

  const { data: quoteRequests = [] } = useQuery({
    queryKey: ["super-admin-custom-quote-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_quote_requests")
        .select("id, company_name, contact_name, email, whatsapp, address_full, admin_count, professional_count, patient_volume, desired_app_type, additional_info, source_url, status, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data ?? []) as QuoteRow[];
    },
  });

  const updateQuoteStatus = async (quoteId: string, newStatus: string) => {
    const { error } = await supabase
      .from("custom_quote_requests")
      .update({ status: newStatus })
      .eq("id", quoteId);

    if (error) {
      toast.error("Falha ao atualizar status", { description: error.message });
      return;
    }

    toast.success("Status atualizado.");
    queryClient.invalidateQueries({ queryKey: ["super-admin-custom-quote-requests"] });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Solicitações customizadas</h1>
            <p className="text-sm text-muted-foreground">Pedidos de orçamento com perfil acima de 11 profissionais.</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/super-admin">Voltar ao Super Admin</Link>
          </Button>
        </div>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Solicitações de projeto customizado</CardTitle>
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
                      <th className="pb-2 pr-4">Admins</th>
                      <th className="pb-2 pr-4">Profissionais</th>
                      <th className="pb-2 pr-4">Pacientes/mês</th>
                      <th className="pb-2 pr-4">Tipo</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2 pr-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quoteRequests.map((req) => (
                      <tr key={req.id} className="border-b border-border/70 align-top">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-foreground">{req.company_name}</p>
                          <p className="text-xs text-muted-foreground">{req.address_full}</p>
                        </td>
                        <td className="py-3 pr-4">{req.contact_name}</td>
                        <td className="py-3 pr-4 text-xs">{req.email}</td>
                        <td className="py-3 pr-4 text-xs">{req.whatsapp}</td>
                        <td className="py-3 pr-4 text-center">{req.admin_count}</td>
                        <td className="py-3 pr-4 text-center">{req.professional_count}</td>
                        <td className="py-3 pr-4">{req.patient_volume}</td>
                        <td className="py-3 pr-4">{req.desired_app_type}</td>
                        <td className="py-3 pr-4">
                          <Badge variant={req.status === "pending" ? "outline" : "default"}>{req.status}</Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-col gap-2">
                            {req.status === "pending" && (
                              <Button size="sm" variant="outline" onClick={() => updateQuoteStatus(req.id, "contacted")}>
                                Marcar contatado
                              </Button>
                            )}
                            {req.status === "contacted" && (
                              <Button size="sm" variant="outline" onClick={() => updateQuoteStatus(req.id, "closed")}>
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
