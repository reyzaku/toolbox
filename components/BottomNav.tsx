'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/', label: 'Home', icon: '⊞' },
  { href: '/image-converter', label: 'Images', icon: '🖼' },
  { href: '/color-palette', label: 'Colors', icon: '🎨' },
  { href: '/qr-generator', label: 'QR', icon: '▣' },
  { href: '/pdf-toolkit', label: 'PDF', icon: '📄' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#111111] border-t border-[#2A2A2A] flex">
      {tabs.map((tab) => {
        const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[10px] transition-colors ${
              active ? 'text-[#E85D20]' : 'text-[#666]'
            }`}
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
