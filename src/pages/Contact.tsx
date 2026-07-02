import { LegalPageLayout } from '@/components/LegalPageLayout';
import { Mail } from 'lucide-react';

const contacts = [
  {
    title: 'General Support',
    description: 'For account issues, billing questions, or technical help.',
    email: 'support@dm-me.io',
    note: 'Response time: within 1–2 business days.',
  },
  {
    title: 'Legal Notices',
    description: 'For legal correspondence, terms queries, or compliance matters.',
    email: 'legal@dm-me.io',
    note: null,
  },
  {
    title: 'Privacy & Data Requests',
    description: 'To exercise your data rights (access, deletion, correction) or for privacy-related enquiries.',
    email: 'privacy@dm-me.io',
    note: 'We respond to data requests within 30 days.',
  },
  {
    title: 'Copyright / DMCA',
    description: 'To submit a copyright takedown notice or counter-notice.',
    email: 'dmca@dm-me.io',
    note: null,
  },
];

const Contact = () => {
  return (
    <LegalPageLayout title="Contact Us">
      <p className="text-muted-foreground">Have a question, a problem, or a legal notice? Find the right contact below.</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {contacts.map((c) => (
          <div key={c.email} className="border rounded-lg p-5 space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary flex-shrink-0" />
              <h3 className="font-semibold text-foreground">{c.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{c.description}</p>
            <a
              href={`mailto:${c.email}`}
              className="text-sm text-primary hover:underline font-medium block"
            >
              {c.email}
            </a>
            {c.note && <p className="text-xs text-muted-foreground">{c.note}</p>}
          </div>
        ))}
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-3">Registered Business Address</h2>
        <address className="not-italic text-muted-foreground space-y-1">
          <p><strong>Nextchapter AI For Online Selling</strong></p>
          <p>Commercial Sole Proprietorship Establishment</p>
          <p>Trade License No. 1610274</p>
          <p>Future Tower, Business Bay</p>
          <p>Dubai, United Arab Emirates</p>
        </address>
        <p className="text-sm text-muted-foreground mt-4">DM.me is operated by Nextchapter AI For Online Selling, a Commercial Sole Proprietorship Establishment registered in Dubai, UAE. Trade License No. 1610274.</p>
      </section>
    </LegalPageLayout>
  );
};

export default Contact;
