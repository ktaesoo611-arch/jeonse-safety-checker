import { render } from '@react-email/render';
import { Text, Button, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import type { SignupConfirmationData } from '../services/email-service';

const colors = {
  primary: '#F59E0B',
  orange: '#F97316',
  text: '#1A202C',
  textSecondary: '#4A5568',
};

interface Props extends SignupConfirmationData {}

export function SignupConfirmationEmail({ userName, confirmationUrl }: Props) {
  return (
    <EmailLayout previewText="Confirm your K-Rent Safety account">
      <Section>
        <Text
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: '16px',
          }}
        >
          Welcome to K-Rent Safety!
        </Text>

        <Text
          style={{
            color: colors.textSecondary,
            fontSize: '16px',
            lineHeight: '1.6',
          }}
        >
          Hi {userName || 'there'},
        </Text>

        <Text
          style={{
            color: colors.textSecondary,
            fontSize: '16px',
            lineHeight: '1.6',
          }}
        >
          Thank you for signing up! Please confirm your email address to start
          protecting your rental investment in Korea.
        </Text>

        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button
            href={confirmationUrl}
            style={{
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.orange})`,
              color: '#FFFFFF',
              padding: '14px 32px',
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '16px',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Confirm Email Address
          </Button>
        </Section>

        <Text style={{ color: colors.textSecondary, fontSize: '14px' }}>
          This link expires in 24 hours. If you did not create an account, you
          can safely ignore this email.
        </Text>
      </Section>
    </EmailLayout>
  );
}

export async function renderSignupConfirmation(
  data: SignupConfirmationData
): Promise<string> {
  const html = await render(<SignupConfirmationEmail {...data} />);
  return html;
}
