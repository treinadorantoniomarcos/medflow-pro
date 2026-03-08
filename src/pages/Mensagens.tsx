import AdminLayout from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";

const Mensagens = () => {
  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
          <MessageSquare className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground mb-2">Mensagens</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          Módulo de mensagens com texto e áudio integrado ao WhatsApp. 
          Em breve disponível com Lovable Cloud.
        </p>
      </motion.div>
    </AdminLayout>
  );
};

export default Mensagens;
