import { Link } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PlanCatalogManager from "@/components/superadmin/PlanCatalogManager";

const SuperAdminPlanCatalog = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Catálogo de planos</h1>
            <p className="text-sm text-muted-foreground">Edite preços, vigência e cortesia dos pacotes da plataforma.</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/super-admin">Voltar ao Super Admin</Link>
          </Button>
        </div>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Pacotes e cortesias</CardTitle>
          </CardHeader>
          <CardContent>
            <PlanCatalogManager />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default SuperAdminPlanCatalog;
