import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require admin secret for this sensitive endpoint
    const adminSecret = Deno.env.get("ADMIN_INIT_SECRET");
    const providedSecret = req.headers.get("x-admin-secret");
    
    if (!adminSecret) {
      console.error("ADMIN_INIT_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    if (!providedSecret || providedSecret !== adminSecret) {
      console.error("Unauthorized admin initialization attempt");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : null;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

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
