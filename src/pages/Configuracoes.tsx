import AdminLayout from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Settings } from "lucide-react";

const Configuracoes = () => {
  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
          <Settings className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground mb-2">Configurações</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          Gestão de tenant, profissionais, planos e preferências da clínica.
        </p>
      </motion.div>
    </AdminLayout>
  );
};

export default Configuracoes;
