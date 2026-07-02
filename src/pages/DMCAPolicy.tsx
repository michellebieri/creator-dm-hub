import { LegalPageLayout } from '@/components/LegalPageLayout';

const DMCAPolicy = () => {
  return (
    <LegalPageLayout title="DMCA &amp; Copyright Policy">
      <p className="text-muted-foreground">DMCA Agent: <a href="mailto:dmca@dm-me.io" className="text-primary hover:underline">dmca@dm-me.io</a></p>

      <section>
        <h2 className="text-xl font-semibold mb-3">1. Our Commitment</h2>
        <p className="text-muted-foreground">DM.me respects intellectual property rights and expects all users to do the same. We comply with the Digital Millennium Copyright Act ("DMCA") and equivalent copyright laws in applicable jurisdictions.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">2. How to Submit a Copyright Takedown Notice</h2>
        <p className="text-muted-foreground mb-3">If you believe content on the Platform infringes your copyright, send a written notice to <a href="mailto:dmca@dm-me.io" className="text-primary hover:underline">dmca@dm-me.io</a> containing all of the following:</p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Your full name and contact information (address, phone number, email);</li>
          <li>Identification of the copyrighted work you claim has been infringed;</li>
          <li>The URL or specific location of the allegedly infringing content on the Platform;</li>
          <li>A statement that you have a good faith belief that use of the material is not authorised by the copyright owner, its agent, or the law;</li>
          <li>A statement, under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorised to act on their behalf;</li>
          <li>Your electronic or physical signature.</li>
        </ul>
        <p className="text-muted-foreground mt-3">Incomplete notices may not be acted upon.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">3. What Happens Next</h2>
        <p className="text-muted-foreground mb-3">Upon receipt of a valid notice, we will:</p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Promptly remove or disable access to the allegedly infringing content;</li>
          <li>Notify the user who posted the content;</li>
          <li>Log the notice as required by the DMCA.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">4. Counter-Notice</h2>
        <p className="text-muted-foreground mb-3">If you believe your content was removed in error, you may submit a counter-notice to <a href="mailto:dmca@dm-me.io" className="text-primary hover:underline">dmca@dm-me.io</a> containing:</p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Your full name and contact information;</li>
          <li>Identification of the content that was removed and its prior location;</li>
          <li>A statement under penalty of perjury that you have a good faith belief the content was removed as a result of mistake or misidentification;</li>
          <li>Your consent to the jurisdiction of the relevant federal district court or equivalent;</li>
          <li>Your electronic or physical signature.</li>
        </ul>
        <p className="text-muted-foreground mt-3">We will forward valid counter-notices to the original complainant. If no legal action is initiated within 10 business days, we may restore the content.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">5. Repeat Infringers</h2>
        <p className="text-muted-foreground">We operate a repeat infringer policy. Users who receive multiple valid DMCA takedowns will have their accounts terminated.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">6. Misuse of Takedown Notices</h2>
        <p className="text-muted-foreground">Submitting a false DMCA takedown notice is a serious legal matter. Knowingly misrepresenting that material is infringing may result in liability for damages under applicable law.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">7. Contact</h2>
        <p className="text-muted-foreground">DMCA notices and counter-notices: <a href="mailto:dmca@dm-me.io" className="text-primary hover:underline">dmca@dm-me.io</a><br />Registered address: Future Tower, Business Bay, Dubai, United Arab Emirates</p>
      </section>
    </LegalPageLayout>
  );
};

export default DMCAPolicy;
