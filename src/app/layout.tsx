import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { AuthHeader } from './components/AuthHeader'
import Providers from './providers'
import { Inter } from 'next/font/google'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'What\'s Next',
  description: 'A task management application',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 ${inter.className}`}
      >
        <Providers>
          <div className="min-h-screen flex flex-col">
            <AuthHeader />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
} 