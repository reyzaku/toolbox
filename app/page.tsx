import Link from 'next/link'

const tools = [
  {
    href: '/image-converter',
    icon: '🖼',
    label: 'Image Converter',
    description: 'Convert, compress & resize images. Supports PNG, JPG, WebP, AVIF. Batch download as ZIP.',
    status: 'live',
    color: '#E85D20',
  },
  {
    href: '/color-palette',
    icon: '🎨',
    label: 'Color Palette',
    description: 'Extract dominant colors from any image. Get HEX, RGB & HSL values. Export as PNG or JSON.',
    status: 'live',
    color: '#9B59B6',
  },
  {
    href: '/qr-generator',
    icon: '▣',
    label: 'QR Generator',
    description: 'Generate QR codes for URLs, text, WiFi, email & phone. Custom colors, live preview, batch mode.',
    status: 'live',
    color: '#27AE60',
  },
  {
    href: '/pdf-toolkit',
    icon: '📄',
    label: 'PDF Toolkit',
    description: 'Merge, split, compress and reorder PDF pages. Drag & drop page sorting.',
    status: 'soon',
    color: '#E74C3C',
  },
  {
    href: '/pdf-to-images',
    icon: '📑',
    label: 'PDF → Images',
    description: 'Convert each PDF page to PNG or JPG. Choose 72, 150, or 300 DPI. Batch ZIP download.',
    status: 'soon',
    color: '#2980B9',
  },
  {
    href: '/image-to-pdf',
    icon: '📁',
    label: 'Images → PDF',
    description: 'Combine JPG, PNG, WebP images into one PDF. A4, Letter, or fit-to-image page sizes.',
    status: 'soon',
    color: '#F39C12',
  },
  {
    href: '/invoice',
    icon: '🧾',
    label: 'Invoice Generator',
    description: 'Create professional PDF invoices with line items, tax, and auto-calculated totals.',
    status: 'soon',
    color: '#1ABC9C',
  },
]

export default function Home() {
  return (
    <div className="px-6 py-10 md:px-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-[#E85D20] rounded-xl flex items-center justify-center font-black text-white text-lg">T</div>
          <h1 className="text-3xl font-black tracking-tight text-white">TOOLBOX</h1>
        </div>
        <p className="text-[#666] text-sm max-w-lg leading-relaxed">
          A personal browser-based toolkit for graphic designers. All processing happens in your browser — files never leave your machine.
        </p>
      </div>

      {/* Tool grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group relative bg-[#111111] border border-[#2A2A2A] rounded-xl p-5 hover:border-[#3A3A3A] hover:bg-[#161616] transition-all duration-200 cursor-pointer"
          >
            {/* Status badge */}
            {tool.status === 'soon' && (
              <span className="absolute top-4 right-4 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#222] text-[#555] border border-[#333]">
                Soon
              </span>
            )}

            {/* Icon */}
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4 transition-transform group-hover:scale-110"
              style={{ backgroundColor: `${tool.color}20` }}
            >
              {tool.icon}
            </div>

            {/* Label */}
            <h2 className="font-semibold text-[#F0F0F0] text-sm mb-1.5 group-hover:text-white transition-colors">
              {tool.label}
            </h2>
            <p className="text-xs text-[#555] leading-relaxed">{tool.description}</p>

            {/* Arrow on hover */}
            {tool.status === 'live' && (
              <div className="mt-4 flex items-center gap-1 text-[#E85D20] text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Open tool <span>→</span>
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* Stats bar */}
      <div className="mt-10 flex flex-wrap gap-6 text-xs text-[#444]">
        <span>3 tools available</span>
        <span>·</span>
        <span>4 coming soon</span>
        <span>·</span>
        <span>100% client-side</span>
        <span>·</span>
        <span>No account needed</span>
      </div>
    </div>
  )
}
