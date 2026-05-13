import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function buildSystemPrompt(persona: any, creatorProfile: any, fanProfile: any, fanStats: any): string {
  const name = creatorProfile?.display_name || 'the creator';
  const fanName = fanProfile?.display_name || 'this fan';
  const totalSpent = fanStats?.total_spent ?? 0;
  const messageCount = fanStats?.message_count ?? 0;

  const toneMap: Record<string, string> = {
    flirty: 'playfully flirty and teasing, keeping things exciting',
    friendly: 'warm, friendly and approachable',
    playful: 'fun, playful and energetic',
    warm: 'caring, supportive and intimate',
    professional: 'professional yet personable',
  };
  const toneDesc = toneMap[persona.tone] || 'friendly and warm';

  const upsellMap: Record<string, string> = {
    light: 'Only mention your content when it naturally fits. Never push hard.',
    moderate: 'Occasionally suggest relevant content or bundles when the conversation is going well.',
    active: 'Actively look for opportunities to mention exclusive content, bundles, and special offers.',
  };
  const upsellInstructions = upsellMap[persona.upsell_aggressiveness] || upsellMap.moderate;

  let fanContext = '';
  if (totalSpent > 0) {
    fanContext = `This fan has spent $${totalSpent.toFixed(2)} total — they are an engaged supporter. Be warm and appreciative.`;
  } else if (messageCount > 0) {
    fanContext = `This fan has sent ${messageCount} messages but hasn't purchased yet. Be welcoming and gently encouraging.`;
  } else {
    fanContext = `This is a new or first-time fan. Be welcoming and make them feel special.`;
  }

  return `You are ${name}, a content creator chatting with your fan ${fanName} on a private messaging platform.

YOUR PERSONALITY:
- Tone: You are ${toneDesc}
- Communication style: ${persona.communication_style || 'Natural, conversational, genuine'}
- Phrases you use often: ${persona.common_phrases || 'None specified'}
- Topics you love: ${persona.favorite_topics || 'Your content and connecting with fans'}
- Topics to NEVER bring up: ${persona.forbidden_topics || 'Nothing specific'}
- How you greet fans: ${persona.greeting_style || 'Warm and personal'}
${persona.content_type ? `- Your content type: ${persona.content_type}` : ''}
${persona.custom_instructions ? `- Extra instructions: ${persona.custom_instructions}` : ''}

FAN CONTEXT:
${fanContext}

SELLING APPROACH:
${upsellInstructions}

WHEN FANS ASK FOR FREE CONTENT:
${persona.free_content_response || 'Kindly explain your exclusive content is available for purchase and offer details.'}

RULES:
- Write ONLY the reply — no labels, no quotes, no explanation
- Keep it short (1-3 sentences max) — this is texting, not an essay
- Sound like a real person texting, not an AI
- Use emojis sparingly and only if it fits your tone
- Never break character or admit to being an AI
- Never make up specific prices or content you don't know about`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Auth required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return new Response(JSON.stringify({ error: 'Invalid auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { conversationId, senderId, recipientId } = await req.json();
    if (!conversationId || !senderId || !recipientId) throw new Error('Missing fields');
    if (user.id !== senderId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const { data: conversation } = await supabase.from('conversations').select('creator_id, customer_id').eq('id', conversationId).single();
    if (!conversation) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const creatorId = recipientId;

    // Check AI persona
    const { data: persona } = await supabase.from('creator_ai_personas').select('*').eq('creator_id', creatorId).eq('is_enabled', true).maybeSingle();

    // Fallback to legacy auto-replies
    if (!persona) return await handleLegacyAutoReply(supabase, conversationId, senderId, recipientId, corsHeaders);

    // Don't reply if creator already replied recently
    const recentCutoff = new Date(Date.now() - persona.auto_reply_delay_minutes * 60 * 1000).toISOString();
    const { data: recentReply } = await supabase.from('messages').select('id').eq('conversation_id', conversationId).eq('sender_id', creatorId).gte('created_at', recentCutoff).limit(1);
    if (recentReply && recentReply.length > 0) return new Response(JSON.stringify({ triggered: false, reason: 'recent_reply' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Fetch last 10 messages for context
    const { data: recentMessages } = await supabase.from('messages').select('id, content, sender_id').eq('conversation_id', conversationId).order('created_at', { ascending: false }).limit(10);
    const history = (recentMessages || []).reverse();

    // Fetch profiles and fan stats in parallel
    const [{ data: creatorProfile }, { data: fanProfile }, { data: fanTxns }] = await Promise.all([
      supabase.from('profiles').select('display_name').eq('id', creatorId).single(),
      supabase.from('profiles').select('display_name').eq('id', senderId).single(),
      supabase.from('transactions').select('amount').eq('creator_id', creatorId).eq('customer_id', senderId).eq('status', 'completed'),
    ]);

    const fanStats = {
      total_spent: (fanTxns || []).reduce((s: number, t: any) => s + t.amount, 0),
      message_count: history.filter((m: any) => m.sender_id === senderId).length,
    };

    const systemPrompt = buildSystemPrompt(persona, creatorProfile, fanProfile, fanStats);
    const messages = history.map((m: any) => ({ role: m.sender_id === creatorId ? 'assistant' : 'user', content: m.content }));
    if (messages.length === 0) messages.push({ role: 'user', content: 'Hey!' });

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return new Response(JSON.stringify({ triggered: false, reason: 'no_api_key' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 200, system: systemPrompt, messages }),
    });

    if (!aiRes.ok) { console.error('Anthropic error:', await aiRes.text()); return new Response(JSON.stringify({ triggered: false, reason: 'ai_error' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }

    const aiData = await aiRes.json();
    const aiReply = aiData.content?.[0]?.text?.trim();
    if (!aiReply) return new Response(JSON.stringify({ triggered: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    if (persona.mode === 'draft') {
      await supabase.from('ai_draft_messages').insert({ conversation_id: conversationId, creator_id: creatorId, draft_content: aiReply, trigger_message_id: recentMessages?.[0]?.id ?? null, status: 'pending' });
      return new Response(JSON.stringify({ triggered: true, mode: 'draft' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: creatorId, content: aiReply, message_type: 'text', is_paid: false });
    return new Response(JSON.stringify({ triggered: true, mode: 'auto' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('check-auto-reply error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

function isWithinSchedule(reply: any): boolean {
  if (!reply.schedule_start || !reply.schedule_end) return false;
  if (!reply.days_active || reply.days_active.length === 0) return false;

  const now = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayName = dayNames[now.getUTCDay()];
  if (!reply.days_active.includes(todayName)) return false;

  // Compare HH:MM strings against current UTC time
  const currentTime = now.toISOString().slice(11, 16); // "HH:MM"
  const start = reply.schedule_start.slice(0, 5);
  const end = reply.schedule_end.slice(0, 5);

  // Handle overnight schedules (e.g., 22:00–06:00)
  if (start <= end) {
    return currentTime >= start && currentTime <= end;
  } else {
    return currentTime >= start || currentTime <= end;
  }
}

async function handleLegacyAutoReply(supabase: any, conversationId: string, senderId: string, recipientId: string, corsHeaders: any) {
  const { data: autoReplies } = await supabase.from('auto_replies').select('*').eq('creator_id', recipientId).eq('is_active', true);
  if (!autoReplies || autoReplies.length === 0) return new Response(JSON.stringify({ triggered: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  let applicableReply = null;
  for (const reply of autoReplies) {
    if (reply.trigger_condition === 'always') {
      applicableReply = reply;
      break;
    }
    if (reply.trigger_condition === 'first_message') {
      const { data: prev } = await supabase.from('messages').select('id').eq('conversation_id', conversationId).eq('sender_id', senderId).limit(2);
      if (prev && prev.length <= 1) { applicableReply = reply; break; }
    }
    if (reply.trigger_condition === 'scheduled') {
      if (isWithinSchedule(reply)) { applicableReply = reply; break; }
    }
  }
  if (!applicableReply) return new Response(JSON.stringify({ triggered: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: recipientId, content: applicableReply.message, message_type: 'text', is_paid: false });
  return new Response(JSON.stringify({ triggered: true, mode: 'legacy' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
