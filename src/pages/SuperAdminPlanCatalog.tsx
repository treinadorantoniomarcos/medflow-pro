import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import PlanCatalogManager from "@/components/superadmin/PlanCatalogManager";

const SuperAdminPlanCatalog = () => {
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
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Catálogo de Planos e Experiência</h1>
            <p className="text-sm text-muted-foreground">Gerencie os planos Start, Pro e Signature, além da experiência gratuita de 21 dias.</p>
          </div>
        </div>

        <PlanCatalogManager />
      </div>
    </AdminLayout>
  );
};

export default SuperAdminPlanCatalog;
