import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Check, User, DollarSign, Package } from 'lucide-react';
import { toast } from 'sonner';

const CreatorOnboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [pricePerMessage, setPricePerMessage] = useState('5');
  const [packQuantity, setPackQuantity] = useState('10');
  const [packPrice, setPackPrice] = useState('45');
  const [packDiscount, setPackDiscount] = useState('10');

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step === 1 && !displayName.trim()) {
      toast.error('Please enter your display name');
      return;
    }
    if (step === 2 && (!pricePerMessage || Number(pricePerMessage) <= 0)) {
      toast.error('Please set a valid price per message');
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleComplete = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          bio: bio || null,
          role: 'creator',
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Create or update creator settings
      const { error: settingsError } = await supabase
        .from('creator_settings')
        .upsert({
          user_id: user.id,
          price_per_message: Number(pricePerMessage),
          is_accepting_messages: true,
        });

      if (settingsError) throw settingsError;

      // Create first message pack
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

      toast.success('Welcome to the creator community!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Onboarding error:', error);
      toast.error('Failed to complete setup');
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
              Let's get your creator profile set up in {totalSteps} quick steps
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
                        <span className="text-muted-foreground">Platform fee (15%):</span>
                        <span className="text-destructive">
                          -${(Number(pricePerMessage || 0) * 0.15).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="font-medium">You earn:</span>
                        <span className="font-bold text-primary">
                          ${(Number(pricePerMessage || 0) * 0.85).toFixed(2)}
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
                  <p className="text-xs text-muted-foreground">
                    Suggested: ${(Number(packQuantity) * Number(pricePerMessage) * (1 - Number(packDiscount) / 100)).toFixed(2)}
                  </p>
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
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreatorOnboarding;
