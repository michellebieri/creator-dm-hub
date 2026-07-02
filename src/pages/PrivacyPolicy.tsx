import { LegalPageLayout } from '@/components/LegalPageLayout';

const PrivacyPolicy = () => {
  return (
    <LegalPageLayout title="Privacy Policy">
      <p className="text-muted-foreground">Data Controller: <strong>Nextchapter AI For Online Selling</strong> | Trade License No. 1610274<br />Registered Address: Future Tower, Business Bay, Dubai, United Arab Emirates</p>

      <section>
        <h2 className="text-xl font-semibold mb-3">1. Who We Are</h2>
        <p className="text-muted-foreground">DM.me is operated by Nextchapter AI For Online Selling, a Commercial Sole Proprietorship Establishment registered in Dubai, UAE (Trade License No. 1610274). We are the data controller for personal information collected through www.dm-me.io. Contact us at <a href="mailto:privacy@dm-me.io" className="text-primary hover:underline">privacy@dm-me.io</a> for any privacy-related matter.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
        <div className="space-y-4 text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Account Information</p>
            <p>Email address, display name, username, profile photo, biography, and date of birth (for age verification).</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Payment Information</p>
            <p>We do not store card numbers. Payment transactions are processed by Stripe, Inc. We receive transaction metadata (amount, currency, transaction ID, payout status).</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Identity Verification</p>
            <p>Government-issued ID or other verification documents submitted during Creator onboarding, processed to verify age and identity compliance.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Communications and Content</p>
            <p>Messages you send or receive through the Platform, content you upload, and your AI persona configuration.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">AI Processing</p>
            <p>Message content on the Platform is processed by our AI system (powered by Anthropic's Claude AI model) to generate automated responses on behalf of Creators. Message content may be transmitted to Anthropic's API for response generation. No message content is used to train AI models without your explicit consent.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Usage Data</p>
            <p>IP address, browser type, device identifiers, pages visited, session duration, and interaction logs.</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Create and manage your account;</li>
          <li>Process payments and credits;</li>
          <li>Deliver and improve the Platform services;</li>
          <li>Generate AI-assisted responses on behalf of Creators;</li>
          <li>Send transactional notifications (payment receipts, account alerts);</li>
          <li>Detect and prevent fraud, abuse, and policy violations;</li>
          <li>Comply with legal obligations;</li>
          <li>Respond to your enquiries and support requests.</li>
        </ul>
        <p className="text-muted-foreground mt-3">We do not sell your personal information to third parties. We do not use your data for targeted advertising.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">4. Legal Basis for Processing (GDPR)</h2>
        <p className="text-muted-foreground mb-3">Where EU/EEA data protection law applies, we process your data on the following legal bases:</p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li><strong>Contract:</strong> Processing necessary to deliver the services you have requested.</li>
          <li><strong>Legitimate Interests:</strong> Fraud prevention, security, service improvement, and analytics.</li>
          <li><strong>Legal Obligation:</strong> Compliance with applicable laws and regulations.</li>
          <li><strong>Consent:</strong> For marketing communications and non-essential cookies (where applicable).</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">5. Data Sharing</h2>
        <p className="text-muted-foreground mb-3">We share your data only with:</p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li><strong>Stripe, Inc.</strong> — payment processing.</li>
          <li><strong>Anthropic, PBC</strong> — AI message generation. Message content is transmitted to Anthropic's API.</li>
          <li><strong>Supabase, Inc.</strong> — database and authentication infrastructure.</li>
          <li><strong>Vercel, Inc.</strong> — hosting provider.</li>
          <li><strong>Law enforcement or regulatory authorities</strong> — where required by law or to protect rights and safety.</li>
        </ul>
        <p className="text-muted-foreground mt-3">We do not share data with data brokers, advertisers, or any third party for commercial purposes beyond the above.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">6. International Data Transfers</h2>
        <p className="text-muted-foreground">The Platform is operated from the UAE. Your data may be transferred to and processed in countries outside your own, including the United States (Stripe, Anthropic, Supabase, Vercel) and the UAE. For transfers from the EU/EEA, we rely on Standard Contractual Clauses or other appropriate safeguards as required by applicable law.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">7. Data Retention</h2>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Account and profile data: deleted within 30 days of account closure, except where retention is required by law.</li>
          <li>Financial records: retained for 5 years as required by UAE commercial regulations.</li>
          <li>Message content: deleted within 30 days of account closure.</li>
          <li>Identity verification documents: retained for up to 12 months after account closure.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">8. Your Rights</h2>
        <p className="text-muted-foreground mb-3">Depending on your location, you may have the following rights regarding your personal data:</p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li><strong>Access</strong> — request a copy of the data we hold about you.</li>
          <li><strong>Rectification</strong> — correct inaccurate or incomplete data.</li>
          <li><strong>Erasure</strong> — request deletion of your data, subject to legal retention requirements.</li>
          <li><strong>Portability</strong> — receive your data in a machine-readable format.</li>
          <li><strong>Objection</strong> — object to processing based on legitimate interests.</li>
          <li><strong>Restriction</strong> — request restriction of processing in certain circumstances.</li>
          <li><strong>Withdraw Consent</strong> — where processing is based on consent, withdraw it at any time.</li>
        </ul>
        <p className="text-muted-foreground mt-3">To exercise any right, contact us at <a href="mailto:privacy@dm-me.io" className="text-primary hover:underline">privacy@dm-me.io</a>. We will respond within 30 days.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">9. Children's Privacy</h2>
        <p className="text-muted-foreground">The Platform is strictly for users aged 18 and over. We do not knowingly collect personal information from anyone under 18. If we discover that a minor has created an account, we will immediately delete their data and close their account.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">10. Security</h2>
        <p className="text-muted-foreground">We implement appropriate technical and organisational measures to protect your personal data, including encryption in transit (TLS), encrypted storage, access controls, and regular security reviews. If you discover a security vulnerability, please contact us at <a href="mailto:legal@dm-me.io" className="text-primary hover:underline">legal@dm-me.io</a>.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">11. Changes to This Policy</h2>
        <p className="text-muted-foreground">We may update this Privacy Policy from time to time. We will notify you of significant changes via email or a prominent notice on the Platform.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">12. Contact</h2>
        <p className="text-muted-foreground">For privacy enquiries or to exercise your rights: <a href="mailto:privacy@dm-me.io" className="text-primary hover:underline">privacy@dm-me.io</a></p>
      </section>
    </LegalPageLayout>
  );
};

export default PrivacyPolicy;
