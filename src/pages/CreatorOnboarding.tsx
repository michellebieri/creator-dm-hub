import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Check, User, DollarSign, Package, Wallet, ExternalLink, Bot } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const STORAGE_KEY = 'creator_onboarding_state';

const CreatorOnboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [pricePerMessage, setPricePerMessage] = useState('5');
  const [packQuantity, setPackQuantity] = useState('10');
  const [packPrice, setPackPrice] = useState('45');
  const [packDiscount, setPackDiscount] = useState('10');

  const [stripeConnecting, setStripeConnecting] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);

  // Step 5: AI persona
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiTone, setAiTone] = useState('friendly');
  const [aiMode, setAiMode] = useState('auto');
  const [aiDelay, setAiDelay] = useState('2');

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  // Pre-fill displayName: seed from auth metadata immediately (synchronous),
  // then confirm/override from profiles table (async). The metadata seed
  // ensures the field is non-empty on first paint even before the DB
  // round-trip completes.
  useEffect(() => {
    if (!user) return;

    // Immediate seed from auth user_metadata (set at signup)
    const metaName = (user.user_metadata?.display_name as string | undefined) ?? '';
    if (metaName) setDisplayName(metaName);

    // Confirm with DB value (may differ if updated since signup)
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name);
      });
  }, [user]);

  // Restore state if returning from Stripe Connect redirect
  useEffect(() => {
    const stripeReturn = searchParams.get('stripe_connected');
    if (stripeReturn === 'true') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const s = JSON.parse(saved);
          setDisplayName(s.displayName || '');
          setBio(s.bio || '');
          setPricePerMessage(s.pricePerMessage || '5');
          setPackQuantity(s.packQuantity || '10');
          setPackPrice(s.packPrice || '45');
          setPackDiscount(s.packDiscount || '10');
          localStorage.removeItem(STORAGE_KEY);
        } catch (_) { /* ignore */ }
      }
      setStripeConnected(true);
      setStep(4);
      toast.success('Stripe connected! Complete your setup below.');
    }
  }, []);

  const handleNext = () => {
    if (step === 1 && !displayName.trim()) {
      toast.error('Please enter your display name');
      return;
    }
    if (step === 2 && (!pricePerMessage || Number(pricePerMessage) <= 0)) {
      toast.error('Please set a valid price per message');
      return;
    }
    if (step === 3) {
      const maxPackPrice = Number(packQuantity) * Number(pricePerMessage);
      if (Number(packPrice) > maxPackPrice) {
        toast.error(`Pack price can't exceed $${maxPackPrice.toFixed(2)} (${packQuantity} messages × $${Number(pricePerMessage).toFixed(2)})`);
        return;
      }
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleConnectStripe = async () => {
    // Save all form state before leaving the page — Stripe redirect loses React state
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      displayName, bio, pricePerMessage, packQuantity, packPrice, packDiscount,
    }));

    try {
      setStripeConnecting(true);
      const { data, error } = await supabase.functions.invoke('stripe-connect-onboarding', {
        body: { returnTo: 'onboarding' },
      });
      if (error) throw error;
      if (data.status === 'active') {
        setStripeConnected(true);
        toast.success('Stripe already connected!');
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error('Failed to connect Stripe: ' + err.message);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setStripeConnecting(false);
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Update profile (display_name, bio only — role is granted by admin via
      // handleApprove writing to user_roles; profiles.role is a legacy column
      // not used for any auth decisions and is column-revoked from authenticated).
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          bio: bio || null,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Create or update creator settings (upsert preserves stripe_account_id if already set)
      const { error: settingsError } = await supabase
        .from('creator_settings')
        .upsert({
          user_id: user.id,
          price_per_message: Number(pricePerMessage),
          is_accepting_messages: true,
        }, { onConflict: 'user_id' });

      if (settingsError) throw settingsError;

      // Create first message pack (skip if already exists to avoid duplicates on re-entry)
      const { data: existingPack } = await supabase
        .from('message_packs')
        .select('id')
        .eq('creator_id', user.id)
        .maybeSingle();

      if (!existingPack) {
        const { error: packError } = await supabase
          .from('message_packs')
          .insert({
            creator_id: user.id,
            quantity: Number(packQuantity),
            price: Number(packPrice),
            discount_percentage: Number(packDiscount),
            is_active: true,
          });

        if (packError) throw packError;
      }

      // AI persona (upsert — row auto-created on approval; this updates tone/mode/delay)
      const { error: personaError } = await supabase
        .from('creator_ai_personas')
        .upsert({
          creator_id: user.id,
          is_enabled: aiEnabled,
          mode: aiMode,
          tone: aiTone,
          auto_reply_delay_minutes: Number(aiDelay) || 2,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'creator_id' });

      if (personaError) {
        // Non-fatal: AI can be configured later from Settings
        console.warn('AI persona setup skipped:', personaError.message);
      }

      toast.success('Welcome to the creator community!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Onboarding error:', error);
      toast.error('Failed to complete setup: ' + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-4">
          <div className="space-y-2">
            <CardTitle className="text-2xl">Creator Setup</CardTitle>
            <CardDescription>
              Let's get your creator profile set up in {totalSteps} quick steps (step 5 is optional)
            </CardDescription>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Step {step} of {totalSteps}</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Profile */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Profile Information</h3>
                  <p className="text-sm text-muted-foreground">Tell your fans about yourself</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name *</Label>
                  <Input
                    id="displayName"
                    placeholder="Your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio (Optional)</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell your fans what makes you special..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be displayed on your creator profile
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Pricing */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Message Pricing</h3>
                  <p className="text-sm text-muted-foreground">Set how much you charge per message</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pricePerMessage">Price per Message ($) *</Label>
                  <Input
                    id="pricePerMessage"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="5.00"
                    value={pricePerMessage}
                    onChange={(e) => setPricePerMessage(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    This is what customers pay to send you each message
                  </p>
                </div>

                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Customer pays:</span>
                        <span className="font-medium">${Number(pricePerMessage || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Platform fee (25%):</span>
                        <span className="text-destructive">
                          -${(Number(pricePerMessage || 0) * 0.25).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="font-medium">You earn:</span>
                        <span className="font-bold text-primary">
                          ${(Number(pricePerMessage || 0) * 0.75).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Step 3: Message Pack */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Create Your First Message Pack</h3>
                  <p className="text-sm text-muted-foreground">Offer bulk pricing to encourage purchases</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="packQuantity">Number of Messages *</Label>
                    <Input
                      id="packQuantity"
                      type="number"
                      min="1"
                      placeholder="10"
                      value={packQuantity}
                      onChange={(e) => setPackQuantity(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="packDiscount">Discount (%) *</Label>
                    <Input
                      id="packDiscount"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="10"
                      value={packDiscount}
                      onChange={(e) => setPackDiscount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="packPrice">Pack Price ($) *</Label>
                  <Input
                    id="packPrice"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="45.00"
                    value={packPrice}
                    onChange={(e) => setPackPrice(e.target.value)}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Suggested: ${(Number(packQuantity) * Number(pricePerMessage) * (1 - Number(packDiscount) / 100)).toFixed(2)}
                    </p>
                    <button
                      type="button"
                      className="text-xs text-primary underline"
                      onClick={() => setPackPrice((Number(packQuantity) * Number(pricePerMessage) * (1 - Number(packDiscount) / 100)).toFixed(2))}
                    >
                      Use suggested
                    </button>
                  </div>
                </div>

                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Messages in pack:</span>
                        <span className="font-medium">{packQuantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Regular price:</span>
                        <span className="line-through">
                          ${(Number(packQuantity) * Number(pricePerMessage)).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Discount:</span>
                        <span className="text-primary">{packDiscount}%</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="font-medium">Pack price:</span>
                        <span className="font-bold text-primary">${Number(packPrice).toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Step 5: AI Assistant Setup (optional) — rendered after step 4 in DOM order */}
          {step === 5 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">
                    AI Assistant Setup
                    <span className="text-xs text-muted-foreground font-normal ml-2">(optional)</span>
                  </h3>
                  <p className="text-sm text-muted-foreground">Let AI reply to fans while you're away</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border">
                <div>
                  <p className="font-medium">Enable AI auto-replies</p>
                  <p className="text-sm text-muted-foreground">AI replies to fans on your behalf</p>
                </div>
                <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
              </div>

              {aiEnabled && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tone</Label>
                    <Select value={aiTone} onValueChange={setAiTone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="friendly">Friendly — warm and approachable</SelectItem>
                        <SelectItem value="warm">Warm — caring and intimate</SelectItem>
                        <SelectItem value="playful">Playful — fun and energetic</SelectItem>
                        <SelectItem value="flirty">Flirty — playfully teasing</SelectItem>
                        <SelectItem value="professional">Professional — personable but polished</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Reply mode</Label>
                    <Select value={aiMode} onValueChange={setAiMode}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto-send — AI replies immediately</SelectItem>
                        <SelectItem value="draft">Draft for review — you approve before sending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="aiDelay">Reply delay (minutes)</Label>
                    <Input
                      id="aiDelay"
                      type="number"
                      min="0"
                      max="60"
                      value={aiDelay}
                      onChange={(e) => setAiDelay(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">How long to wait before AI replies (0 = instant)</p>
                  </div>

                  <Card className="bg-muted/50">
                    <CardContent className="pt-4 pb-4">
                      <p className="text-xs text-muted-foreground">
                        You can fine-tune your AI persona further — personality, selling approach, forbidden topics — from <strong>Settings → AI Assistant</strong> after setup.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Stripe Connect */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Connect Your Bank Account</h3>
                  <p className="text-sm text-muted-foreground">Required to receive payouts from your earnings</p>
                </div>
              </div>

              {stripeConnected ? (
                <div className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/30 rounded-xl">
                  <Check className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-primary">Stripe Connected!</p>
                    <p className="text-sm text-muted-foreground">You're ready to receive payouts.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-xl space-y-2 text-sm">
                    <p className="font-medium">Why connect Stripe?</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>✓ Receive 75% of every message payment</li>
                      <li>✓ Withdraw your earnings anytime</li>
                      <li>✓ Secure, trusted by millions of creators</li>
                    </ul>
                  </div>
                  <Button
                    onClick={handleConnectStripe}
                    disabled={stripeConnecting}
                    className="w-full"
                  >
                    {stripeConnecting ? (
                      'Connecting...'
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Connect Stripe Account
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    You can also connect later from your Revenue page.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={step === 1 ? () => navigate('/') : handleBack}
              disabled={loading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {step === 1 ? 'Cancel' : 'Back'}
            </Button>

            {step < totalSteps ? (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <div className="flex flex-col gap-2 items-end">
                <Button onClick={handleComplete} disabled={loading}>
                  {loading ? (
                    'Setting up...'
                  ) : (
                    <>
                      Complete Setup
                      <Check className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {aiEnabled ? 'AI will be turned on after setup' : 'AI can be configured any time from Settings'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreatorOnboarding;
