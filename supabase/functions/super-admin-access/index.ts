import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type GrantRole = "admin" | "super_admin";
type Action = "grant_access" | "set_access_status" | "revoke_access";

interface Payload {
  action: Action;
  full_name?: string;
  email?: string;
  phone?: string;
  role?: GrantRole;
  tenant_id?: string;
  target_user_id?: string;
  is_active?: boolean;
}

async function findUserByEmail(supabaseAdmin: any, email: string) {
  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data.users ?? [];
    const found = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
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

    const { data: requesterSuperAdmin } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .limit(1)
      .maybeSingle();

    if (!requesterSuperAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as Payload;

    if (!payload.action) {
      return new Response(JSON.stringify({ error: "missing_action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.action === "grant_access") {
      const fullName = payload.full_name?.trim();
      const email = payload.email?.trim().toLowerCase();
      const phone = payload.phone?.trim() || null;
      const role = payload.role;
      const requestedTenantId = payload.tenant_id?.trim() || null;

      if (!fullName || !email || !role || !["admin", "super_admin"].includes(role)) {
        return new Response(JSON.stringify({ error: "invalid_payload" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!requestedTenantId) {
        return new Response(JSON.stringify({ error: "tenant_required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: tenantExists } = await supabaseAdmin
        .from("clinics")
        .select("id")
        .eq("id", requestedTenantId)
        .maybeSingle();

      if (!tenantExists) {
        return new Response(JSON.stringify({ error: "tenant_not_found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let targetUserId: string | null = null;

      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName },
      });

      if (inviteError) {
        const message = inviteError.message.toLowerCase();
        const alreadyExists = message.includes("already") || message.includes("registered") || message.includes("exists");

        if (!alreadyExists) {
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

        targetUserId = existingAuthUser.id;
      } else {
        targetUserId = inviteData.user?.id ?? null;
      }

      if (!targetUserId) {
        return new Response(JSON.stringify({ error: "missing_target_user" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id, tenant_id")
        .eq("user_id", targetUserId)
        .maybeSingle();

      const effectiveTenantId = role === "super_admin" && existingProfile?.tenant_id
        ? existingProfile.tenant_id
        : requestedTenantId;

      if (role === "admin" && existingProfile?.tenant_id && existingProfile.tenant_id !== effectiveTenantId) {
        return new Response(JSON.stringify({ error: "user_belongs_to_another_tenant" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!existingProfile) {
        const { error: profileInsertError } = await supabaseAdmin.from("profiles").insert({
          user_id: targetUserId,
          tenant_id: effectiveTenantId,
          full_name: fullName,
          phone,
          is_active: true,
          accepting_bookings: true,
        });

        if (profileInsertError) {
          return new Response(JSON.stringify({ error: "profile_create_failed", detail: profileInsertError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        const { error: profileUpdateError } = await supabaseAdmin
          .from("profiles")
          .update({ full_name: fullName, phone, is_active: true })
          .eq("user_id", targetUserId);

        if (profileUpdateError) {
          return new Response(JSON.stringify({ error: "profile_update_failed", detail: profileUpdateError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .upsert(
          {
            user_id: targetUserId,
            tenant_id: effectiveTenantId,
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
        tenant_id: effectiveTenantId,
        user_id: user.id,
        action: "super_admin_grant_access",
        table_name: "user_roles",
        new_data: {
          target_user_id: targetUserId,
          email,
          role,
          tenant_id: effectiveTenantId,
        },
      });

      return new Response(
        JSON.stringify({ ok: true, target_user_id: targetUserId, role, tenant_id: effectiveTenantId }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (payload.action === "set_access_status") {
      const targetUserId = payload.target_user_id;
      const isActive = payload.is_active;
      const tenantId = payload.tenant_id;

      if (!targetUserId || typeof isActive !== "boolean" || !tenantId) {
        return new Response(JSON.stringify({ error: "invalid_payload" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ is_active: isActive })
        .eq("user_id", targetUserId);

      if (profileError) {
        return new Response(JSON.stringify({ error: "profile_update_failed", detail: profileError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin.from("audit_logs").insert({
        tenant_id: tenantId,
        user_id: user.id,
        action: isActive ? "super_admin_reactivate_access" : "super_admin_deactivate_access",
        table_name: "profiles",
        new_data: {
          target_user_id: targetUserId,
          is_active: isActive,
        },
      });

      return new Response(
        JSON.stringify({ ok: true, target_user_id: targetUserId, is_active: isActive }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (payload.action === "revoke_access") {
      const targetUserId = payload.target_user_id;
      const role = payload.role;
      const tenantId = payload.tenant_id;

      if (!targetUserId || !role || !tenantId) {
        return new Response(JSON.stringify({ error: "invalid_payload" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const query = supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", targetUserId)
        .eq("role", role);

      const { error: deleteError } =
        role === "super_admin"
          ? await query
          : await query.eq("tenant_id", tenantId);

      if (deleteError) {
        return new Response(JSON.stringify({ error: "role_delete_failed", detail: deleteError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin.from("audit_logs").insert({
        tenant_id: tenantId,
        user_id: user.id,
        action: "super_admin_revoke_access",
        table_name: "user_roles",
        new_data: {
          target_user_id: targetUserId,
          role,
          tenant_id: tenantId,
        },
      });

      return new Response(
        JSON.stringify({ ok: true, target_user_id: targetUserId, role, tenant_id: tenantId }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "invalid_action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "internal_error", detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
