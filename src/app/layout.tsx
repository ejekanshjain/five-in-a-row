import type { Metadata } from 'next'
import { Bricolage_Grotesque } from 'next/font/google'

import { InlineScript } from '@/components/inline-script'
import { THEME_SCRIPT } from '@/lib/theme'

import './globals.css'

const display = Bricolage_Grotesque({ variable: '--font-display', subsets: ['latin'] })

export const metadata: Metadata = {
  title: '5 in a Row',
  description: 'Drop discs, line up five, and beat your colleagues in real time.'
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${display.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <InlineScript html={THEME_SCRIPT} />
      </head>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  )
}
