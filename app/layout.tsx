import type { Metadata } from 'next'
import { Bricolage_Grotesque, Raleway } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/sidebar'

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

export const metadata: Metadata = {
  title: 'Costa Select Valencia — Financieel Dashboard',
  description: 'Financieel dashboard voor Costa Select Valencia vastgoedmakelaarsbureau',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl" className={`h-full ${bricolage.variable} ${raleway.variable}`}>
      <body className="h-full flex">
        <Sidebar />
        <main className="flex-1 ml-[244px] min-h-screen p-6" style={{ backgroundColor: '#FFFAEF' }}>
          {children}
        </main>
      </body>
    </html>
  )
}
