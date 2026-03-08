import type { Appointment } from "@/components/dashboard/AppointmentRow";

export const todayAppointments: Appointment[] = [
  {
    id: "1",
    time: "09:00",
    patientName: "Dr. Pedro Pereira",
    patientInitials: "PP",
    type: "Primeira consulta",
    status: "confirmada",
    progress: 81,
  },
  {
    id: "2",
    time: "10:00",
    patientName: "Sophia Amaral",
    patientInitials: "SA",
    type: "Retorno",
    status: "confirmada",
  },
  {
    id: "3",
    time: "11:00",
    patientName: "João Almeida",
    patientInitials: "JA",
    type: "Revisão",
    status: "em_atendimento",
    alert: "Paciente pode se atrasar",
  },
  {
    id: "4",
    time: "13:00",
    patientName: "Ana Soares Menehab",
    patientInitials: "AS",
    type: "Primeira consulta",
    status: "confirmada",
  },
  {
    id: "5",
    time: "14:00",
    patientName: "Carolina Martins",
    patientInitials: "CM",
    type: "Retorno",
    status: "agendada",
  },
  {
    id: "6",
    time: "15:00",
    patientName: "Renato Oliveira",
    patientInitials: "RO",
    type: "Revisão",
    status: "disponivel",
  },
];

export const pendencias = [
  { icon: "🔊", text: "2 novas mensagens de áudio" },
  { icon: "🔄", text: "1 paciente aguardando retorno" },
  { icon: "📋", text: "1 consulta não confirmada" },
];
