import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface QueueItem {
  id: string;
  tenant_id: string;
  appointment_id: string | null;
  patient_name: string;
  patient_phone: string | null;
  professional_name: string;
  appointment_date: string;
  appointment_type: string | null;
  channel: string;
  message_template: string;
  attempts: number;
}

const normalizeAppointmentType = (value: string | null) => {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return "consulta";
  if (normalized.includes("primeira")) return "primeira consulta";
  if (normalized.includes("retorno")) return "retorno";
  if (normalized.includes("entrega")) return "entrega de exames";
  return value ?? "consulta";
};

const buildReminderMessage = (item: QueueItem) => {
  const appointmentDate = new Date(item.appointment_date);
  const dateStr = appointmentDate.toLocaleDateString("pt-BR");
  const timeStr = appointmentDate.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const firstName = item.patient_name.split(" ")[0] ?? "Paciente";
  const typeLabel = normalizeAppointmentType(item.appointment_type);
  const reminderLabel =
    item.message_template === "reminder_h2"
      ? "Lembrete: sua consulta e em 2 horas."
      : "Lembrete: sua consulta e amanha.";

  return [
    `Ola, ${firstName}.`,
    reminderLabel,
    `Tipo: ${typeLabel}.`,
    `Data: ${dateStr}.`,
    `Horario: ${timeStr}.`,
    `Profissional: ${item.professional_name}.`,
    "Se precisar remarcar, responda esta mensagem.",
  ].join("\n");
};

const resolveSystemSenderId = async (
  supabase: ReturnType<typeof createClient>,
  item: QueueItem
) => {
  if (item.appointment_id) {
    const { data: appointmentRef } = await supabase
      .from("appointments")
      .select("created_by, professional_user_id")
      .eq("id", item.appointment_id)
      .maybeSingle();

    const appointmentSender =
      appointmentRef?.professional_user_id ?? appointmentRef?.created_by ?? null;
    if (appointmentSender) return appointmentSender;
  }

  const { data: profileRef } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("tenant_id", item.tenant_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return profileRef?.user_id ?? null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const whatsappToken = Deno.env.get("WHATSAPP_TOKEN");
    const whatsappPhoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    const { data: pending, error: fetchError } = await supabase
      .from("notifications_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(50);

    if (fetchError) throw fetchError;

    const results: { id: string; status: string; error?: string }[] = [];

    for (const item of (pending ?? []) as QueueItem[]) {
      try {
        const message = buildReminderMessage(item);

        if (item.channel === "app") {
          const senderId = await resolveSystemSenderId(supabase, item);
          if (!senderId) {
            await supabase
              .from("notifications_queue")
              .update({
                status: "failed",
                last_error: "Nao foi possivel identificar remetente interno",
                attempts: item.attempts + 1,
              })
              .eq("id", item.id);

            results.push({ id: item.id, status: "failed", error: "no_sender" });
            continue;
          }

          const { error: appError } = await supabase.from("messages").insert({
            tenant_id: item.tenant_id,
            sender_id: senderId,
            sender_name: "Assistente da Clinica",
            content: message,
          });

          if (appError) throw appError;

          await supabase
            .from("notifications_queue")
            .update({
              status: "sent",
              attempts: item.attempts + 1,
              sent_at: new Date().toISOString(),
              last_error: null,
            })
            .eq("id", item.id);

          results.push({ id: item.id, status: "sent" });
          continue;
        }

        if (item.channel === "whatsapp") {
          if (!item.patient_phone) {
            await supabase
              .from("notifications_queue")
              .update({
                status: "failed",
                last_error: "Paciente sem telefone cadastrado",
                attempts: item.attempts + 1,
              })
              .eq("id", item.id);

            results.push({ id: item.id, status: "failed", error: "no_phone" });
            continue;
          }

          if (whatsappToken && whatsappPhoneNumberId) {
            const waResponse = await fetch(
              `https://graph.facebook.com/v22.0/${whatsappPhoneNumberId}/messages`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${whatsappToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  messaging_product: "whatsapp",
                  to: item.patient_phone,
                  type: "text",
                  text: { body: message },
                }),
              }
            );

            if (!waResponse.ok) {
              const waError = await waResponse.text();
              throw new Error(`WhatsApp API error: ${waError}`);
            }

            await supabase
              .from("notifications_queue")
              .update({
                status: "sent",
                attempts: item.attempts + 1,
                sent_at: new Date().toISOString(),
                last_error: null,
              })
              .eq("id", item.id);

            results.push({ id: item.id, status: "sent" });
          } else {
            await supabase
              .from("notifications_queue")
              .update({
                status: "ready",
                attempts: item.attempts + 1,
                last_error:
                  "Configure WHATSAPP_TOKEN e WHATSAPP_PHONE_NUMBER_ID para envio",
              })
              .eq("id", item.id);

            results.push({ id: item.id, status: "ready" });
          }

          continue;
        }

        await supabase
          .from("notifications_queue")
          .update({
            status: "failed",
            last_error: `Canal nao suportado: ${item.channel}`,
            attempts: item.attempts + 1,
          })
          .eq("id", item.id);

        results.push({
          id: item.id,
          status: "failed",
          error: "unsupported_channel",
        });
      } catch (itemError: unknown) {
        const errorMsg =
          itemError instanceof Error ? itemError.message : "Unknown error";

        await supabase
          .from("notifications_queue")
          .update({
            status: item.attempts >= 2 ? "failed" : "pending",
            last_error: errorMsg,
            attempts: item.attempts + 1,
          })
          .eq("id", item.id);

        results.push({ id: item.id, status: "error", error: errorMsg });
      }
    }

    return new Response(
      JSON.stringify({
        processed: results.length,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing notifications:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
