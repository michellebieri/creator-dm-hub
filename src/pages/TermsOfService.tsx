import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <Card className="p-8">
        <h1 className="text-4xl font-bold mb-6">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using our platform, you agree to be bound by these Terms of Service and our Privacy Policy. 
              If you do not agree, do not use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">2. Eligibility</h2>
            <p className="text-muted-foreground">
              You must be at least 18 years old to use this platform. By using the service, you represent and warrant 
              that you meet this age requirement and will comply with age verification procedures.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">3. Account Registration</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>You must provide accurate and complete information</li>
              <li>You are responsible for maintaining the security of your account</li>
              <li>You must not share your account credentials</li>
              <li>You must notify us immediately of any unauthorized access</li>
              <li>One person may not maintain multiple accounts</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">4. Creator Accounts</h2>
            <p className="text-muted-foreground mb-3">Creators agree to:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Comply with all applicable laws and regulations</li>
              <li>Not post illegal, harmful, or offensive content</li>
              <li>Own or have rights to all content uploaded</li>
              <li>Verify their identity as required</li>
              <li>Maintain accurate payment information</li>
              <li>Accept a 15% platform fee on all transactions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">5. Prohibited Content</h2>
            <p className="text-muted-foreground mb-3">You may not post content that:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Depicts minors or appears to depict minors</li>
              <li>Violates intellectual property rights</li>
              <li>Promotes violence, hate speech, or harassment</li>
              <li>Contains malware or harmful code</li>
              <li>Violates privacy or publicity rights</li>
              <li>Involves illegal activities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">6. Payment Terms</h2>
            <div className="space-y-3 text-muted-foreground">
              <p><strong>Customers:</strong> All payments are final. Credits are non-refundable except as required by law.</p>
              <p><strong>Creators:</strong> Earnings are subject to a 15% platform fee and Stripe processing fees. 
              Payouts are processed according to your payout schedule.</p>
              <p><strong>Chargebacks:</strong> Fraudulent chargebacks may result in account suspension.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">7. Intellectual Property</h2>
            <p className="text-muted-foreground">
              You retain ownership of content you upload. By posting content, you grant us a worldwide, non-exclusive license 
              to host, display, and distribute your content as necessary to provide the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">8. DMCA & Copyright</h2>
            <p className="text-muted-foreground">
              We respect intellectual property rights. If you believe content infringes your copyright, 
              submit a DMCA notice to: dmca@yourdomain.com. Repeat infringers will have their accounts terminated.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">9. Account Termination</h2>
            <p className="text-muted-foreground mb-3">We may suspend or terminate your account if you:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Violate these Terms of Service</li>
              <li>Post prohibited content</li>
              <li>Engage in fraudulent activity</li>
              <li>Harass other users</li>
              <li>Fail to verify your identity when required</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">10. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE ARE NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, 
              CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE PLATFORM.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">11. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground">
              THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. 
              We do not guarantee uninterrupted or error-free service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">12. Indemnification</h2>
            <p className="text-muted-foreground">
              You agree to indemnify and hold us harmless from any claims arising from your use of the platform, 
              your content, or your violation of these terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">13. Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms are governed by the laws of [Your Jurisdiction]. Any disputes will be resolved in the courts of [Your Jurisdiction].
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">14. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We may modify these Terms at any time. Continued use of the platform after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">15. Contact</h2>
            <p className="text-muted-foreground">
              For questions about these Terms, contact us at: legal@yourdomain.com
            </p>
          </section>
        </div>
      </Card>
    </div>
  );
};

export default TermsOfService;
