import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
  Preview,
} from '@react-email/components';
import * as React from 'react';

interface EmailLayoutProps {
  children: React.ReactNode;
  previewText?: string;
}

// Brand colors matching app theme (amber/orange)
const colors = {
  primary: '#F59E0B', // amber-500
  primaryDark: '#D97706', // amber-600
  orange: '#F97316', // orange-500
  background: '#FDFBF7', // warm cream background
  text: '#1A202C', // dark text
  textSecondary: '#4A5568',
  border: '#FEF3C7', // amber-100
};

export function EmailLayout({ children, previewText }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      {previewText && <Preview>{previewText}</Preview>}
      <Body
        style={{
          backgroundColor: colors.background,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: '40px 0',
          margin: 0,
        }}
      >
        <Container
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            padding: '40px',
            maxWidth: '600px',
            margin: '0 auto',
            border: `1px solid ${colors.border}`,
          }}
        >
          {/* Header with Logo */}
          <Section style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div
              style={{
                display: 'inline-block',
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.orange})`,
                borderRadius: '12px',
                padding: '12px',
                marginBottom: '16px',
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: '24px',
                  margin: 0,
                }}
              >
                🏠
              </Text>
            </div>
            <Text
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: colors.primaryDark,
                margin: 0,
              }}
            >
              K-Rent Safety
            </Text>
          </Section>

          {children}

          {/* Footer */}
          <Hr style={{ borderColor: colors.border, margin: '32px 0' }} />
          <Section style={{ textAlign: 'center' }}>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: '14px',
                margin: '0 0 8px 0',
              }}
            >
              Protecting your rental investment in Korea
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: '12px',
                margin: 0,
              }}
            >
              <Link
                href="https://krent-safety.com"
                style={{ color: colors.primary }}
              >
                krent-safety.com
              </Link>
              {' | '}
              <Link
                href="https://krent-safety.com/terms"
                style={{ color: colors.primary }}
              >
                Terms of Service
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
