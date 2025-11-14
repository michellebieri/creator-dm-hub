import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { conversationId, senderId, recipientId } = await req.json();

    if (!conversationId || !senderId || !recipientId) {
      throw new Error('Missing required fields');
    }

    // Check if recipient has an active auto-reply
    const { data: autoReplies, error: fetchError } = await supabaseClient
      .from('auto_replies')
      .select('*')
      .eq('creator_id', recipientId)
      .eq('is_active', true);

    if (fetchError) throw fetchError;
    if (!autoReplies || autoReplies.length === 0) {
      return new Response(JSON.stringify({ triggered: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentTime = now.toTimeString().slice(0, 5); // HH:mm format

    // Find applicable auto-reply
    let applicableReply = null;

    for (const reply of autoReplies) {
      if (reply.trigger_condition === 'always') {
        applicableReply = reply;
        break;
      } else if (reply.trigger_condition === 'first_message') {
        // Check if this is the first message in conversation from sender
        const { data: previousMessages } = await supabaseClient
          .from('messages')
          .select('id')
          .eq('conversation_id', conversationId)
          .eq('sender_id', senderId)
          .limit(2);

        if (previousMessages && previousMessages.length <= 1) {
          applicableReply = reply;
          break;
        }
      } else if (reply.trigger_condition === 'scheduled') {
        // Check if current time and day match schedule
        const daysActive = reply.days_active || [];
        const scheduleStart = reply.schedule_start;
        const scheduleEnd = reply.schedule_end;

        if (
          daysActive.includes(currentDay) &&
          scheduleStart &&
          scheduleEnd &&
          currentTime >= scheduleStart &&
          currentTime <= scheduleEnd
        ) {
          applicableReply = reply;
          break;
        }
      }
    }

    if (!applicableReply) {
      return new Response(JSON.stringify({ triggered: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if we already sent this auto-reply in this conversation recently (within 1 hour)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const { data: recentAutoReply } = await supabaseClient
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('sender_id', recipientId)
      .eq('content', applicableReply.message)
      .gte('created_at', oneHourAgo)
      .limit(1);

    if (recentAutoReply && recentAutoReply.length > 0) {
      return new Response(JSON.stringify({ triggered: false, reason: 'recent_reply' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send auto-reply message
    const { error: insertError } = await supabaseClient
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: recipientId,
        content: applicableReply.message,
        message_type: 'text',
        is_paid: false,
      });

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ 
        triggered: true, 
        reply: applicableReply.title 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-auto-reply:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
