import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'
import { ToastContainer } from '@/components/ui/Toast'

export const metadata: Metadata = {
  title: "petVetta — Know What's Wrong. Know What to Do.",
  description:
    'AI-powered pet health companion. Instantly triage symptoms, manage health records, and connect with trusted vets.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'petVetta',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1a2e4a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-white">
        <Providers>
          <div className="min-h-screen flex flex-col">
            {children}
          </div>
          <ToastContainer />
        </Providers>
      </body>
    </html>
  )
}
