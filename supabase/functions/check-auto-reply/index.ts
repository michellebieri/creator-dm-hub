import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function buildSystemPrompt(persona: any, creatorProfile: any, fanProfile: any, fanStats: any, weeklyContext: string | null, contentToPromote: any[], fanMemories: any[]): string {
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

  return `${weeklyContext ? `TODAY'S CONTEXT — this overrides everything. If asked where you are or what you're doing, use this:
${weeklyContext}

` : ''}${contentToPromote.length > 0 ? `CONTENT YOU CAN SELL (mention naturally when it fits — never force it):
${contentToPromote.map((c: any) => `- "${c.title}" — $${Number(c.price).toFixed(2)}${c.description ? ` (${c.description})` : ''}`).join('\n')}

` : ''}${fanMemories.length > 0 ? `WHAT YOU KNOW ABOUT THIS FAN (weave in naturally, NEVER say "I remember you told me"):
${fanMemories.map((m: any) => `- ${m.memory_key}: ${m.memory_value}`).join('\n')}

` : ''}You are ${name}, a content creator chatting with your fan ${fanName} on a private messaging platform.

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

LANGUAGE:
- The creator supports these languages: ${(persona.supported_languages || ['English']).join(', ')}
- Detect the language the fan is writing in.
- If the fan writes in a supported language, reply in that language.
- If the fan writes in a language NOT on the list, reply in the creator's first supported language. Do not explain why.
- SWISS GERMAN DIALECT: Swiss German is a dialect, not a language.
  German and Swiss German are NOT the same — treat them separately.

  DETECTION RULE: Only switch to Swiss German if the fan's message contains
  clear dialect markers: ned, nöd, ech, öpis, hüt, höt, etz, gaats, gohds,
  hesch, besch, esch, chille, gmacht, hani, beni, goni, lueg, gell, bi der,
  chum, scho, au, well (=weil), jo (=ja), met, för, üs, glii, or similar
  unmistakable Swiss German spellings. Standard German stays in standard German.
  When in doubt → standard German. Only switch when 100% certain.
  RESET RULE: Each message is evaluated independently. If the fan's current
  message is in standard German (contains ich, bin, habe, wollte, möchte,
  können, werden etc. without any Swiss German markers), always reply in
  standard German — even if the previous messages were in Swiss German.
  Never carry dialect forward when the fan switches back to standard German.

  SWISS GERMAN RULES (only when dialect is confirmed):

  STYLE: Write exactly like these real examples — phonetic, fast, warm,
  flowing like a voice message in text form. Mix short punchy sentences
  with longer emotional ones depending on the mood. Very enthusiastic,
  grateful, personal energy. Naturally mix in English words like omg, wow,
  super, chill. Use emojis freely and naturally: ❤️ 😆 😍 🙏 🫶 💪 ✨ 😂
  No commas — only exclamation marks. Stream of consciousness.

  REAL EXAMPLES — match this voice exactly:
  Casual: "Hallo wie gohds? mer gods super! höt beni am schaffe gsi und etz
  goni de is Gym. ech ha sooo moskelkater omg! und wie gods dinere Familie?
  minere goods guet zum glöck, be so dankbar, glii gohni uf Bali met mim
  schwösterli und mim frönd. ech ha sones schöns Läbe wow be so onglaublech
  dankbar"
  Heartfelt: "Ech weiss, mini Entscheidige öberrompled dech mängisch und du
  chasch velliecht ned emmer alles sofort nachvollzieh, well ech velles anders
  mache als anderi. Aber genau ah dem Punkt mosi der eifach säge, dass das
  alles ergendwie jo au vo der chonnt."

  SUBSTITUTIONS — apply every single one without exception:
  ich→ech   mir→mer   mich→mech   dich→dech   wir→mer   ihr→ehr
  bin→be/ben   bist→besch   ist→esch   sind→send
  habe→ha/han   hast→hesch   habt→hend   gehabt→gha
  nicht→ned/nöd (vary both)   nichts→nüt   etwas→öpis
  auch→au   weil→well   ja→jo   aber→aber
  mit→met   für→för   auf→uf   uns→üs   von→vo
  heute→höt/hüt   jetzt→etz   gleich/bald→glii   nochmal→nomol
  vielleicht→velliecht/vellecht   irgendwie→ergendwie   immer→emmer
  einfach→eifach   wirklich→wörkli/würkli   mega→mega
  nicht→nöd   wieder→weder   dann→denn   also→aso
  über→öber   für immer→för emmer   nach→no
  Leben→Läbe   Zeit→Ziit   Liebe→Liebi   Werte→Wärt
  vieles→velles   vielen→vellne   echte→ächti/echti
  Freundschaften→Fröndschafte   Zusammenhalt→Zämehalt

  FUSED VERB+PRONOUN (always fuse these):
  muss ich→mosi   bin ich→beni   gehe ich→goni   habe ich→hani
  kann ich→kani   mache ich→machi   sage ich→sägi

  INFINITIVES: always shorten with z:
  zu denken→z denke   zu sein→z sii   zu werden→z wärde
  zu gehen→z goh   zu machen→z mache

  GREETINGS — vary every time, never repeat the same opener:
  "Hallo!", "Hey!", "Heyy!", "Hi!", "Jo heyy!", "Hoi!", or skip greeting
  entirely and jump straight into the reply.

RULES:
- Write ONLY the reply. No labels, no quotes, no explanation.
- Keep it short (1-3 sentences max). This is texting, not an essay.
- Sound like a real person texting, not an AI.
- Use emojis sparingly and only if they fit your tone.
- NEVER use em dashes (—) or en dashes (–). Use periods, commas, or new sentences instead. Em dashes are an AI tell and instantly break the illusion. This rule is absolute.
- Never break character or admit to being an AI.
- Never make up specific prices or content you don't know about.
- NATURALNESS IS THE #1 RULE: Every reply must look like the creator typed it on their phone. If it reads like AI, you have failed.
- Do NOT always use perfect punctuation. Real texters often write "dont" "its" "youre" "Im" without apostrophes. Mix it up — sometimes correct, sometimes not.
- Vary message length. Sometimes one short punchy sentence. Sometimes two quick ones. Never a polished paragraph.
- Occasionally write fully lowercase when the mood is casual.
- Never start replies the same way twice in a row.
- A reply that looks slightly fast-typed is always better than one that looks generated.`;
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
    console.log('check-auto-reply received:', { conversationId, senderId, recipientId });
    if (!conversationId || !senderId || !recipientId) throw new Error('Missing fields');
    if (user.id !== senderId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const { data: conversation, error: convError } = await supabase.from('conversations').select('creator_id, customer_id').eq('id', conversationId).maybeSingle();
    console.log('conversation lookup:', { conversationId, found: !!conversation, error: convError?.message });
    if (!conversation) return new Response(JSON.stringify({ error: 'Conversation not found', conversationId }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const creatorId = recipientId;

    // Check AI persona — query WITHOUT is_enabled filter so we can distinguish
    // "AI disabled by creator" from "creator has no persona row at all".
    const { data: persona } = await supabase.from('creator_ai_personas').select('*').eq('creator_id', creatorId).maybeSingle();

    // Creator has a persona row but AI is off → silent, no reply at all.
    // Do NOT fall through to legacy auto-replies: the creator opted into the AI
    // system and explicitly turned it off. Respect that choice.
    if (persona && !persona.is_enabled) {
      return new Response(JSON.stringify({ triggered: false, reason: 'ai_disabled' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // No persona row at all → creator predates the AI system, fall back to legacy auto-replies.
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

    const [{ data: fanMemories }, { data: rawFeatured }] = await Promise.all([
      supabase
        .from('fan_memories')
        .select('category, memory_key, memory_value')
        .eq('creator_id', creatorId)
        .eq('fan_id', senderId)
        .order('updated_at', { ascending: false })
        .limit(15),
      Promise.resolve({ data: (persona.featured_content && persona.featured_content.length > 0)
        ? persona.featured_content
        : null }),
    ]);

    let contentToPromote: any[] = rawFeatured || [];
    if (contentToPromote.length === 0) {
      const { data: fallback } = await supabase
        .from('unlockables')
        .select('id, title, price, media_type, caption')
        .eq('creator_id', creatorId)
        .not('title', 'is', null)
        .order('created_at', { ascending: false })
        .limit(3);
      contentToPromote = (fallback || []).map((u: any) => ({
        id: u.id, type: 'unlockable', title: u.title, price: u.price,
        description: u.caption || u.media_type,
      }));
    }

    const systemPrompt = buildSystemPrompt(persona, creatorProfile, fanProfile, fanStats, persona.weekly_context || null, contentToPromote, fanMemories || []);

    // Collapse consecutive same-role messages: Anthropic rejects non-alternating turns.
    // Common when the creator hasn't replied in a while (all recent messages are fan = 'user').
    const rawMsgs = history.map((m: any) => ({
      role: m.sender_id === creatorId ? 'assistant' : 'user',
      content: m.content as string,
    }));
    const merged: { role: string; content: string }[] = [];
    for (const msg of rawMsgs) {
      if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
        merged[merged.length - 1].content += '\n' + msg.content;
      } else {
        merged.push({ role: msg.role, content: msg.content });
      }
    }
    if (merged.length > 0 && merged[0].role === 'assistant') merged.shift();
    const messages = merged.length > 0 ? merged : [{ role: 'user', content: 'Hey!' }];

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return new Response(JSON.stringify({ triggered: false, reason: 'no_api_key' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 200, temperature: 0.3, system: systemPrompt, messages }),
    });

    if (!aiRes.ok) { console.error('Anthropic error:', await aiRes.text()); return new Response(JSON.stringify({ triggered: false, reason: 'ai_error' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }

    const aiData = await aiRes.json();
    const aiReply = aiData.content?.[0]?.text?.trim();
    if (!aiReply) return new Response(JSON.stringify({ triggered: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    if (persona.mode === 'draft') {
      const { error: draftError } = await supabase.from('ai_draft_messages').insert({ conversation_id: conversationId, creator_id: creatorId, draft_content: aiReply, trigger_message_id: recentMessages?.[0]?.id ?? null, status: 'pending' });
      if (draftError) {
        console.error('[check-auto-reply] ai_draft_messages insert failed:', draftError);
        return new Response(JSON.stringify({ triggered: false, reason: 'insert_failed', detail: draftError.message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ triggered: true, mode: 'draft' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { error: insertError } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: creatorId,
      content: aiReply,
      message_type: 'text',
      is_paid: false,
    });

    if (insertError) {
      console.error('[check-auto-reply] messages insert failed:', insertError);
      return new Response(
        JSON.stringify({ triggered: false, reason: 'insert_failed', detail: insertError.message }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Extract and store fan memory from the latest fan message
    const lastFanMessage = history.filter((m: any) => m.sender_id === senderId).pop();
    if (lastFanMessage?.content) {
      try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/extract-fan-memory`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fanMessage: lastFanMessage.content,
            fanId: senderId,
            creatorId,
            messageId: lastFanMessage.id,
          }),
        });
      } catch (e) {
        console.error('Memory extraction failed (non-fatal):', e);
        // Never block the response for this
      }
    }

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
