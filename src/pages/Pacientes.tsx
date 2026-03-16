import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Search, ChevronRight, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatients, type Patient } from "@/hooks/use-patients";
import NewPatientDialog from "@/components/patients/NewPatientDialog";
import PatientDetailSheet from "@/components/patients/PatientDetailSheet";
import { useDebounce } from "@/hooks/use-debounce";

const Pacientes = () => {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const { data: patients = [], isLoading } = usePatients(debouncedSearch);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleOpenPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setSheetOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Pacientes Cadastrados</h1>
              <p className="text-sm text-muted-foreground">
                {patients.length} paciente{patients.length !== 1 ? "s" : ""} cadastrado{patients.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <NewPatientDialog />
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative max-w-md"
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            className="pl-9 bg-secondary border-0"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </motion.div>

        {/* Patient list */}
        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[68px] w-full rounded-lg" />
            ))
          ) : patients.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-12 text-center"
            >
              <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground mt-2">
                {search ? "Nenhum paciente encontrado." : "Nenhum paciente cadastrado ainda."}
              </p>
            </motion.div>
          ) : (
            patients.map((p, i) => (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex w-full items-center gap-3 rounded-lg bg-card p-4 shadow-soft text-left hover:shadow-medium transition-all"
                onClick={() => handleOpenPatient(p)}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary shrink-0">
                  {p.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{p.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {p.phone || p.email || "Sem contato"}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    p.status === "active"
                      ? "bg-success/15 text-success"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {p.status === "active" ? "Ativo" : "Inativo"}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </motion.button>
            ))
          )}
        </div>
      </div>

      <PatientDetailSheet
        patient={selectedPatient}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </AdminLayout>
  );
};

export default Pacientes;
