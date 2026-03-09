import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type InviteRole = "professional" | "receptionist" | "admin";

interface InvitePayload {
  full_name: string;
  email: string;
  phone?: string;
  role: InviteRole;
  accepting_bookings?: boolean;
}

async function findUserByEmail(supabaseAdmin: any, email: string) {
  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data.users ?? [];
    const found = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (users.length < perPage) break;
    page += 1;
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing_auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: requesterProfile } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!requesterProfile?.tenant_id) {
      return new Response(JSON.stringify({ error: "requester_profile_not_found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantId = requesterProfile.tenant_id;

    const { data: requesterRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .in("role", ["owner", "admin"])
      .limit(1)
      .maybeSingle();

    if (!requesterRole) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as InvitePayload;
    const fullName = payload.full_name?.trim();
    const email = payload.email?.trim().toLowerCase();
    const phone = payload.phone?.trim() || null;
    const role = payload.role;
    const acceptingBookings = payload.accepting_bookings ?? true;

    if (!fullName || !email || !role) {
      return new Response(JSON.stringify({ error: "missing_fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["professional", "receptionist", "admin"].includes(role)) {
      return new Response(JSON.stringify({ error: "invalid_role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let invitedUserId: string | null = null;

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
    });

    if (inviteError) {
      const message = inviteError.message.toLowerCase();
      const userExists =
        message.includes("already") ||
        message.includes("registered") ||
        message.includes("exists");

      if (!userExists) {
        return new Response(JSON.stringify({ error: "invite_failed", detail: inviteError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const existingAuthUser = await findUserByEmail(supabaseAdmin, email);
      if (!existingAuthUser?.id) {
        return new Response(JSON.stringify({ error: "user_lookup_failed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      invitedUserId = existingAuthUser.id;
    } else {
      invitedUserId = inviteData.user?.id ?? null;
    }

    if (!invitedUserId) {
      return new Response(JSON.stringify({ error: "invite_user_id_missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, tenant_id")
      .eq("user_id", invitedUserId)
      .maybeSingle();

    if (existingProfile && existingProfile.tenant_id !== tenantId) {
      return new Response(JSON.stringify({ error: "user_belongs_to_another_tenant" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profileRow, error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          user_id: invitedUserId,
          tenant_id: tenantId,
          full_name: fullName,
          phone,
          accepting_bookings: acceptingBookings,
        },
        { onConflict: "user_id" }
      )
      .select("id")
      .single();

    if (profileError) {
      return new Response(JSON.stringify({ error: "profile_upsert_failed", detail: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        {
          user_id: invitedUserId,
          tenant_id: tenantId,
          role,
        },
        { onConflict: "user_id,role,tenant_id" }
      );

    if (roleError) {
      return new Response(JSON.stringify({ error: "role_upsert_failed", detail: roleError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabaseAdmin.from("audit_logs").insert({
      tenant_id: tenantId,
      user_id: user.id,
      action: "invite_team_member",
      table_name: "profiles",
      record_id: profileRow.id,
      new_data: {
        invited_user_id: invitedUserId,
        full_name: fullName,
        email,
        role,
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        invited_user_id: invitedUserId,
        email,
        role,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "internal_error", detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
