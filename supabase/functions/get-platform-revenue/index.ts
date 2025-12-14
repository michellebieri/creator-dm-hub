import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-PLATFORM-REVENUE] ${step}${detailsStr}`);
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

    // Check if user is platform owner
    const { data: platformConfig } = await supabaseClient
      .from('platform_config')
      .select('*')
      .single();

    if (!platformConfig || platformConfig.platform_owner_user_id !== user.id) {
      throw new Error("Only platform owner can access this data");
    }
    logStep("Platform owner verified");

    // Get ALL platform fees
    const { data: allFees } = await supabaseClient
      .from('platform_fees')
      .select(`
        *,
        creator:creator_id(id, display_name, username, avatar_url)
      `)
      .order('created_at', { ascending: false });

    // Calculate totals
    const completedFees = allFees?.filter(f => f.status === 'completed') || [];
    const pendingFees = allFees?.filter(f => f.status === 'pending') || [];

    const totalPlatformRevenue = completedFees.reduce((sum, f) => sum + Number(f.platform_fee_amount), 0);
    const totalGrossVolume = completedFees.reduce((sum, f) => sum + Number(f.gross_amount), 0);
    const totalCreatorPayouts = completedFees.reduce((sum, f) => sum + Number(f.creator_net_amount), 0);
    const pendingPlatformRevenue = pendingFees.reduce((sum, f) => sum + Number(f.platform_fee_amount), 0);

    // Get revenue by creator
    const creatorRevenue: Record<string, { 
      creator: any; 
      gross: number; 
      platformFee: number; 
      creatorNet: number; 
      count: number 
    }> = {};
    
    completedFees.forEach(fee => {
      const creatorId = fee.creator_id;
      if (!creatorRevenue[creatorId]) {
        creatorRevenue[creatorId] = {
          creator: fee.creator,
          gross: 0,
          platformFee: 0,
          creatorNet: 0,
          count: 0
        };
      }
      creatorRevenue[creatorId].gross += Number(fee.gross_amount);
      creatorRevenue[creatorId].platformFee += Number(fee.platform_fee_amount);
      creatorRevenue[creatorId].creatorNet += Number(fee.creator_net_amount);
      creatorRevenue[creatorId].count += 1;
    });

    // Get monthly breakdown
    const monthlyData: Record<string, { gross: number; platformFee: number; creatorPayout: number; count: number }> = {};
    completedFees.forEach(fee => {
      const month = new Date(fee.created_at).toISOString().slice(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { gross: 0, platformFee: 0, creatorPayout: 0, count: 0 };
      }
      monthlyData[month].gross += Number(fee.gross_amount);
      monthlyData[month].platformFee += Number(fee.platform_fee_amount);
      monthlyData[month].creatorPayout += Number(fee.creator_net_amount);
      monthlyData[month].count += 1;
    });

    logStep("Platform revenue calculated", { 
      totalPlatformRevenue, 
      totalGrossVolume,
      creatorCount: Object.keys(creatorRevenue).length,
      transactionCount: completedFees.length 
    });

    return new Response(JSON.stringify({ 
      platformFeePercentage: platformConfig.platform_fee_percentage,
      totalPlatformRevenue,
      totalGrossVolume,
      totalCreatorPayouts,
      pendingPlatformRevenue,
      recentTransactions: allFees?.slice(0, 50) || [],
      creatorBreakdown: Object.values(creatorRevenue).sort((a, b) => b.platformFee - a.platformFee),
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
