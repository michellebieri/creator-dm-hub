import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Shield, CheckCircle, AlertTriangle, Smartphone } from 'lucide-react';

export default function TwoFactorAuth() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [enabling, setEnabling] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkMfaStatus();
  }, [user, navigate]);

  const checkMfaStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      if (error) throw error;
      
      setMfaEnabled(data?.currentLevel === 'aal2');
    } catch (error) {
      console.error('Error checking MFA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableMfa = async () => {
    setEnabling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });

      if (error) throw error;

      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setShowSetup(true);
      toast.success('Scan the QR code with your authenticator app');
    } catch (error: any) {
      console.error('Error enabling MFA:', error);
      toast.error(error.message || 'Failed to enable 2FA');
    } finally {
      setEnabling(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setVerifying(true);
    try {
      const factors = await supabase.auth.mfa.listFactors();
      
      if (factors.error) throw factors.error;
      
      const totpFactor = factors.data?.totp?.[0];
      
      if (!totpFactor) {
        throw new Error('No TOTP factor found');
      }

      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: totpFactor.id,
        code: verificationCode,
      });

      if (error) throw error;

      toast.success('Two-factor authentication enabled');
      setShowSetup(false);
      setMfaEnabled(true);
      setVerificationCode('');
    } catch (error: any) {
      console.error('Error verifying code:', error);
      toast.error(error.message || 'Invalid verification code');
    } finally {
      setVerifying(false);
    }
  };

  const handleDisableMfa = async () => {
    setDisabling(true);
    try {
      const factors = await supabase.auth.mfa.listFactors();
      
      if (factors.error) throw factors.error;
      
      const totpFactor = factors.data?.totp?.[0];
      
      if (totpFactor) {
        const { error } = await supabase.auth.mfa.unenroll({
          factorId: totpFactor.id,
        });

        if (error) throw error;
      }

      toast.success('Two-factor authentication disabled');
      setMfaEnabled(false);
    } catch (error: any) {
      console.error('Error disabling MFA:', error);
      toast.error(error.message || 'Failed to disable 2FA');
    } finally {
      setDisabling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Two-Factor Authentication</h1>
        <p className="text-muted-foreground">
          Add an extra layer of security to your account
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <CardTitle>2FA Status</CardTitle>
                <CardDescription>
                  Protect your account with time-based one-time passwords
                </CardDescription>
              </div>
            </div>
            <Badge variant={mfaEnabled ? 'default' : 'secondary'}>
              {mfaEnabled ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Enabled
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Disabled
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!mfaEnabled && !showSetup && (
            <>
              <Alert>
                <Smartphone className="h-4 w-4" />
                <AlertDescription>
                  You'll need an authenticator app like Google Authenticator, Authy, or 1Password to use 2FA.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h3 className="font-semibold">Why enable 2FA?</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-success" />
                    <span>Adds an extra layer of security to your account</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-success" />
                    <span>Protects against unauthorized access even if your password is compromised</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-success" />
                    <span>Required for accessing sensitive account features</span>
                  </li>
                </ul>
              </div>

              <Button onClick={handleEnableMfa} disabled={enabling} className="w-full">
                {enabling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  'Enable Two-Factor Authentication'
                )}
              </Button>
            </>
          )}

          {showSetup && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Step 1: Scan QR Code</h3>
                <p className="text-sm text-muted-foreground">
                  Open your authenticator app and scan this QR code:
                </p>
                {qrCode && (
                  <div className="flex justify-center p-4 bg-white rounded-lg">
                    <img src={qrCode} alt="2FA QR Code" className="w-64 h-64" />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Or enter this secret key manually:</Label>
                  <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all">
                    {secret}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Step 2: Verify Code</h3>
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code from your authenticator app:
                </p>
                <div className="space-y-2">
                  <Input
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSetup(false);
                    setVerificationCode('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleVerifyAndEnable}
                  disabled={verifying || verificationCode.length !== 6}
                  className="flex-1"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Enable'
                  )}
                </Button>
              </div>
            </div>
          )}

          {mfaEnabled && (
            <>
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Two-factor authentication is currently enabled for your account.
                </AlertDescription>
              </Alert>

              <Button
                variant="destructive"
                onClick={handleDisableMfa}
                disabled={disabling}
                className="w-full"
              >
                {disabling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Disabling...
                  </>
                ) : (
                  'Disable Two-Factor Authentication'
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
