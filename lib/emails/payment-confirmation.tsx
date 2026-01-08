import { render } from '@react-email/render';
import { Text, Button, Section, Row, Column, Hr } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import type { PaymentConfirmationData } from '../services/email-service';

const colors = {
  primary: '#F59E0B',
  orange: '#F97316',
  text: '#1A202C',
  textSecondary: '#4A5568',
  success: '#10B981',
  border: '#FEF3C7',
};

// Format Korean Won
function formatKRW(amount: number): string {
  return `₩${amount.toLocaleString('ko-KR')}`;
}

// Get analysis type display name
function getAnalysisTypeName(type: string): string {
  switch (type) {
    case 'jeonse_safety':
      return 'Jeonse Safety Analysis';
    case 'wolse_price':
      return 'Wolse Price Analysis';
    case 'wolse_safety':
      return 'Wolse Safety Analysis';
    default:
      return 'Property Analysis';
  }
}

interface Props extends PaymentConfirmationData {}

export function PaymentConfirmationEmail({
  userName,
  orderName,
  amount,
  paymentMethod,
  receiptUrl,
  analysisId,
  analysisType,
}: Props) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://krent-safety.com';
  const reportUrl = `${appUrl}/analyze/${analysisType.replace('_', '/')}/${analysisId}/report`;

  return (
    <EmailLayout previewText={`Payment confirmed for ${orderName}`}>
      <Section>
        {/* Success badge */}
        <Section style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              display: 'inline-block',
              backgroundColor: '#D1FAE5',
              borderRadius: '50%',
              width: '64px',
              height: '64px',
              lineHeight: '64px',
              textAlign: 'center',
            }}
          >
            <Text style={{ margin: 0, fontSize: '32px', color: colors.success }}>
              ✓
            </Text>
          </div>
        </Section>

        <Text
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: colors.text,
            textAlign: 'center',
            marginBottom: '8px',
          }}
        >
          Payment Successful!
        </Text>

        <Text
          style={{
            color: colors.textSecondary,
            fontSize: '16px',
            textAlign: 'center',
            marginBottom: '32px',
          }}
        >
          Thank you for your purchase, {userName || 'valued customer'}!
        </Text>

        {/* Order details */}
        <Section
          style={{
            backgroundColor: '#FEFCE8',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}
        >
          <Text
            style={{
              fontWeight: '600',
              color: colors.text,
              marginBottom: '16px',
              fontSize: '16px',
            }}
          >
            Order Details
          </Text>

          <Row>
            <Column style={{ width: '50%' }}>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: '14px',
                  margin: '4px 0',
                }}
              >
                Order:
              </Text>
            </Column>
            <Column style={{ width: '50%', textAlign: 'right' }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: '14px',
                  fontWeight: '500',
                  margin: '4px 0',
                }}
              >
                {orderName}
              </Text>
            </Column>
          </Row>

          <Row>
            <Column style={{ width: '50%' }}>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: '14px',
                  margin: '4px 0',
                }}
              >
                Analysis Type:
              </Text>
            </Column>
            <Column style={{ width: '50%', textAlign: 'right' }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: '14px',
                  fontWeight: '500',
                  margin: '4px 0',
                }}
              >
                {getAnalysisTypeName(analysisType)}
              </Text>
            </Column>
          </Row>

          <Row>
            <Column style={{ width: '50%' }}>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: '14px',
                  margin: '4px 0',
                }}
              >
                Payment Method:
              </Text>
            </Column>
            <Column style={{ width: '50%', textAlign: 'right' }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: '14px',
                  fontWeight: '500',
                  margin: '4px 0',
                }}
              >
                {paymentMethod}
              </Text>
            </Column>
          </Row>

          <Hr style={{ borderColor: colors.border, margin: '16px 0' }} />

          <Row>
            <Column style={{ width: '50%' }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: '18px',
                  fontWeight: '600',
                  margin: '4px 0',
                }}
              >
                Total:
              </Text>
            </Column>
            <Column style={{ width: '50%', textAlign: 'right' }}>
              <Text
                style={{
                  color: colors.primary,
                  fontSize: '18px',
                  fontWeight: '700',
                  margin: '4px 0',
                }}
              >
                {formatKRW(amount)}
              </Text>
            </Column>
          </Row>
        </Section>

        {/* CTA buttons */}
        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button
            href={reportUrl}
            style={{
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.orange})`,
              color: '#FFFFFF',
              padding: '14px 32px',
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '16px',
              textDecoration: 'none',
              display: 'inline-block',
              marginBottom: '12px',
            }}
          >
            View Your Report
          </Button>

          {receiptUrl && (
            <Text style={{ marginTop: '12px' }}>
              <a
                href={receiptUrl}
                style={{ color: colors.primary, fontSize: '14px' }}
              >
                Download Receipt →
              </a>
            </Text>
          )}
        </Section>

        <Text
          style={{
            color: colors.textSecondary,
            fontSize: '14px',
            textAlign: 'center',
          }}
        >
          Your analysis report is ready and will be available in your dashboard
          for 30 days.
        </Text>
      </Section>
    </EmailLayout>
  );
}

export async function renderPaymentConfirmation(
  data: PaymentConfirmationData
): Promise<string> {
  const html = await render(<PaymentConfirmationEmail {...data} />);
  return html;
}
