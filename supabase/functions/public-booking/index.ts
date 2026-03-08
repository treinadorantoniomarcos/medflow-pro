import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const url = new URL(req.url);

    // GET: fetch clinic info, professionals, and available slots
    if (req.method === "GET") {
      const slug = url.searchParams.get("slug");
      const date = url.searchParams.get("date"); // yyyy-MM-dd

      if (!slug) {
        return new Response(JSON.stringify({ error: "slug_required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch clinic by slug
      const { data: clinic, error: clinicError } = await supabase
        .from("clinics")
        .select("id, name, logo_url, settings, slug")
        .eq("slug", slug)
        .single();

      if (clinicError || !clinic) {
        return new Response(JSON.stringify({ error: "clinic_not_found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch distinct professional names for this clinic
      const { data: profRows } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("tenant_id", clinic.id);

      const professionals = (profRows ?? [])
        .map((p) => p.full_name)
        .filter(Boolean)
        .sort();

      // If date provided, fetch existing appointments for that date
      let bookedSlots: { starts_at: string; professional_name: string }[] = [];
      if (date) {
        const dayStart = `${date}T00:00:00`;
        const dayEnd = `${date}T23:59:59`;

        const { data: appointments } = await supabase
          .from("appointments")
          .select("starts_at, professional_name, status")
          .eq("tenant_id", clinic.id)
          .gte("starts_at", dayStart)
          .lte("starts_at", dayEnd)
          .not("status", "in", '("cancelled","no_show")');

        bookedSlots = (appointments ?? []).map((a) => ({
          starts_at: a.starts_at,
          professional_name: a.professional_name,
        }));
      }

      // Working hours config from clinic settings or defaults
      const settings = (clinic.settings as Record<string, unknown>) ?? {};
      const workStart = (settings.work_start_hour as number) ?? 8;
      const workEnd = (settings.work_end_hour as number) ?? 18;
      const slotDuration = (settings.slot_duration_minutes as number) ?? 60;

      return new Response(
        JSON.stringify({
          clinic: { id: clinic.id, name: clinic.name, logo_url: clinic.logo_url, slug: clinic.slug },
          professionals,
          bookedSlots,
          workHours: { start: workStart, end: workEnd, slotDuration },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST: create appointment (public, no auth required)
    if (req.method === "POST") {
      const body = await req.json();
      const { slug, patient_name, patient_phone, professional_name, starts_at, type } = body;

      if (!slug || !patient_name || !professional_name || !starts_at) {
        return new Response(
          JSON.stringify({ error: "missing_fields", required: ["slug", "patient_name", "professional_name", "starts_at"] }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find clinic
      const { data: clinic } = await supabase
        .from("clinics")
        .select("id")
        .eq("slug", slug)
        .single();

      if (!clinic) {
        return new Response(JSON.stringify({ error: "clinic_not_found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if slot is already taken
      const { data: existing } = await supabase
        .from("appointments")
        .select("id")
        .eq("tenant_id", clinic.id)
        .eq("professional_name", professional_name)
        .eq("starts_at", starts_at)
        .not("status", "in", '("cancelled","no_show")')
        .limit(1);

      if (existing && existing.length > 0) {
        return new Response(
          JSON.stringify({ error: "slot_already_booked" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create appointment
      const { data: appointment, error: insertError } = await supabase
        .from("appointments")
        .insert({
          tenant_id: clinic.id,
          patient_name: patient_name.trim(),
          professional_name: professional_name.trim(),
          starts_at,
          type: type || "Consulta",
          status: "scheduled",
        })
        .select("id, starts_at, professional_name, status")
        .single();

      if (insertError) {
        return new Response(
          JSON.stringify({ error: "insert_failed", detail: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ ok: true, appointment }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "internal_error", detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
