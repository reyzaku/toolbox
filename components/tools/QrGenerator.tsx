'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '@/components/Toast'
import { downloadFile } from '@/lib/utils'

type QrMode = 'url' | 'text' | 'email' | 'phone' | 'wifi'

interface WifiConfig {
  ssid: string
  password: string
  security: 'WPA' | 'WEP' | 'nopass'
}

function buildQrContent(mode: QrMode, text: string, wifi: WifiConfig): string {
  switch (mode) {
    case 'email': return `mailto:${text}`
    case 'phone': return `tel:${text}`
    case 'wifi': return `WIFI:T:${wifi.security};S:${wifi.ssid};P:${wifi.password};;`
    default: return text
  }
}

const SIZE_OPTIONS = [128, 256, 512, 1024]

export default function QrGenerator() {
  const { toast } = useToast()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [mode, setMode] = useState<QrMode>('url')
  const [text, setText] = useState('https://')
  const [wifi, setWifi] = useState<WifiConfig>({ ssid: '', password: '', security: 'WPA' })
  const [size, setSize] = useState(512)
  const [fgColor, setFgColor] = useState('#000000')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [batchInput, setBatchInput] = useState('')
  const [batchMode, setBatchMode] = useState(false)
  const [generating, setGenerating] = useState(false)

  const content = buildQrContent(mode, text, wifi)

  // Preview always renders at a fixed 256px — layout never shifts
  const renderQr = useCallback(async () => {
    if (!canvasRef.current || !content.trim()) return
    const QRCode = (await import('qrcode')).default
    try {
      await QRCode.toCanvas(canvasRef.current, content, {
        width: 256,
        margin: 2,
        color: { dark: fgColor, light: bgColor },
      })
    } catch {
      // invalid content — ignore
    }
  }, [content, fgColor, bgColor])

  useEffect(() => { renderQr() }, [renderQr])

  // Download uses an off-screen canvas at the user-selected size
  const downloadPng = async () => {
    if (!content.trim()) return
    const QRCode = (await import('qrcode')).default
    const offscreen = document.createElement('canvas')
    try {
      await QRCode.toCanvas(offscreen, content, {
        width: size,
        margin: 2,
        color: { dark: fgColor, light: bgColor },
      })
      offscreen.toBlob((blob) => {
        if (blob) downloadFile(blob, 'qrcode.png')
      })
    } catch {
      toast('Failed to generate QR', 'error')
    }
  }

  const downloadSvg = async () => {
    if (!content.trim()) return
    const QRCode = (await import('qrcode')).default
    const svgStr = await QRCode.toString(content, {
      type: 'svg',
      width: size,
      margin: 2,
      color: { dark: fgColor, light: bgColor },
    })
    downloadFile(new Blob([svgStr], { type: 'image/svg+xml' }), 'qrcode.svg')
  }

  const downloadBatch = async () => {
    const urls = batchInput.split('\n').map((l) => l.trim()).filter(Boolean)
    if (!urls.length) { toast('Paste at least one URL per line', 'error'); return }
    setGenerating(true)
    try {
      const QRCode = (await import('qrcode')).default
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      for (let i = 0; i < urls.length; i++) {
        const dataUrl = await QRCode.toDataURL(urls[i], {
          width: size,
          margin: 2,
          color: { dark: fgColor, light: bgColor },
        })
        const base64 = dataUrl.split(',')[1]
        zip.file(`qr-${i + 1}.png`, base64, { base64: true })
      }
      const blob = await zip.generateAsync({ type: 'blob' })
      downloadFile(blob, 'qrcodes.zip')
      toast(`Generated ${urls.length} QR codes`)
    } catch {
      toast('Failed to generate batch', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const copyContent = () => {
    navigator.clipboard.writeText(content)
    toast('Content copied to clipboard')
  }

  const modes: { value: QrMode; label: string }[] = [
    { value: 'url', label: 'URL' },
    { value: 'text', label: 'Text' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'wifi', label: 'WiFi' },
  ]

  const placeholders: Record<QrMode, string> = {
    url: 'https://example.com',
    text: 'Any text here...',
    email: 'hello@example.com',
    phone: '+1234567890',
    wifi: '',
  }

  return (
    <div className="px-6 py-10 md:px-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="w-9 h-9 bg-[#27AE60]/20 rounded-lg flex items-center justify-center text-xl">▣</span>
          QR Generator
        </h1>
        <p className="text-sm text-[#666] mt-1">Generate QR codes for URLs, text, WiFi, email & phone</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_auto] gap-8">
        {/* Left — controls */}
        <div className="space-y-6">
          {/* Mode tabs */}
          <div>
            <label className="block text-xs font-medium text-[#888] mb-2 uppercase tracking-wider">Type</label>
            <div className="flex flex-wrap gap-2">
              {modes.map((m) => (
                <button
                  key={m.value}
                  onClick={() => { setMode(m.value); if (m.value !== 'wifi') setText(m.value === 'url' ? 'https://' : '') }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    mode === m.value ? 'bg-[#E85D20] text-white' : 'bg-[#1A1A1A] text-[#888] hover:text-white border border-[#2A2A2A]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content input */}
          <div>
            <label className="block text-xs font-medium text-[#888] mb-2 uppercase tracking-wider">Content</label>
            {mode === 'wifi' ? (
              <div className="space-y-3">
                <input
                  className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#E85D20]"
                  placeholder="Network name (SSID)"
                  value={wifi.ssid}
                  onChange={(e) => setWifi((p) => ({ ...p, ssid: e.target.value }))}
                />
                <input
                  className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#E85D20]"
                  placeholder="Password"
                  type="password"
                  value={wifi.password}
                  onChange={(e) => setWifi((p) => ({ ...p, password: e.target.value }))}
                />
                <select
                  className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E85D20]"
                  value={wifi.security}
                  onChange={(e) => setWifi((p) => ({ ...p, security: e.target.value as WifiConfig['security'] }))}
                >
                  <option value="WPA">WPA/WPA2</option>
                  <option value="WEP">WEP</option>
                  <option value="nopass">No password</option>
                </select>
              </div>
            ) : (
              <input
                className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#E85D20]"
                placeholder={placeholders[mode]}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            )}
          </div>

          {/* Size */}
          <div>
            <label className="block text-xs font-medium text-[#888] mb-2 uppercase tracking-wider">Size</label>
            <div className="flex gap-2">
              {SIZE_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    size === s ? 'bg-[#E85D20] text-white' : 'bg-[#1A1A1A] text-[#888] hover:text-white border border-[#2A2A2A]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#888] mb-2 uppercase tracking-wider">Foreground</label>
              <div className="flex items-center gap-2 bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2">
                <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer bg-transparent border-none" />
                <span className="text-sm text-[#888] font-mono">{fgColor}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#888] mb-2 uppercase tracking-wider">Background</label>
              <div className="flex items-center gap-2 bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2">
                <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer bg-transparent border-none" />
                <span className="text-sm text-[#888] font-mono">{bgColor}</span>
              </div>
            </div>
          </div>

          {/* Download buttons */}
          <div className="flex gap-3">
            <button
              onClick={downloadPng}
              className="flex-1 py-2.5 bg-[#E85D20] hover:bg-[#d45318] text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Download PNG
            </button>
            <button
              onClick={downloadSvg}
              className="flex-1 py-2.5 bg-[#1A1A1A] hover:bg-[#222] text-white text-sm font-semibold rounded-lg border border-[#2A2A2A] transition-colors"
            >
              Download SVG
            </button>
            <button
              onClick={copyContent}
              className="px-4 py-2.5 bg-[#1A1A1A] hover:bg-[#222] text-[#888] hover:text-white text-sm rounded-lg border border-[#2A2A2A] transition-colors"
              title="Copy content"
            >
              ⎘
            </button>
          </div>

          {/* Batch mode */}
          <div className="border border-[#2A2A2A] rounded-xl overflow-hidden">
            <button
              onClick={() => setBatchMode(!batchMode)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-[#888] hover:text-white hover:bg-[#1A1A1A] transition-colors"
            >
              <span className="font-medium">Batch mode — paste multiple URLs</span>
              <span className={`transition-transform ${batchMode ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {batchMode && (
              <div className="px-4 pb-4 space-y-3 border-t border-[#2A2A2A] pt-3">
                <textarea
                  className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#E85D20] resize-none"
                  placeholder="Paste one URL per line&#10;https://example.com&#10;https://another.com"
                  rows={5}
                  value={batchInput}
                  onChange={(e) => setBatchInput(e.target.value)}
                />
                <button
                  onClick={downloadBatch}
                  disabled={generating}
                  className="w-full py-2.5 bg-[#27AE60] hover:bg-[#229954] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {generating ? 'Generating...' : 'Generate & Download ZIP'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right — preview */}
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-2xl">
            <canvas ref={canvasRef} className="block rounded" style={{ width: 220, height: 220 }} />
          </div>
          <p className="text-xs text-[#444] text-center max-w-[220px] break-all">{content || '—'}</p>
        </div>
      </div>
    </div>
  )
}
