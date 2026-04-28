import type { Metadata } from 'next'
import { Bricolage_Grotesque, JetBrains_Mono, Raleway } from 'next/font/google'
import './globals.css'
import ClientLayout from '@/components/client-layout'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-heading',
  display: 'swap',
})

const raleway = Raleway({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Costa Select — Intern Platform',
  description: 'Intern platform voor Costa Select medewerkers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl" className={`h-full ${bricolage.variable} ${raleway.variable} ${jetbrains.variable}`}>
      <body className="h-full">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
