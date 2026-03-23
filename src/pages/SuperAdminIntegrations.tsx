import { Link } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link2, Network } from "lucide-react";

const appIntegrations = [
  {
    name: "WhatsApp Business",
    status: "conectado",
    description: "Confirmações, lembretes e recuperação de no-show por mensageria.",
    href: "https://business.facebook.com",
  },
  {
    name: "Google Calendar",
    status: "pendente",
    description: "Sincronização de agenda externa para a equipe clínica.",
    href: "https://calendar.google.com",
  },
  {
    name: "Stripe Billing",
    status: "pendente",
    description: "Cobrança recorrente e conciliação de assinaturas.",
    href: "https://dashboard.stripe.com",
  },
];

const SuperAdminIntegrations = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Integrações</h1>
            <p className="text-sm text-muted-foreground">Atalhos e conectores da plataforma.</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/super-admin">Voltar ao Super Admin</Link>
          </Button>
        </div>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Aplicativos para gestão</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {appIntegrations.map((app) => (
              <div key={app.name} className="rounded-lg border border-border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Network className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">{app.name}</p>
                  </div>
                  <Badge variant={app.status === "conectado" ? "default" : "outline"}>{app.status}</Badge>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">{app.description}</p>
                <a href={app.href} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs font-medium text-primary hover:underline">
                  <Link2 className="mr-1 h-3.5 w-3.5" /> Abrir app
                </a>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default SuperAdminIntegrations;
