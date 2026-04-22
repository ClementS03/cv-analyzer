import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CV Analyzer — Score ATS en 30 secondes',
  description: 'Analyse ton CV avec 12 checks ATS. Aperçu gratuit, rapport complet à 5€. Sans compte.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>{children}</body>
    </html>
  )
}
