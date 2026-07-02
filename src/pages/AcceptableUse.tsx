import { LegalPageLayout } from '@/components/LegalPageLayout';

const AcceptableUse = () => {
  return (
    <LegalPageLayout title="Acceptable Use Policy">
      <p className="text-muted-foreground">This Acceptable Use Policy ("AUP") defines what content and behaviour is permitted on DM.me. All users — Creators and Fans — must comply with this policy. Violations may result in content removal, account suspension, or permanent termination.</p>

      <section>
        <h2 className="text-xl font-semibold mb-3">1. Content Standards — What Is Allowed</h2>
        <p className="text-muted-foreground mb-3">DM.me operates a <strong>"suggestive but not explicit"</strong> content standard. The following is permitted:</p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Swimwear, lingerie, and similar attire where no intimate body parts are visible;</li>
          <li>Flirtatious, romantic, or suggestive conversation and text;</li>
          <li>Non-explicit sexual language and innuendo in written messages;</li>
          <li>LGBTQ+ content and expression of any sexual orientation or gender identity;</li>
          <li>Adult themes and mature conversations between consenting adults;</li>
          <li>Roleplay and fantasy content that does not depict prohibited acts;</li>
          <li>Fitness, lifestyle, and personal content of any kind consistent with this policy.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">2. Prohibited Content — What Is Not Allowed</h2>
        <p className="text-muted-foreground mb-4">The following content is strictly prohibited and will result in immediate account termination:</p>

        <div className="space-y-5">
          <div>
            <h3 className="font-semibold text-foreground mb-2">2.1 Explicit Sexual Content</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Depictions of genitalia, whether real or illustrated;</li>
              <li>Depictions or descriptions of sexual acts;</li>
              <li>Content that is explicitly pornographic in nature.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-2">2.2 Child Safety</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Any content involving, depicting, or appearing to depict individuals under 18 years of age in a sexual or suggestive context;</li>
              <li>Any grooming behaviour or communication directed at or about minors;</li>
              <li>We report all child sexual abuse material (CSAM) to relevant authorities immediately.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-2">2.3 Violence and Harm</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Content depicting graphic violence, gore, or acts of self-harm;</li>
              <li>Threats of violence or harm against any person;</li>
              <li>Incitement to violence or terrorism.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-2">2.4 Harassment and Abuse</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Targeted harassment, bullying, or intimidation of other users;</li>
              <li>Hate speech based on race, ethnicity, religion, gender, sexual orientation, disability, or national origin;</li>
              <li>Doxxing or sharing private personal information of another person without consent.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-2">2.5 Fraud and Deception</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Impersonating another person, celebrity, or public figure;</li>
              <li>Misrepresenting the nature of content offered;</li>
              <li>Fraudulent payment activity or chargeback abuse.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-2">2.6 Illegal Content</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Content that violates applicable law in any jurisdiction;</li>
              <li>Content infringing third-party intellectual property rights;</li>
              <li>Distribution of malware, spyware, or harmful code.</li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">3. Creator Responsibilities</h2>
        <p className="text-muted-foreground mb-3">Creators are responsible for:</p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>All content they upload or that their AI persona generates;</li>
          <li>Ensuring their AI persona is configured to comply with this AUP;</li>
          <li>Reporting content or fan behaviour that violates this policy to <a href="mailto:support@dm-me.io" className="text-primary hover:underline">support@dm-me.io</a>;</li>
          <li>Maintaining accurate and honest representations about themselves.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">4. Reporting Violations</h2>
        <p className="text-muted-foreground">To report content that violates this policy, contact us at <a href="mailto:support@dm-me.io" className="text-primary hover:underline">support@dm-me.io</a>. We aim to review reports within 24 hours and take action within 72 hours for serious violations.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">5. Enforcement</h2>
        <p className="text-muted-foreground mb-3">Depending on the severity of the violation, we may:</p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Issue a warning;</li>
          <li>Remove the offending content;</li>
          <li>Temporarily suspend the account;</li>
          <li>Permanently terminate the account;</li>
          <li>Report the content and/or user to relevant law enforcement or regulatory authorities.</li>
        </ul>
      </section>
    </LegalPageLayout>
  );
};

export default AcceptableUse;
