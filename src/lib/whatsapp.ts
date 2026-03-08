/**
 * WhatsApp utility functions for wa.me deep links.
 */

/** Strip non-digits from a phone string */
const cleanPhone = (phone: string): string =>
  phone.replace(/\D/g, "");

/** Ensure a Brazilian number has the country code 55 */
const ensureBrazilCode = (digits: string): string => {
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return `55${digits}`;
};

/**
 * Build a wa.me URL from a phone string and optional pre-filled message.
 * Returns null if phone is empty/invalid.
 */
export const buildWhatsAppUrl = (
  phone: string | null | undefined,
  message?: string
): string | null => {
  if (!phone) return null;
  const digits = cleanPhone(phone);
  if (digits.length < 10) return null;

  const number = ensureBrazilCode(digits);
  const url = new URL(`https://wa.me/${number}`);
  if (message) url.searchParams.set("text", message);
  return url.toString();
};

/**
 * Build a reminder message for an appointment.
 */
export const buildAppointmentReminder = ({
  patientName,
  date,
  time,
  professionalName,
  type,
  clinicName,
}: {
  patientName: string;
  date: string;
  time: string;
  professionalName: string;
  type?: string | null;
  clinicName?: string;
}): string => {
  const lines = [
    `Olá, ${patientName.split(" ")[0]}! 👋`,
    ``,
    `Gostaríamos de lembrar da sua consulta:`,
    `📅 *Data:* ${date}`,
    `🕐 *Horário:* ${time}`,
    `👨‍⚕️ *Profissional:* ${professionalName}`,
  ];

  if (type) lines.push(`📋 *Tipo:* ${type}`);
  if (clinicName) lines.push(`🏥 *Local:* ${clinicName}`);

  lines.push(
    ``,
    `Por favor, confirme sua presença respondendo esta mensagem. 😊`
  );

  return lines.join("\n");
};
