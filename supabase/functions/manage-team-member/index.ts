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

type CommercialPlanKey = "start" | "pro" | "signature";

type ProfessionalLimitConfig = {
  currentPlan: CommercialPlanKey;
  currentPlanLabel: string;
  maxProfessionals: number;
  nextPlanLabel: string;
  upgradePath: string;
  upgradeLabel: string;
  headline: string;
  description: string;
};

const normalizePlanKey = (value?: string | null): CommercialPlanKey => {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "pro" || normalized === "signature") return normalized;
  return "start";
};

const getProfessionalLimitConfig = (planKey?: string | null): ProfessionalLimitConfig => {
  const currentPlan = normalizePlanKey(planKey);

  switch (currentPlan) {
    case "pro":
      return {
        currentPlan,
        currentPlanLabel: "Pro",
        maxProfessionals: 3,
        nextPlanLabel: "Signature",
        upgradePath: "/assinar?plan=signature",
        upgradeLabel: "Assinar Signature",
        headline: "A partir do 4º profissional, faça upgrade para o Signature.",
        description: "O plano Pro permite até 3 profissionais ativos.",
      };
    case "signature":
      return {
        currentPlan,
        currentPlanLabel: "Signature",
        maxProfessionals: 10,
        nextPlanLabel: "Pacote Executivo",
        upgradePath: "/assinar?mode=upgrade",
        upgradeLabel: "Solicitar pacote executivo",
        headline: "A partir do 11º profissional, solicite o pacote executivo.",
        description: "O plano Signature permite até 10 profissionais ativos.",
      };
    case "start":
    default:
      return {
        currentPlan: "start",
        currentPlanLabel: "Start",
        maxProfessionals: 1,
        nextPlanLabel: "Pro",
        upgradePath: "/assinar?plan=pro",
        upgradeLabel: "Assinar Pro",
        headline: "A partir do 2º profissional, faça upgrade para o Pro.",
        description: "O plano Start permite até 1 profissional ativo.",
      };
  }
};

async function countActiveProfessionals(supabaseAdmin: any, tenantId: string) {
  const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] = await Promise.all([
    supabaseAdmin.from("profiles").select("user_id, is_active").eq("tenant_id", tenantId),
    supabaseAdmin.from("user_roles").select("user_id, role").eq("tenant_id", tenantId).eq("role", "professional"),
  ]);

  if (profilesError) throw profilesError;
  if (rolesError) throw rolesError;

  const activeUsers = new Set(
    (profiles ?? [])
      .filter((profile: any) => profile.is_active !== false)
      .map((profile: any) => profile.user_id)
  );

  return (roles ?? []).filter((role: any) => activeUsers.has(role.user_id)).length;
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

    const { data: clinic } = await supabaseAdmin
      .from("clinics")
      .select("settings")
      .eq("id", tenantId)
      .maybeSingle();
    const limitConfig = getProfessionalLimitConfig(clinic?.settings?.subscription?.plan);

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

    const { data: targetRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", target_user_id)
      .eq("tenant_id", tenantId);
    const targetIsProfessional = !(targetRoles ?? []).length || (targetRoles ?? []).some((row: any) => row.role === "professional");

    if (action === "reactivate" && targetIsProfessional) {
      const activeProfessionalCount = await countActiveProfessionals(supabaseAdmin, tenantId);
      if (activeProfessionalCount >= limitConfig.maxProfessionals) {
        return new Response(
          JSON.stringify({
            error: "professional_limit_reached",
            detail: limitConfig.description,
            current_professionals: activeProfessionalCount,
            max_professionals: limitConfig.maxProfessionals,
            current_plan: limitConfig.currentPlan,
            current_plan_label: limitConfig.currentPlanLabel,
            next_plan_label: limitConfig.nextPlanLabel,
            upgrade_label: limitConfig.upgradeLabel,
            upgrade_path: limitConfig.upgradePath,
            headline: limitConfig.headline,
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
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
