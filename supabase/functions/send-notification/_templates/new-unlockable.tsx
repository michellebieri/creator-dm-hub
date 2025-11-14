import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Hr,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface NewUnlockableEmailProps {
  recipientName: string;
  senderName: string;
  appUrl: string;
}

export const NewUnlockableEmail = ({
  recipientName,
  senderName,
  appUrl,
}: NewUnlockableEmailProps) => (
  <Html>
    <Head />
    <Preview>{senderName} sent you exclusive content</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🔒 Exclusive Content</Heading>
        <Text style={greeting}>Hi {recipientName},</Text>
        <Text style={text}>
          <strong>{senderName}</strong> sent you exclusive unlockable content!
        </Text>
        <Section style={highlightBox}>
          <Text style={highlightText}>
            ✨ Premium content is waiting for you
          </Text>
        </Section>
        <Section style={buttonContainer}>
          <Link href={`${appUrl}/conversations`} style={button}>
            View & Unlock Content
          </Link>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          You're receiving this because someone sent you premium content on DM.me
        </Text>
      </Container>
    </Body>
  </Html>
);

export default NewUnlockableEmail;

const main = {
  backgroundColor: '#f5f5f5',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 30px',
  borderRadius: '8px',
  maxWidth: '600px',
};

const h1 = {
  color: '#0EA5E9',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 30px',
  padding: '0',
};

const greeting = {
  color: '#333333',
  fontSize: '16px',
  margin: '0 0 10px',
};

const text = {
  color: '#333333',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 20px',
};

const highlightBox = {
  background: 'linear-gradient(135deg, #0EA5E9, #14B8A6)',
  padding: '20px',
  borderRadius: '8px',
  margin: '30px 0',
  textAlign: 'center' as const,
};

const highlightText = {
  margin: '0',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
};

const button = {
  backgroundColor: '#0EA5E9',
  color: '#ffffff',
  padding: '14px 32px',
  textDecoration: 'none',
  borderRadius: '6px',
  display: 'inline-block',
  fontWeight: 'bold',
  fontSize: '16px',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '40px 0 20px',
};

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0',
};
