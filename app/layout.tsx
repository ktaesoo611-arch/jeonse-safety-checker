import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Jeonse Safety Checker - 전세 안전도 검사',
  description: 'Check the safety of your jeonse deposit with comprehensive property analysis',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
