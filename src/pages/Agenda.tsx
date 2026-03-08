import AdminLayout from "@/components/layout/AdminLayout";
import AppointmentRow from "@/components/dashboard/AppointmentRow";
import NewAppointmentDialog from "@/components/dashboard/NewAppointmentDialog";
import { todayAppointments } from "@/data/mockData";
import { motion } from "framer-motion";

const Agenda = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Agenda</h1>
            <p className="text-sm text-muted-foreground">Gerencie todos os agendamentos</p>
          </div>
          <NewAppointmentDialog />
        </motion.div>

        <div className="space-y-2">
          {todayAppointments.map((apt, i) => (
            <motion.div
              key={apt.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <AppointmentRow appointment={apt} />
            </motion.div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Agenda;
