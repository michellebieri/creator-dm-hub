import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { email } = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    // Check if any admin already exists
    const { data: existingAdmins } = await supabaseClient
      .from("user_roles")
      .select("id")
      .eq("role", "admin")
      .limit(1);

    if (existingAdmins && existingAdmins.length > 0) {
      throw new Error("Admin already exists. Use admin panel to manage roles.");
    }

    // Find user by email
    const { data: authUsers } = await supabaseClient.auth.admin.listUsers();
    const user = authUsers?.users.find(u => u.email === email);

    if (!user) {
      throw new Error("User not found with that email");
    }

    // Assign admin role
    const { error: roleError } = await supabaseClient
      .from("user_roles")
      .insert({
        user_id: user.id,
        role: "admin",
      });

    if (roleError) throw roleError;

    console.log(`Admin role assigned to user: ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Admin role successfully assigned to ${email}` 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error initializing admin:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
