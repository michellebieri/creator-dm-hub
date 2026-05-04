import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-CREATOR-REVENUE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");
    
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user) {
      throw new Error("User not authenticated");
    }
    logStep("User authenticated", { userId: user.id });

    // Get creator's Stripe connect status
    const { data: creatorSettings } = await supabaseClient
      .from('creator_settings')
      .select('stripe_account_id, stripe_connect_status')
      .eq('user_id', user.id)
      .single();

    // Get platform fees for this creator
    const { data: platformFees } = await supabaseClient
      .from('platform_fees')
      .select('*')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });

    // Calculate totals
    const completedFees = platformFees?.filter(f => f.status === 'completed') || [];
    const pendingFees = platformFees?.filter(f => f.status === 'pending') || [];

    const totalEarnings = completedFees.reduce((sum, f) => sum + Number(f.creator_net_amount), 0);
    const totalPlatformFees = completedFees.reduce((sum, f) => sum + Number(f.platform_fee_amount), 0);
    const totalGross = completedFees.reduce((sum, f) => sum + Number(f.gross_amount), 0);
    const pendingEarnings = pendingFees.reduce((sum, f) => sum + Number(f.creator_net_amount), 0);

    // Get monthly breakdown
    const monthlyData: Record<string, { gross: number; fees: number; net: number }> = {};
    completedFees.forEach(fee => {
      const month = new Date(fee.created_at).toISOString().slice(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { gross: 0, fees: 0, net: 0 };
      }
      monthlyData[month].gross += Number(fee.gross_amount);
      monthlyData[month].fees += Number(fee.platform_fee_amount);
      monthlyData[month].net += Number(fee.creator_net_amount);
    });

    logStep("Revenue calculated", { 
      totalEarnings, 
      totalPlatformFees, 
      totalGross,
      transactionCount: completedFees.length 
    });

    return new Response(JSON.stringify({ 
      stripeConnected: creatorSettings?.stripe_connect_status === 'active',
      stripeStatus: creatorSettings?.stripe_connect_status || 'not_connected',
      totalEarnings,
      totalPlatformFees,
      totalGross,
      pendingEarnings,
      recentTransactions: platformFees?.slice(0, 20) || [],
      monthlyBreakdown: Object.entries(monthlyData).map(([month, data]) => ({
        month,
        ...data
      })).sort((a, b) => b.month.localeCompare(a.month))
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
