import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Require internal secret — this function is only called by cron or server-side
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const internalSecret = Deno.env.get('INTERNAL_FUNCTION_SECRET') ?? '';
  const isServiceRole = authHeader === `Bearer ${serviceRoleKey}`;
  const isInternalSecret = internalSecret && authHeader === `Bearer ${internalSecret}`;
  if (!isServiceRole && !isInternalSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Processing scheduled messages...');

    // Get all pending scheduled messages that are due
    const { data: scheduledMessages, error: fetchError } = await supabase
      .from('scheduled_messages')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching scheduled messages:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${scheduledMessages?.length || 0} messages to send`);

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
    };

    // Process each message
    for (const scheduledMsg of scheduledMessages || []) {
      results.processed++;
      
      try {
        // Send the message
        const { error: msgError } = await supabase
          .from('messages')
          .insert({
            conversation_id: scheduledMsg.conversation_id,
            sender_id: scheduledMsg.sender_id,
            content: scheduledMsg.content,
            message_type: scheduledMsg.message_type,
            voice_url: scheduledMsg.voice_url,
            voice_duration: scheduledMsg.voice_duration,
            is_paid: true, // Scheduled messages are from creators
          });

        if (msgError) throw msgError;

        // Update scheduled message status
        await supabase
          .from('scheduled_messages')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', scheduledMsg.id);

        // Get conversation details for notification
        const { data: conversation } = await supabase
          .from('conversations')
          .select('customer_id, creator_id')
          .eq('id', scheduledMsg.conversation_id)
          .single();

        // Send notification to customer
        if (conversation?.customer_id) {
          const { data: sender } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', scheduledMsg.sender_id)
            .single();

          // Fire and forget notification
          supabase.functions.invoke('create-notification', {
            body: {
              userId: conversation.customer_id,
              type: 'new_message',
              title: `New message from ${sender?.display_name || 'Creator'}`,
              message: scheduledMsg.content.substring(0, 100),
              link: '/messages',
            },
          }).catch(err => console.log('Notification error:', err));
        }

        results.sent++;
        console.log(`Successfully sent scheduled message ${scheduledMsg.id}`);
      } catch (error) {
        results.failed++;
        console.error(`Failed to send scheduled message ${scheduledMsg.id}:`, error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Update scheduled message with error
        await supabase
          .from('scheduled_messages')
          .update({
            status: 'failed',
            error_message: errorMessage,
          })
          .eq('id', scheduledMsg.id);
      }
    }

    console.log('Processing complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing scheduled messages:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
