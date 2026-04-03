import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'orbitalfork',
  description: 'Resonance between research bodies.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-field-bg text-field-text font-mono">
        {children}
      </body>
    </html>
  )
}
