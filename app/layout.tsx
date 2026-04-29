import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'
import { ToastProvider } from '@/components/Toast'

export const metadata: Metadata = {
  title: 'TOOLBOX — Browser-based Designer Toolkit',
  description: 'A personal browser-based toolkit hub for graphic designers. Everything runs client-side. Files never leave your machine.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0D0D0D] text-[#F0F0F0] antialiased">
        <ToastProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 md:ml-64 pb-20 md:pb-0 min-h-screen">
              {children}
            </main>
          </div>
          <BottomNav />
        </ToastProvider>
      </body>
    </html>
  )
}
