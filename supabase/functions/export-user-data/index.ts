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

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    console.log(`Exporting data for user: ${user.id}`);

    // Collect all user data
    const exportData: any = {
      exportDate: new Date().toISOString(),
      userId: user.id,
      email: user.email,
    };

    // Profile data
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    exportData.profile = profile;

    // Messages (sent)
    const { data: messages } = await supabaseClient
      .from("messages")
      .select("*")
      .eq("sender_id", user.id);
    exportData.messagesSent = messages || [];

    // Conversations
    const { data: conversations } = await supabaseClient
      .from("conversations")
      .select("*")
      .or(`creator_id.eq.${user.id},customer_id.eq.${user.id}`);
    exportData.conversations = conversations || [];

    // Transactions (as customer)
    const { data: customerTransactions } = await supabaseClient
      .from("transactions")
      .select("*")
      .eq("customer_id", user.id);
    exportData.transactionsAsCustomer = customerTransactions || [];

    // Transactions (as creator)
    const { data: creatorTransactions } = await supabaseClient
      .from("transactions")
      .select("*")
      .eq("creator_id", user.id);
    exportData.transactionsAsCreator = creatorTransactions || [];

    // Unlockables created - GDPR compliant: filter unlocked_by to only include requesting user
    const { data: unlockablesCreated } = await supabaseClient
      .from("unlockables")
      .select("*")
      .eq("creator_id", user.id);
    
    // Filter out other users' data from unlocked_by arrays (GDPR compliance)
    exportData.unlockablesCreated = (unlockablesCreated || []).map((u: any) => ({
      ...u,
      unlocked_by: u.unlocked_by?.includes(user.id) ? [user.id] : [],
    }));

    // Content the user has unlocked as a purchaser
    const { data: unlockedContent } = await supabaseClient
      .from("unlockables")
      .select("id, title, media_type, price, creator_id, created_at")
      .contains("unlocked_by", [user.id]);
    exportData.contentUnlocked = unlockedContent || [];

    // Notifications
    const { data: notifications } = await supabaseClient
      .from("notifications")
      .select("*")
      .eq("user_id", user.id);
    exportData.notifications = notifications || [];

    // Follows
    const { data: following } = await supabaseClient
      .from("user_follows")
      .select("*")
      .eq("follower_id", user.id);
    exportData.following = following || [];

    const { data: followers } = await supabaseClient
      .from("user_follows")
      .select("*")
      .eq("followed_id", user.id);
    exportData.followers = followers || [];

    // Wishlist
    const { data: wishlist } = await supabaseClient
      .from("wishlists")
      .select("*")
      .eq("user_id", user.id);
    exportData.wishlist = wishlist || [];

    // Email preferences
    const { data: emailPrefs } = await supabaseClient
      .from("email_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();
    exportData.emailPreferences = emailPrefs;

    // Creator settings (if creator)
    const { data: creatorSettings } = await supabaseClient
      .from("creator_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (creatorSettings) {
      // Remove sensitive data
      delete creatorSettings.stripe_account_id;
      exportData.creatorSettings = creatorSettings;
    }

    // Message packs (if creator)
    const { data: messagePacks } = await supabaseClient
      .from("message_packs")
      .select("*")
      .eq("creator_id", user.id);
    exportData.messagePacks = messagePacks || [];

    // Content bundles (if creator)
    const { data: bundles } = await supabaseClient
      .from("content_bundles")
      .select("*")
      .eq("creator_id", user.id);
    exportData.contentBundles = bundles || [];

    console.log("Data export completed successfully");

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="user-data-export-${user.id}-${Date.now()}.json"`,
      },
      status: 200,
    });
  } catch (error) {
    console.error("Error exporting user data:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
