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
        .select("user_id, full_name, avatar_url, accepting_bookings")
        .eq("tenant_id", clinic.id);

      const professionals = (profRows ?? [])
        .filter((p) => p.full_name)
        .map((p) => ({
          user_id: p.user_id,
          name: p.full_name!,
          avatar_url: p.avatar_url,
          accepting_bookings: p.accepting_bookings,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      let bookedSlots: { starts_at: string; professional_name: string }[] = [];
      let slotOverrides: { professional_name: string; slot_time: string; is_available: boolean }[] = [];
      let periodBlocks: { professional_name: string; start_at: string; end_at: string; reason: string | null }[] = [];
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

        const { data: overrides } = await supabase
          .from("professional_slot_overrides")
          .select("professional_name, slot_time, is_available")
          .eq("tenant_id", clinic.id)
          .eq("slot_date", date);

        slotOverrides = (overrides ?? []).map((row) => ({
          professional_name: row.professional_name,
          slot_time: String(row.slot_time).slice(0, 5),
          is_available: row.is_available,
        }));

        const { data: blocks } = await supabase
          .from("professional_availability_blocks")
          .select("professional_name, start_at, end_at, reason")
          .eq("tenant_id", clinic.id)
          .lte("start_at", dayEnd)
          .gte("end_at", dayStart);

        periodBlocks = (blocks ?? []).map((row) => ({
          professional_name: row.professional_name,
          start_at: row.start_at,
          end_at: row.end_at,
          reason: row.reason,
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
          slotOverrides,
          periodBlocks,
          workHours: { start: workStart, end: workEnd, slotDuration },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST: create appointment
    if (req.method === "POST") {
      const body = await req.json();
      const { slug, patient_name, patient_phone, patient_cpf, professional_name, starts_at, type, audio_base64 } = body;

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
        .select("user_id, accepting_bookings")
        .eq("tenant_id", clinic.id)
        .eq("full_name", professional_name.trim())
        .single();

      if (profProfile && !profProfile.accepting_bookings) {
        return new Response(
          JSON.stringify({ error: "professional_not_accepting" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const slotDate = starts_at.slice(0, 10);
      const slotTime = starts_at.slice(11, 16);

      const { data: slotOverride } = await supabase
        .from("professional_slot_overrides")
        .select("is_available")
        .eq("tenant_id", clinic.id)
        .eq("professional_name", professional_name.trim())
        .eq("slot_date", slotDate)
        .eq("slot_time", `${slotTime}:00`)
        .maybeSingle();

      if (slotOverride && !slotOverride.is_available) {
        return new Response(
          JSON.stringify({ error: "slot_closed_by_professional" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: periodBlock } = await supabase
        .from("professional_availability_blocks")
        .select("id, reason")
        .eq("tenant_id", clinic.id)
        .eq("professional_name", professional_name.trim())
        .lte("start_at", starts_at)
        .gt("end_at", starts_at)
        .limit(1)
        .maybeSingle();

      if (periodBlock) {
        return new Response(
          JSON.stringify({ error: "slot_blocked_by_period", reason: periodBlock.reason }),
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

      // Upload audio if provided
      let audioNotePath: string | null = null;
      if (audio_base64 && typeof audio_base64 === "string") {
        try {
          const binaryStr = atob(audio_base64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
          const audioPath = `${clinic.id}/${crypto.randomUUID()}.webm`;
          const { error: uploadErr } = await supabase.storage
            .from("appointment-audios")
            .upload(audioPath, bytes, { contentType: "audio/webm", upsert: false });
          if (!uploadErr) audioNotePath = audioPath;
        } catch { /* skip audio on error */ }
      }

      // Create appointment
      const { data: appointment, error: insertError } = await supabase
        .from("appointments")
        .insert({
          tenant_id: clinic.id,
          patient_name: patient_name.trim(),
          professional_user_id: profProfile?.user_id ?? null,
          professional_name: professional_name.trim(),
          starts_at,
          type: type || "Consulta",
          status: "scheduled",
          audio_note_path: audioNotePath,
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
