import Link from 'next/link'

const groups = [
  {
    label: 'Image',
    tools: [
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
    ],
  },
  {
    label: 'Video & GIF',
    tools: [
      {
        href: '/video-converter',
        icon: '🎞',
        label: 'Video Converter',
        description: 'Convert between MP4, WebM, MOV, AVI, MKV formats. Batch processing with ZIP download.',
        status: 'live',
        color: '#3498DB',
      },
      {
        href: '/video-compressor',
        icon: '📦',
        label: 'Video Compressor',
        description: 'Shrink video files using H.264/CRF with fine-grained quality and resolution control.',
        status: 'live',
        color: '#E67E22',
      },
      {
        href: '/video-to-gif',
        icon: '🎬',
        label: 'Video → GIF',
        description: 'Turn any video clip into a high-quality animated GIF. Control FPS, size, dithering & loop count.',
        status: 'live',
        color: '#E74C3C',
      },
      {
        href: '/gif-optimizer',
        icon: '⚡',
        label: 'GIF Optimizer',
        description: 'Reduce GIF file size by re-encoding palette, FPS, and dimensions. Optional gifsicle lossy pass.',
        status: 'live',
        color: '#F39C12',
      },
    ],
  },
  {
    label: 'PDF',
    tools: [
      {
        href: '/pdf-toolkit',
        icon: '📄',
        label: 'PDF Toolkit',
        description: 'Merge, split, compress and reorder PDF pages. Drag & drop page sorting.',
        status: 'live',
        color: '#E74C3C',
      },
      {
        href: '/pdf-to-images',
        icon: '📑',
        label: 'PDF → Images',
        description: 'Convert each PDF page to PNG or JPG. Choose 72, 150, or 300 DPI. Batch ZIP download.',
        status: 'live',
        color: '#2980B9',
      },
      {
        href: '/image-to-pdf',
        icon: '📁',
        label: 'Images → PDF',
        description: 'Combine JPG, PNG, WebP images into one PDF. A4, Letter, or fit-to-image page sizes.',
        status: 'live',
        color: '#F39C12',
      },
    ],
  },
  {
    label: 'Other',
    tools: [
      {
        href: '/invoice',
        icon: '🧾',
        label: 'Invoice Generator',
        description: 'Create professional PDF invoices with line items, tax, and auto-calculated totals.',
        status: 'live',
        color: '#1ABC9C',
      },
    ],
  },
]

export default function Home() {
  const liveCount = groups.flatMap((g) => g.tools).filter((t) => t.status === 'live').length
  const soonCount = groups.flatMap((g) => g.tools).filter((t) => t.status === 'soon').length

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

      {/* Groups */}
      <div className="space-y-10">
        {groups.map((group) => (
          <div key={group.label}>
            <h2 className="text-xs font-semibold text-[#3A3A3A] uppercase tracking-widest mb-4">{group.label}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {group.tools.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group relative bg-[#111111] border border-[#2A2A2A] rounded-xl p-5 hover:border-[#3A3A3A] hover:bg-[#161616] transition-all duration-200 cursor-pointer"
                >
                  {tool.status === 'soon' && (
                    <span className="absolute top-4 right-4 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#222] text-[#555] border border-[#333]">
                      Soon
                    </span>
                  )}

                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${tool.color}20` }}
                  >
                    {tool.icon}
                  </div>

                  <h3 className="font-semibold text-[#F0F0F0] text-sm mb-1.5 group-hover:text-white transition-colors">
                    {tool.label}
                  </h3>
                  <p className="text-xs text-[#555] leading-relaxed">{tool.description}</p>

                  {tool.status === 'live' && (
                    <div className="mt-4 flex items-center gap-1 text-[#E85D20] text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Open tool <span>→</span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Stats bar */}
      <div className="mt-10 flex flex-wrap gap-6 text-xs text-[#444]">
        <span>{liveCount} tools available</span>
        <span>·</span>
        <span>{soonCount} coming soon</span>
        <span>·</span>
        <span>100% client-side</span>
        <span>·</span>
        <span>No account needed</span>
      </div>
    </div>
  )
}
