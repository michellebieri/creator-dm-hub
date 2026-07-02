import { LegalPageLayout } from '@/components/LegalPageLayout';

const RefundPolicy = () => {
  return (
    <LegalPageLayout title="Refund &amp; Cancellation Policy">
      <section>
        <h2 className="text-xl font-semibold mb-3">1. Overview</h2>
        <p className="text-muted-foreground">DM.me operates as a platform intermediary that connects Creators and Fans. We provide the technology infrastructure for paid messaging — we do not control, create, or guarantee the content, response speed, or quality of any Creator's communications or AI persona. Please read this policy carefully before purchasing wallet credits.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">2. All Sales Are Final — No-Refund Policy</h2>
        <p className="text-muted-foreground font-medium mb-3 uppercase text-sm">All purchases of wallet credits are final and non-refundable.</p>
        <p className="text-muted-foreground mb-3">By completing a purchase, you acknowledge and accept that:</p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Wallet credits are digital currency purchased for use on a digital platform. Once added to your account, they are considered delivered and consumed.</li>
          <li>DM.me is a platform, not a content creator. We do not guarantee any particular standard of creator response, response time, message quality, or personal engagement.</li>
          <li>AI-assisted replies are a disclosed and expected feature of the platform. Receiving an AI-assisted response does not constitute a failure of service.</li>
          <li>Dissatisfaction with a creator's content, style, reply quality, or interactions — whether human or AI-assisted — does not entitle you to a refund.</li>
          <li>Changing your mind after purchase is not a valid reason for a refund.</li>
          <li>Credits do not expire and remain in your wallet indefinitely.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">3. Mandatory Legal Exceptions</h2>
        <p className="text-muted-foreground mb-4">Notwithstanding Section 2, we will issue a refund only in the following circumstances required by law or resulting from our technical error:</p>

        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-foreground mb-1">3.1 Technical Non-Delivery</h3>
            <p className="text-muted-foreground">If a payment is successfully charged by Stripe but credits are not added to your wallet due to a confirmed technical error on our part, we will credit your wallet or issue a full refund of the affected amount. You must report such errors within 14 days of the transaction.</p>
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-1">3.2 Duplicate Charge</h3>
            <p className="text-muted-foreground">If you are charged more than once for the same transaction due to a technical error, we will refund all duplicate charges promptly.</p>
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-1">3.3 EU/EEA Right of Withdrawal — Waiver</h3>
            <p className="text-muted-foreground">If you are located in the EU or EEA, you have a statutory 14-day right of withdrawal from digital content purchases. However, by completing your purchase and clicking "Add Funds", you expressly consent to immediate delivery of digital content (wallet credits) and acknowledge that you lose your right of withdrawal from that moment. This waiver complies with EU Directive 2019/770.</p>
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-1">3.4 Other Mandatory Local Law</h3>
            <p className="text-muted-foreground">If applicable consumer protection law in your jurisdiction mandates a refund in circumstances not covered above, we will comply with that legal obligation. Contact us at <a href="mailto:support@dm-me.io" className="text-primary hover:underline">support@dm-me.io</a> with documentation of the applicable legal basis.</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">4. Unspent Balance on Account Closure</h2>
        <p className="text-muted-foreground">If you close your account and have an unspent wallet balance, we will refund the remaining balance to your original payment method, provided the balance is at least USD 5.00. Balances below this threshold are forfeited upon voluntary account closure due to processing costs. No refund is issued for any credits that were spent prior to closure.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">5. Chargebacks and Disputes</h2>
        <p className="text-muted-foreground mb-3">Initiating a chargeback with your bank or card provider for credits that were legitimately added to your wallet is considered fraudulent misuse of the chargeback process. If you do so:</p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Your account will be immediately suspended pending investigation;</li>
          <li>Your account may be permanently terminated;</li>
          <li>We reserve the right to pursue recovery of fraudulently reclaimed amounts through available legal channels;</li>
          <li>You will be banned from creating future accounts on the Platform.</li>
        </ul>
        <p className="text-muted-foreground mt-3">If you have a legitimate payment concern, contact us at <a href="mailto:support@dm-me.io" className="text-primary hover:underline">support@dm-me.io</a> before initiating a chargeback. We respond within 2 business days.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">6. What Is Not a Valid Reason for a Refund</h2>
        <p className="text-muted-foreground mb-3">The following are expressly not valid grounds for a refund or chargeback:</p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Dissatisfaction with a creator's content, personality, or responses;</li>
          <li>An AI persona replied instead of a human creator (this is a disclosed platform feature);</li>
          <li>The creator did not reply within your expected timeframe;</li>
          <li>You no longer wish to use the platform;</li>
          <li>You did not read the platform's features or this policy before purchasing;</li>
          <li>The content was legal but not to your personal taste.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">7. How to Request a Refund</h2>
        <p className="text-muted-foreground mb-3">To request a refund under Section 3 (mandatory exceptions only), contact us at <a href="mailto:support@dm-me.io" className="text-primary hover:underline">support@dm-me.io</a> within 14 days of the transaction, including:</p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Your registered email address;</li>
          <li>Transaction date, amount, and Stripe transaction reference;</li>
          <li>Description of the technical error or legal basis for the refund;</li>
          <li>Any supporting evidence.</li>
        </ul>
        <p className="text-muted-foreground mt-3">We will review and respond within 5 business days. Approved refunds are processed within 5–10 business days to your original payment method.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">8. Contact</h2>
        <p className="text-muted-foreground">Refund enquiries: <a href="mailto:support@dm-me.io" className="text-primary hover:underline">support@dm-me.io</a></p>
      </section>
    </LegalPageLayout>
  );
};

export default RefundPolicy;
