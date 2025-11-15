import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <Card className="p-8">
        <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground">
              This Privacy Policy describes how we collect, use, and protect your personal information when you use our platform. 
              By using our services, you agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">2. Information We Collect</h2>
            <div className="space-y-3 text-muted-foreground">
              <p><strong>Account Information:</strong> Email address, username, display name, profile picture, and bio.</p>
              <p><strong>Payment Information:</strong> Payment transaction details (processed securely through Stripe).</p>
              <p><strong>Content:</strong> Messages, media uploads, and other content you create on the platform.</p>
              <p><strong>Usage Data:</strong> IP address, browser type, device information, and activity logs.</p>
              <p><strong>Cookies:</strong> We use cookies to maintain sessions and improve your experience.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>To provide and maintain our services</li>
              <li>To process payments and transactions</li>
              <li>To send notifications about your account and transactions</li>
              <li>To improve and personalize your experience</li>
              <li>To detect and prevent fraud and abuse</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">4. Data Sharing</h2>
            <p className="text-muted-foreground mb-3">We do not sell your personal information. We may share your data with:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong>Service Providers:</strong> Stripe (payments), Resend (emails), cloud storage providers</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In the event of a merger or acquisition</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">5. Data Security</h2>
            <p className="text-muted-foreground">
              We implement industry-standard security measures including encryption, secure servers, and access controls. 
              However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">6. Your Rights (GDPR/CCPA)</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate data</li>
              <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
              <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing emails</li>
            </ul>
            <p className="mt-3 text-muted-foreground">
              To exercise these rights, visit your Account Settings or contact support.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">7. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your data for as long as your account is active or as needed to provide services. 
              After account deletion, we may retain certain data for legal and security purposes for up to 90 days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">8. Children's Privacy</h2>
            <p className="text-muted-foreground">
              Our platform is not intended for users under 18 years of age. We require age verification and 
              do not knowingly collect information from minors.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">9. International Data Transfers</h2>
            <p className="text-muted-foreground">
              Your data may be transferred to and processed in countries other than your own. 
              We ensure appropriate safeguards are in place for such transfers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">10. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of significant changes 
              via email or through the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">11. Contact Us</h2>
            <p className="text-muted-foreground">
              For privacy-related questions or to exercise your rights, contact us at: privacy@yourdomain.com
            </p>
          </section>
        </div>
      </Card>
    </div>
  );
};

export default PrivacyPolicy;
