'use client'

import { useCallback, useState } from 'react'
import DropZone from '@/components/DropZone'
import { useToast } from '@/components/Toast'
import { downloadFile } from '@/lib/utils'

interface Color {
  hex: string
  rgb: { r: number; g: number; b: number }
  hsl: { h: number; s: number; l: number }
  name: string
}

export default function ColorPalette() {
  const { toast } = useToast()
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [colors, setColors] = useState<Color[]>([])
  const [count, setCount] = useState(8)
  const [extracting, setExtracting] = useState(false)
  const [copiedHex, setCopiedHex] = useState<string | null>(null)

  const handleFiles = useCallback((files: File[]) => {
    const img = files.find((f) => f.type.startsWith('image/'))
    if (!img) return
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    setImageUrl(URL.createObjectURL(img))
    setColors([])
  }, [imageUrl])

  const extractColors = useCallback(async () => {
    if (!imageUrl) return
    setExtracting(true)
    try {
      const { getPalette } = await import('colorthief')

      // eslint-disable-next-line @next/next/no-img-element
      const imgEl = new Image()
      imgEl.src = imageUrl
      await new Promise<void>((res) => { imgEl.onload = () => res() })

      // Draw to canvas — avoids any cross-origin quirks
      const canvas = document.createElement('canvas')
      canvas.width = imgEl.naturalWidth
      canvas.height = imgEl.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(imgEl, 0, 0)

      const palette = await getPalette(canvas as unknown as HTMLImageElement, { colorCount: count })
      if (!palette) { toast('No colors found', 'error'); return }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ntc = (await import('name-that-color')).default as any
      ntc.init()

      const extracted: Color[] = palette.map((c) => {
        const hexVal: string = c.hex()
        const rgbVal = c.rgb()
        const hslVal = c.hsl()
        let name = hexVal
        try { name = (ntc.name(hexVal) as [string, string, boolean])[1] } catch { /* ignore */ }
        return { hex: hexVal, rgb: rgbVal, hsl: hslVal, name }
      })

      setColors(extracted)
    } catch (e) {
      console.error(e)
      toast('Failed to extract colors', 'error')
    } finally {
      setExtracting(false)
    }
  }, [imageUrl, count, toast])

  const copyHex = (hex: string) => {
    navigator.clipboard.writeText(hex)
    setCopiedHex(hex)
    toast(`Copied ${hex}`)
    setTimeout(() => setCopiedHex(null), 2000)
  }

  const exportJson = () => {
    const data = colors.map(({ hex, rgb, hsl, name }) => ({
      hex,
      rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
      hsl: `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`,
      name,
    }))
    downloadFile(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'palette.json')
    toast('Exported JSON')
  }

  const exportPng = () => {
    if (!colors.length) return
    const W = 120, H = 180
    const canvas = document.createElement('canvas')
    canvas.width = W * colors.length
    canvas.height = H
    const ctx = canvas.getContext('2d')!
    colors.forEach(({ hex }, i) => {
      ctx.fillStyle = hex
      ctx.fillRect(i * W, 0, W, H * 0.72)
      ctx.fillStyle = '#111'
      ctx.fillRect(i * W, H * 0.72, W, H * 0.28)
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 11px monospace'
      ctx.fillText(hex.toUpperCase(), i * W + 8, H - 12)
    })
    canvas.toBlob((blob) => { if (blob) downloadFile(blob, 'palette.png') })
    toast('Exported PNG')
  }

  return (
    <div className="px-6 py-10 md:px-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="w-9 h-9 bg-[#9B59B6]/20 rounded-lg flex items-center justify-center text-xl">🎨</span>
          Color Palette Extractor
        </h1>
        <p className="text-sm text-[#666] mt-1">Extract dominant colors from any image</p>
      </div>

      {!imageUrl ? (
        <DropZone
          onFiles={handleFiles}
          accept="image/*"
          multiple={false}
          label="Drop an image to extract colors"
          sublabel="PNG, JPG, WebP, GIF"
        />
      ) : (
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* Image preview */}
          <div className="relative group flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Uploaded"
              className="max-w-[260px] max-h-[260px] object-contain rounded-xl border border-[#2A2A2A]"
            />
            <button
              onClick={() => { setImageUrl(null); setColors([]) }}
              className="absolute top-2 right-2 w-6 h-6 bg-black/80 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
          </div>

          {/* Controls */}
          <div className="flex-1 space-y-4 w-full">
            <div>
              <label className="block text-xs font-medium text-[#888] mb-2 uppercase tracking-wider">
                Number of colors: <span className="text-white">{count}</span>
              </label>
              <input
                type="range" min={3} max={10} value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full accent-[#9B59B6]"
              />
              <div className="flex justify-between text-xs text-[#444] mt-1"><span>3</span><span>10</span></div>
            </div>

            <button
              onClick={extractColors}
              disabled={extracting}
              className="w-full py-3 bg-[#9B59B6] hover:bg-[#8e44ad] disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
            >
              {extracting ? 'Extracting...' : 'Extract Colors'}
            </button>

            {colors.length > 0 && (
              <div className="flex gap-2">
                <button onClick={exportPng} className="flex-1 py-2 bg-[#1A1A1A] hover:bg-[#222] text-sm text-white rounded-lg border border-[#2A2A2A] transition-colors">
                  Export PNG
                </button>
                <button onClick={exportJson} className="flex-1 py-2 bg-[#1A1A1A] hover:bg-[#222] text-sm text-white rounded-lg border border-[#2A2A2A] transition-colors">
                  Export JSON
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Swatches */}
      {colors.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-medium text-[#888] mb-4 uppercase tracking-wider">
            Extracted Palette — click to copy HEX
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {colors.map((color, i) => (
              <button
                key={i}
                onClick={() => copyHex(color.hex)}
                className="group relative rounded-xl overflow-hidden border border-[#2A2A2A] hover:border-[#444] transition-all hover:scale-[1.02]"
              >
                <div className="h-20" style={{ backgroundColor: color.hex }} />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                  <span className="text-white text-xs font-bold bg-black/60 px-2 py-1 rounded-full">
                    {copiedHex === color.hex ? 'Copied!' : 'Copy HEX'}
                  </span>
                </div>
                <div className="bg-[#111] px-3 py-2.5 text-left">
                  <p className="text-xs font-mono text-white font-semibold">{color.hex.toUpperCase()}</p>
                  <p className="text-[10px] text-[#555] mt-0.5 truncate">{color.name}</p>
                  <p className="text-[10px] text-[#444] mt-0.5">rgb({color.rgb.r}, {color.rgb.g}, {color.rgb.b})</p>
                  <p className="text-[10px] text-[#444]">
                    hsl({Math.round(color.hsl.h)}, {Math.round(color.hsl.s)}%, {Math.round(color.hsl.l)}%)
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {imageUrl && (
        <button
          onClick={() => { setImageUrl(null); setColors([]) }}
          className="mt-6 text-sm text-[#555] hover:text-[#888] transition-colors"
        >
          ← Try a different image
        </button>
      )}
    </div>
  )
}
