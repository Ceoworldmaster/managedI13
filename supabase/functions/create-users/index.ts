import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { users } = await req.json();

    if (!users || !Array.isArray(users)) {
      return new Response(JSON.stringify({ error: "users array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const results: Array<{ email: string; success: boolean; error?: string; id?: string }> = [];

    for (const user of users) {
      const { email, password, full_name, student_code, role, team_id, dorm_room_id, phone_number } = user;

      if (!email || !password || !full_name || !student_code || !role) {
        results.push({ email: email || "unknown", success: false, error: "Missing required fields" });
        continue;
      }

      const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
        body: JSON.stringify({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name, student_code },
        }),
      });

      const authData = await response.json();

      if (!response.ok) {
        results.push({ email, success: false, error: authData.message || authData.msg || "Failed to create auth user" });
        continue;
      }

      const userId = authData.id;

      // Insert profile
      const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          id: userId,
          student_code,
          full_name,
          role,
          team_id: team_id || null,
          dorm_room_id: dorm_room_id || null,
          phone_number: phone_number || null,
          must_change_password: true,
        }),
      });

      const profileData = await profileResponse.json();

      if (!profileResponse.ok) {
        results.push({ email, success: false, error: profileData.message || "Failed to create profile", id: userId });
      } else {
        results.push({ email, success: true, id: userId });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
