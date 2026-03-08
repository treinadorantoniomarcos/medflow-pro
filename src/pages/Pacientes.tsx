import AdminLayout from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Search, Plus, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const patients = [
  { name: "Marcos Pereira", phone: "(11) 98765-4321", lastVisit: "23/05/2026", status: "Ativo" },
  { name: "Sophia Amaral", phone: "(11) 97654-3210", lastVisit: "20/05/2026", status: "Ativo" },
  { name: "João Almeida", phone: "(11) 96543-2109", lastVisit: "18/05/2026", status: "Ativo" },
  { name: "Ana Soares", phone: "(11) 95432-1098", lastVisit: "15/05/2026", status: "Inativo" },
  { name: "Carolina Martins", phone: "(11) 94321-0987", lastVisit: "10/05/2026", status: "Ativo" },
];

const Pacientes = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Pacientes</h1>
          <Button className="gap-2 bg-success hover:bg-success/90 text-success-foreground font-semibold">
            <Plus className="h-4 w-4" /> Novo paciente
          </Button>
        </motion.div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar paciente..." className="pl-9 bg-secondary border-0" />
        </div>

        <div className="space-y-2">
          {patients.map((p, i) => (
            <motion.button
              key={p.name}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex w-full items-center gap-3 rounded-lg bg-card p-4 shadow-soft text-left hover:shadow-medium transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {p.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.phone}</p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-xs text-muted-foreground">Última visita</p>
                <p className="text-xs font-medium text-foreground">{p.lastVisit}</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.status === "Ativo" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                {p.status}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </motion.button>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Pacientes;
