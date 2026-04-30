'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tools = [
  { href: '/', label: 'Home', icon: '⊞' },
  { section: 'Image' },
  { href: '/image-converter', label: 'Image Converter', icon: '🖼' },
  { href: '/color-palette', label: 'Color Palette', icon: '🎨' },
  { href: '/qr-generator', label: 'QR Generator', icon: '▣' },
  { section: 'Video & GIF' },
  { href: '/video-converter', label: 'Video Converter', icon: '🎞' },
  { href: '/video-compressor', label: 'Video Compressor', icon: '📦' },
  { href: '/video-to-gif', label: 'Video → GIF', icon: '🎬' },
  { href: '/gif-optimizer', label: 'GIF Optimizer', icon: '⚡' },
  { section: 'PDF' },
  { href: '/pdf-toolkit', label: 'PDF Toolkit', icon: '📄' },
  { href: '/pdf-to-images', label: 'PDF → Images', icon: '📑' },
  { href: '/image-to-pdf', label: 'Images → PDF', icon: '📁' },
  { section: 'Other' },
  { href: '/invoice', label: 'Invoice', icon: '🧾' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 flex-col bg-[#111111] border-r border-[#2A2A2A] z-40">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#2A2A2A] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#E85D20] rounded-lg flex items-center justify-center font-black text-white text-sm">T</div>
          <span className="font-bold text-lg tracking-tight text-white">TOOLBOX</span>
        </div>
        <p className="text-xs text-[#666] mt-1">Browser-based toolkit</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {tools.map((tool, i) => {
          if ('section' in tool) {
            return (
              <p key={i} className="text-[10px] font-semibold text-[#3A3A3A] uppercase tracking-widest px-3 pt-4 pb-1">
                {tool.section}
              </p>
            )
          }
          const active = tool.href === '/' ? pathname === '/' : pathname.startsWith(tool.href!)
          return (
            <Link
              key={tool.href}
              href={tool.href!}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                active
                  ? 'bg-[#E85D20] text-white font-medium'
                  : 'text-[#999] hover:text-white hover:bg-[#1E1E1E]'
              }`}
            >
              <span className="text-base leading-none">{tool.icon}</span>
              <span>{tool.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-[#2A2A2A] flex-shrink-0">
        <p className="text-[10px] text-[#444] leading-relaxed">
          100% client-side.<br />Files never leave your machine.
        </p>
      </div>
    </aside>
  )
}
