import AdminLayout from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";

const Relatorios = () => {
  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 mb-4">
          <BarChart3 className="h-8 w-8 text-accent" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground mb-2">Relatórios</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          Painel analítico com KPIs por tenant e profissional. Em breve.
        </p>
      </motion.div>
    </AdminLayout>
  );
};

export default Relatorios;
