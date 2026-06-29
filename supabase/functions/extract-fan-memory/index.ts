import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { fanMessage, fanId, creatorId, messageId } = await req.json();

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) return new Response(JSON.stringify({ extracted: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        temperature: 0,
        system: 'You extract personal facts from fan messages. Return ONLY valid JSON, no other text. Schema: {"facts":[{"category":"interest"|"personal_fact"|"life_event","key":string,"value":string}]}. Max 3 facts. Only extract things explicitly stated, not inferred. If nothing notable, return {"facts":[]}.',
        messages: [{ role: 'user', content: fanMessage }],
      }),
    });

    if (!aiRes.ok) return new Response(JSON.stringify({ extracted: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const aiData = await aiRes.json();
    const rawText = aiData.content?.[0]?.text?.trim() ?? '{"facts":[]}';
    const parsed = JSON.parse(rawText);
    const facts: Array<{ category: string; key: string; value: string }> = parsed.facts ?? [];

    if (facts.length === 0) return new Response(JSON.stringify({ extracted: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceRoleKey);

    for (const fact of facts) {
      await supabase.from('fan_memories').upsert({
        creator_id: creatorId,
        fan_id: fanId,
        category: fact.category,
        memory_key: fact.key,
        memory_value: fact.value,
        source_message_id: messageId || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'creator_id,fan_id,memory_key' });
    }

    return new Response(JSON.stringify({ extracted: facts.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('extract-fan-memory error:', e);
    return new Response(JSON.stringify({ extracted: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
