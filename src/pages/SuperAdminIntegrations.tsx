import { ArrowLeft, Link2, Network } from "lucide-react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
        <div className="flex items-center gap-3">
          <Link to="/super-admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Integrações</h1>
            <p className="text-sm text-muted-foreground">Aplicativos conectados à plataforma.</p>
          </div>
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
