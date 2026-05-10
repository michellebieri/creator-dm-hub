import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured');

    // Allow running for a specific creator or all creators
    let body: any = {};
    try { body = await req.json(); } catch { /* no body */ }
    const targetCreatorId = body?.creatorId ?? null;

    // Find all creators with proactive outreach enabled
    let personaQuery = supabase.from('creator_ai_personas').select('*').eq('is_enabled', true).eq('proactive_outreach_enabled', true);
    if (targetCreatorId) personaQuery = personaQuery.eq('creator_id', targetCreatorId);
    const { data: personas, error: personaErr } = await personaQuery;
    if (personaErr) throw personaErr;
    if (!personas || personas.length === 0) return new Response(JSON.stringify({ processed: 0, message: 'No personas with outreach enabled' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    let totalSent = 0;

    for (const persona of personas) {
      const creatorId = persona.creator_id;
      const delayCutoff = new Date(Date.now() - persona.proactive_outreach_delay_days * 24 * 60 * 60 * 1000).toISOString();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Get creator profile
      const { data: creatorProfile } = await supabase.from('profiles').select('display_name').eq('id', creatorId).single();

      // Find all conversations for this creator where fan hasn't been outreached today
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, customer_id')
        .eq('creator_id', creatorId);

      if (!conversations || conversations.length === 0) continue;

      for (const conv of conversations) {
        const fanId = conv.customer_id;
        if (!fanId) continue;

        // Skip if already sent outreach to this fan today
        const { data: recentOutreach } = await supabase
          .from('ai_outreach_log')
          .select('id')
          .eq('creator_id', creatorId)
          .eq('fan_id', fanId)
          .gte('sent_at', todayStart.toISOString())
          .limit(1);
        if (recentOutreach && recentOutreach.length > 0) continue;

        // Check last message in conversation — skip if recent
        const { data: lastMessages } = await supabase
          .from('messages')
          .select('created_at, sender_id')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const lastMessage = lastMessages?.[0];
        // Skip if fan messaged recently (within delay window)
        if (lastMessage && lastMessage.created_at > delayCutoff) continue;
        // Skip if the last message was already from the creator (don't double-outreach)
        if (lastMessage && lastMessage.sender_id === creatorId) {
          const lastCreatorMsg = new Date(lastMessage.created_at);
          const silenceThreshold = new Date(Date.now() - persona.proactive_outreach_delay_days * 24 * 60 * 60 * 1000);
          if (lastCreatorMsg > silenceThreshold) continue;
        }

        // Get fan profile and spending history
        const [{ data: fanProfile }, { data: fanTxns }] = await Promise.all([
          supabase.from('profiles').select('display_name').eq('id', fanId).single(),
          supabase.from('transactions').select('amount, transaction_type, created_at').eq('creator_id', creatorId).eq('customer_id', fanId).eq('status', 'completed').order('created_at', { ascending: false }).limit(5),
        ]);

        const totalSpent = (fanTxns || []).reduce((s: number, t: any) => s + t.amount, 0);
        const fanName = fanProfile?.display_name || 'there';

        // Build a personalized outreach prompt
        let fanContext = '';
        if (totalSpent > 50) fanContext = `This is a VIP fan who has spent $${totalSpent.toFixed(2)}. Make them feel very special.`;
        else if (totalSpent > 0) fanContext = `This fan has spent $${totalSpent.toFixed(2)} before. Re-engage warmly.`;
        else fanContext = `This fan hasn't purchased yet. Keep it light and welcoming — no sales pressure.`;

        const daysSilent = lastMessage
          ? Math.floor((Date.now() - new Date(lastMessage.created_at).getTime()) / (1000 * 60 * 60 * 24))
          : 30;

        const outreachSystemPrompt = `You are ${creatorProfile?.display_name || 'a creator'} reaching out to a fan you haven't heard from in ${daysSilent} days.

YOUR PERSONALITY:
- Tone: ${persona.tone || 'friendly'}
- Style: ${persona.communication_style || 'casual and warm'}
- Common phrases: ${persona.common_phrases || 'none specified'}
${persona.custom_instructions ? `- Extra notes: ${persona.custom_instructions}` : ''}

FAN CONTEXT:
${fanContext}

Write a short, warm re-engagement opener (1-2 sentences max). 
Sound natural and human — like you're genuinely checking in.
Do NOT be salesy. Do NOT mention purchases directly.
Do NOT use generic lines like "Hey, I miss you!" — be specific or creative.
Just write the message text, nothing else.`;

        const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 100,
            system: outreachSystemPrompt,
            messages: [{ role: 'user', content: `Write my re-engagement message to ${fanName}` }],
          }),
        });

        if (!aiRes.ok) { console.error('Anthropic error for fan', fanId); continue; }

        const aiData = await aiRes.json();
        const outreachMsg = aiData.content?.[0]?.text?.trim();
        if (!outreachMsg) continue;

        // Send the message
        const { error: msgErr } = await supabase.from('messages').insert({
          conversation_id: conv.id,
          sender_id: creatorId,
          content: outreachMsg,
          message_type: 'text',
          is_paid: false,
        });
        if (msgErr) { console.error('Failed to send outreach message:', msgErr); continue; }

        // Log it
        await supabase.from('ai_outreach_log').insert({
          creator_id: creatorId,
          fan_id: fanId,
          conversation_id: conv.id,
          message_content: outreachMsg,
        });

        totalSent++;
      }
    }

    return new Response(JSON.stringify({ success: true, messages_sent: totalSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('ai-proactive-outreach error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
