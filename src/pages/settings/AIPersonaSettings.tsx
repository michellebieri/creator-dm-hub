import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Bot, Sparkles, Zap, Clock, MessageCircle, Save, Brain, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface AIPersona {
  is_enabled: boolean;
  mode: string;
  auto_reply_delay_minutes: number;
  tone: string;
  communication_style: string;
  common_phrases: string;
  favorite_topics: string;
  forbidden_topics: string;
  greeting_style: string;
  free_content_response: string;
  content_type: string;
  upsell_aggressiveness: string;
  custom_instructions: string;
  proactive_outreach_enabled: boolean;
  proactive_outreach_delay_days: number;
  weekly_context: string;
  featured_content: any[];
  updated_at?: string;
}

const defaultPersona: AIPersona = {
  is_enabled: false,
  mode: 'draft',
  auto_reply_delay_minutes: 10,
  tone: 'friendly',
  communication_style: '',
  common_phrases: '',
  favorite_topics: '',
  forbidden_topics: '',
  greeting_style: '',
  free_content_response: '',
  content_type: '',
  upsell_aggressiveness: 'moderate',
  custom_instructions: '',
  proactive_outreach_enabled: false,
  proactive_outreach_delay_days: 3,
  weekly_context: '',
  featured_content: [],
};

const AIPersonaSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [persona, setPersona] = useState<AIPersona>(defaultPersona);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'overview' | 'personality' | 'outreach'>('overview');
  const [unlockables, setUnlockables] = useState<Array<{ id: string; title: string; price: number }>>([]);
  const [selectedContentIds, setSelectedContentIds] = useState<string[]>([]);
  const [fanMemoryCount, setFanMemoryCount] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase
        .from('creator_ai_personas')
        .select('*')
        .eq('creator_id', user.id)
        .maybeSingle(),
      supabase
        .from('unlockables')
        .select('id, title, price')
        .eq('creator_id', user.id)
        .not('title', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('fan_memories')
        .select('fan_id')
        .eq('creator_id', user.id),
    ]).then(([personaRes, unlockablesRes, memoriesRes]) => {
      if (personaRes.data) {
        const p = { ...defaultPersona, ...personaRes.data };
        setPersona(p);
        const featuredIds = (p.featured_content || []).map((c: any) => c.id);
        setSelectedContentIds(featuredIds);
      }
      if (unlockablesRes.data) setUnlockables(unlockablesRes.data as any);
      if (memoriesRes.data) {
        const unique = new Set((memoriesRes.data as any[]).map((r: any) => r.fan_id));
        setFanMemoryCount(unique.size);
      }
      setLoading(false);
    });
  }, [user]);

  const update = (field: keyof AIPersona, value: any) =>
    setPersona(prev => ({ ...prev, [field]: value }));

  const toggleContent = (item: { id: string; title: string; price: number }) => {
    setSelectedContentIds(prev => {
      if (prev.includes(item.id)) return prev.filter(id => id !== item.id);
      if (prev.length >= 5) return prev;
      return [...prev, item.id];
    });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const featuredContent = unlockables
        .filter(u => selectedContentIds.includes(u.id))
        .map(u => ({ id: u.id, type: 'unlockable', title: u.title, price: u.price }));
      const { error } = await supabase
        .from('creator_ai_personas')
        .upsert({
          ...persona,
          creator_id: user.id,
          featured_content: featuredContent,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'creator_id' });
      if (error) throw error;
      toast.success('AI persona saved!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-semibold">AI Assistant</h1>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : <><Save className="h-4 w-4 mr-1" />Save</>}
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">

        {/* This Week */}
        <Card className="p-4 border-border">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">This Week</h2>
            {persona.updated_at && (
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(persona.updated_at).toDateString() === new Date().toDateString()
                  ? 'Updated today'
                  : `Updated ${formatDistanceToNow(new Date(persona.updated_at))} ago`}
              </span>
            )}
          </div>
          <div className="space-y-4">
            <Textarea
              placeholder="Where are you? What have you been up to? What might fans ask about? e.g. 'In Bali until Sunday, went snorkeling yesterday, just dropped a beach photo set'"
              value={persona.weekly_context}
              onChange={e => update('weekly_context', e.target.value)}
              rows={3}
            />
            {unlockables.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">Pin content to promote this week (max 5)</Label>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {unlockables.map(u => {
                    const selected = selectedContentIds.includes(u.id);
                    const disabled = !selected && selectedContentIds.length >= 5;
                    return (
                      <label
                        key={u.id}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${selected ? 'bg-primary/10' : 'hover:bg-muted/50'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={disabled}
                          onChange={() => !disabled && toggleContent(u)}
                          className="h-4 w-4 rounded border-border accent-primary"
                        />
                        <span className="text-sm flex-1 truncate">{u.title}</span>
                        <span className="text-xs text-muted-foreground">${Number(u.price).toFixed(2)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Master toggle */}
        <Card className="p-4 border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">AI Auto-Reply</p>
                <p className="text-xs text-muted-foreground">
                  {persona.is_enabled
                    ? 'AI is replying to fans on your behalf using the persona below.'
                    : 'Off — fans who message you will get no reply until you respond manually. Turn on so fans always get a timely response.'}
                </p>
              </div>
            </div>
            <Switch checked={persona.is_enabled} onCheckedChange={v => update('is_enabled', v)} />
          </div>
          {persona.is_enabled && (
            <div className="mt-4 pt-4 border-t space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Mode</Label>
                  <Select value={persona.mode} onValueChange={v => update('mode', v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft (you review first)</SelectItem>
                      <SelectItem value="auto">Auto-send</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {persona.mode === 'draft' ? 'AI writes, you approve before sending' : 'AI sends automatically after the delay'}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Reply delay (minutes)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="60"
                    value={persona.auto_reply_delay_minutes}
                    onChange={e => update('auto_reply_delay_minutes', parseInt(e.target.value) || 0)}
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">Wait before replying (feels more natural)</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Personality section */}
        <Card className="p-4 border-border">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Your Personality</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Overall tone</Label>
              <Select value={persona.tone} onValueChange={v => update('tone', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flirty">💋 Flirty & teasing</SelectItem>
                  <SelectItem value="friendly">😊 Friendly & approachable</SelectItem>
                  <SelectItem value="playful">🎉 Fun & playful</SelectItem>
                  <SelectItem value="warm">🤗 Warm & caring</SelectItem>
                  <SelectItem value="professional">✨ Professional & polished</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Your content type</Label>
              <Input
                placeholder="e.g. fitness, lifestyle, gaming, art, cosplay..."
                value={persona.content_type}
                onChange={e => update('content_type', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">How do you write? Describe your texting style</Label>
              <Textarea
                placeholder="e.g. I keep things casual, use lowercase, rarely use punctuation, like to ask questions back..."
                value={persona.communication_style}
                onChange={e => update('communication_style', e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Phrases or words you use often</Label>
              <Textarea
                placeholder="e.g. 'omg', 'honestly', 'lol', 'bestie', 'babe'..."
                value={persona.common_phrases}
                onChange={e => update('common_phrases', e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Topics you love talking about</Label>
              <Textarea
                placeholder="e.g. my workouts, my cat, travel, behind the scenes of my content..."
                value={persona.favorite_topics}
                onChange={e => update('favorite_topics', e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Topics to NEVER bring up</Label>
              <Textarea
                placeholder="e.g. politics, my personal relationships, my location..."
                value={persona.forbidden_topics}
                onChange={e => update('forbidden_topics', e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">How do you usually start a conversation or greet new fans?</Label>
              <Textarea
                placeholder="e.g. 'Hey [name]! So happy you're here 🥰' or 'omg hi!! finally you showed up lol'"
                value={persona.greeting_style}
                onChange={e => update('greeting_style', e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">What do you say when fans ask for free content?</Label>
              <Textarea
                placeholder="e.g. 'haha I wish! but all my exclusives are in my vault, they're worth it I promise 😋'"
                value={persona.free_content_response}
                onChange={e => update('free_content_response', e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </Card>

        {/* Upsell settings */}
        <Card className="p-4 border-border">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Revenue Settings</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">How actively should the AI mention your content?</Label>
              <Select value={persona.upsell_aggressiveness} onValueChange={v => update('upsell_aggressiveness', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">🤫 Light — only when it fits naturally</SelectItem>
                  <SelectItem value="moderate">💬 Moderate — occasionally suggests content</SelectItem>
                  <SelectItem value="active">🚀 Active — actively sells in every conversation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Any other instructions for the AI?</Label>
              <Textarea
                placeholder="e.g. Always mention my new bundle if a fan seems interested. Never discuss competitor platforms."
                value={persona.custom_instructions}
                onChange={e => update('custom_instructions', e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </Card>

        {/* Proactive outreach */}
        <Card className="p-4 border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Daily Outreach</h2>
            </div>
            <Switch
              checked={persona.proactive_outreach_enabled}
              onCheckedChange={v => update('proactive_outreach_enabled', v)}
            />
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Automatically message fans who've gone quiet — re-engage them in your voice before they forget about you.
          </p>
          {persona.proactive_outreach_enabled && (
            <div className="space-y-1.5">
              <Label className="text-xs">Reach out after how many days of silence?</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={persona.proactive_outreach_delay_days}
                  onChange={e => update('proactive_outreach_delay_days', parseInt(e.target.value) || 3)}
                  className="w-24 h-9"
                />
                <span className="text-sm text-muted-foreground">days without a message</span>
              </div>
            </div>
          )}
        </Card>

        {/* Fan Memory */}
        <Card className="p-4 border-border">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Fan Memory</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Your AI automatically remembers personal details fans share — interests, life events, and more — so every conversation feels personal.
          </p>
          <p className="text-sm font-medium">
            Currently remembering details for <span className="text-primary">{fanMemoryCount}</span> {fanMemoryCount === 1 ? 'fan' : 'fans'}
          </p>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
          {saving ? 'Saving...' : 'Save AI Settings'}
        </Button>
      </div>
    </div>
  );
};

export default AIPersonaSettings;
