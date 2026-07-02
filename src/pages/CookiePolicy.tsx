import { LegalPageLayout } from '@/components/LegalPageLayout';

const CookiePolicy = () => {
  return (
    <LegalPageLayout title="Cookie Policy">
      <section>
        <h2 className="text-xl font-semibold mb-3">1. What Are Cookies</h2>
        <p className="text-muted-foreground">Cookies are small text files stored on your device when you visit a website. They help us recognise your browser, remember your preferences, and improve your experience on DM.me.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">2. Cookies We Use</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-foreground mb-1">Essential Cookies (Always Active)</h3>
            <p className="text-muted-foreground mb-2">These are required for the Platform to function and cannot be disabled.</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong>Session cookies:</strong> Maintain your login state while you browse the Platform.</li>
              <li><strong>Security cookies:</strong> Prevent cross-site request forgery (CSRF) and protect account security.</li>
              <li><strong>Authentication cookies:</strong> Issued by Supabase Auth to keep you signed in.</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-1">Functional Cookies</h3>
            <p className="text-muted-foreground mb-2">These remember your preferences to improve your experience.</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Language and display preferences.</li>
              <li>Notification settings.</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-1">Analytics Cookies</h3>
            <p className="text-muted-foreground">We may use analytics cookies to understand how users interact with the Platform (e.g., pages visited, session duration). This data is aggregated and anonymised. We do not use third-party advertising cookies.</p>
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-1">Payment Cookies</h3>
            <p className="text-muted-foreground">Stripe.js uses cookies and local storage to facilitate secure payment processing. These are essential for the wallet top-up and payment flow to function.</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">3. Third-Party Cookies</h2>
        <p className="text-muted-foreground mb-3">The following third parties may set cookies in connection with their services on our Platform:</p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li><strong>Stripe</strong> — payment processing cookies. See <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">stripe.com/privacy</a>.</li>
          <li><strong>Supabase</strong> — authentication infrastructure.</li>
        </ul>
        <p className="text-muted-foreground mt-3">We do not permit third-party advertising or tracking cookies.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">4. Your Choices</h2>
        <p className="text-muted-foreground">You can control cookies through your browser settings. Disabling essential cookies will prevent the Platform from functioning correctly — you will not be able to log in or make payments. You can also clear cookies at any time via your browser settings.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">5. Changes to This Policy</h2>
        <p className="text-muted-foreground">We may update this Cookie Policy as our use of cookies changes. The date at the top reflects the latest version.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">6. Contact</h2>
        <p className="text-muted-foreground">For cookie-related enquiries: <a href="mailto:privacy@dm-me.io" className="text-primary hover:underline">privacy@dm-me.io</a></p>
      </section>
    </LegalPageLayout>
  );
};

export default CookiePolicy;
