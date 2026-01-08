import { render } from '@react-email/render';
import { Text, Button, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import type { PasswordResetData } from '../services/email-service';

const colors = {
  primary: '#F59E0B',
  orange: '#F97316',
  text: '#1A202C',
  textSecondary: '#4A5568',
};

interface Props extends PasswordResetData {}

export function PasswordResetEmail({ userName, resetUrl }: Props) {
  return (
    <EmailLayout previewText="Reset your K-Rent Safety password">
      <Section>
        <Text
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: '16px',
          }}
        >
          Reset Your Password
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
          We received a request to reset your password. Click the button below
          to create a new password.
        </Text>

        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button
            href={resetUrl}
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
            Reset Password
          </Button>
        </Section>

        <Text style={{ color: colors.textSecondary, fontSize: '14px' }}>
          This link expires in 1 hour. If you did not request a password reset,
          please ignore this email or contact support if you have concerns.
        </Text>
      </Section>
    </EmailLayout>
  );
}

export async function renderPasswordReset(
  data: PasswordResetData
): Promise<string> {
  const html = await render(<PasswordResetEmail {...data} />);
  return html;
}
