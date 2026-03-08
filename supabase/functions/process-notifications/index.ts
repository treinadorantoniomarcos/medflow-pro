import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface QueueItem {
  id: string;
  tenant_id: string;
  patient_name: string;
  patient_phone: string | null;
  professional_name: string;
  appointment_date: string;
  channel: string;
  message_template: string;
  attempts: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch pending notifications whose scheduled_for has passed
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
        if (!item.patient_phone) {
          // Mark as failed — no phone
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

        // Build the WhatsApp message
        const appointmentDate = new Date(item.appointment_date);
        const dateStr = appointmentDate.toLocaleDateString("pt-BR");
        const timeStr = appointmentDate.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });

        const firstName = item.patient_name.split(" ")[0];
        const message = [
          `Olá, ${firstName}! 👋`,
          ``,
          `Lembrete da sua consulta:`,
          `📅 Data: ${dateStr}`,
          `🕐 Horário: ${timeStr}`,
          `👨‍⚕️ Profissional: ${item.professional_name}`,
          ``,
          `Por favor, confirme sua presença respondendo esta mensagem. 😊`,
        ].join("\n");

        // ================================================
        // WHATSAPP API INTEGRATION POINT
        // ================================================
        // When you have the WhatsApp Business API configured,
        // replace this block with the actual API call:
        //
        // const waResponse = await fetch(
        //   `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
        //   {
        //     method: "POST",
        //     headers: {
        //       Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        //       "Content-Type": "application/json",
        //     },
        //     body: JSON.stringify({
        //       messaging_product: "whatsapp",
        //       to: item.patient_phone,
        //       type: "text",
        //       text: { body: message },
        //     }),
        //   }
        // );

        // For now, mark as "ready" (API not yet configured)
        await supabase
          .from("notifications_queue")
          .update({
            status: "ready",
            attempts: item.attempts + 1,
          })
          .eq("id", item.id);

        results.push({ id: item.id, status: "ready" });

        console.log(
          `[Notification ${item.id}] Ready to send to ${item.patient_phone}: ${message.substring(0, 80)}...`
        );
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
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
