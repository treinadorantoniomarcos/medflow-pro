import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action = "deactivate" | "reactivate" | "remove";

interface ManagePayload {
  action: Action;
  target_user_id: string;
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

    // Check requester is admin or owner
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

    const payload = (await req.json()) as ManagePayload;
    const { action, target_user_id } = payload;

    if (!action || !target_user_id) {
      return new Response(JSON.stringify({ error: "missing_fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["deactivate", "reactivate", "remove"].includes(action)) {
      return new Response(JSON.stringify({ error: "invalid_action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cannot modify yourself
    if (target_user_id === user.id) {
      return new Response(JSON.stringify({ error: "cannot_modify_self" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check target belongs to same tenant
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, tenant_id, full_name")
      .eq("user_id", target_user_id)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!targetProfile) {
      return new Response(JSON.stringify({ error: "target_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cannot remove/deactivate an owner
    const { data: targetRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", target_user_id)
      .eq("tenant_id", tenantId)
      .eq("role", "owner")
      .maybeSingle();

    if (targetRole) {
      return new Response(JSON.stringify({ error: "cannot_modify_owner" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let auditAction = "";
    const oldData: Record<string, unknown> = { user_id: target_user_id, full_name: targetProfile.full_name };

    if (action === "deactivate") {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ is_active: false })
        .eq("user_id", target_user_id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      auditAction = "deactivate_team_member";

    } else if (action === "reactivate") {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ is_active: true })
        .eq("user_id", target_user_id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      auditAction = "reactivate_team_member";

    } else if (action === "remove") {
      // Hard delete: remove role first, then profile
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", target_user_id)
        .eq("tenant_id", tenantId);

      await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("user_id", target_user_id)
        .eq("tenant_id", tenantId);

      auditAction = "remove_team_member";
    }

    // Audit log
    await supabaseAdmin.from("audit_logs").insert({
      tenant_id: tenantId,
      user_id: user.id,
      action: auditAction,
      table_name: "profiles",
      record_id: targetProfile.id,
      old_data: oldData,
      new_data: { action },
    });

    return new Response(
      JSON.stringify({ ok: true, action, target_user_id }),
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
