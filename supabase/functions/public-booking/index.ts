import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
      const date = url.searchParams.get("date");

      if (!slug) {
        return new Response(JSON.stringify({ error: "slug_required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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

      // Fetch professionals with avatar and accepting_bookings
      const { data: profRows } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, accepting_bookings")
        .eq("tenant_id", clinic.id);

      const professionals = (profRows ?? [])
        .filter((p) => p.full_name)
        .map((p) => ({ name: p.full_name!, avatar_url: p.avatar_url, accepting_bookings: p.accepting_bookings }))
        .sort((a, b) => a.name.localeCompare(b.name));

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

    // POST: create appointment
    if (req.method === "POST") {
      const body = await req.json();
      const { slug, patient_name, patient_phone, patient_cpf, professional_name, starts_at, type } = body;

      if (!slug || !patient_name?.trim() || !professional_name || !starts_at || !patient_phone?.trim() || !patient_cpf?.trim()) {
        return new Response(
          JSON.stringify({ error: "missing_fields", required: ["slug", "patient_name", "patient_phone", "patient_cpf", "professional_name", "starts_at"] }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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

      // Check if professional is accepting bookings
      const { data: profProfile } = await supabase
        .from("profiles")
        .select("accepting_bookings")
        .eq("tenant_id", clinic.id)
        .eq("full_name", professional_name.trim())
        .single();

      if (profProfile && !profProfile.accepting_bookings) {
        return new Response(
          JSON.stringify({ error: "professional_not_accepting" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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

      // Upsert patient record (find by CPF or create new)
      const cleanCpf = patient_cpf.trim().replace(/\D/g, "");
      const { data: existingPatient } = await supabase
        .from("patients")
        .select("id")
        .eq("tenant_id", clinic.id)
        .eq("cpf", cleanCpf)
        .limit(1);

      if (existingPatient && existingPatient.length > 0) {
        // Update phone/name if changed
        await supabase
          .from("patients")
          .update({ full_name: patient_name.trim(), phone: patient_phone.trim() })
          .eq("id", existingPatient[0].id);
      } else {
        await supabase.from("patients").insert({
          tenant_id: clinic.id,
          full_name: patient_name.trim(),
          phone: patient_phone.trim(),
          cpf: cleanCpf,
          status: "active",
        });
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
