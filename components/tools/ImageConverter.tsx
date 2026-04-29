'use client'

import { useCallback, useState } from 'react'
import DropZone from '@/components/DropZone'
import { useToast } from '@/components/Toast'
import { formatBytes, downloadFile, stripExtension } from '@/lib/utils'
import { createZip } from '@/lib/zip'

type Format = 'jpeg' | 'png' | 'webp'

interface ImageItem {
  id: string
  file: File
  objectUrl: string
  outputBlob: Blob | null
  outputSize: number
  processing: boolean
  done: boolean
}

function generateId() {
  return Math.random().toString(36).slice(2)
}

async function convertImage(
  file: File,
  format: Format,
  quality: number,
  maxWidth: number | null,
  maxHeight: number | null,
): Promise<Blob> {
  const compression = await import('browser-image-compression')
  const options = {
    fileType: `image/${format}`,
    initialQuality: quality / 100,
    maxWidthOrHeight: maxWidth ?? maxHeight ?? undefined,
    useWebWorker: true,
  }
  const compressed = await compression.default(file, options)
  // Re-encode to requested format via canvas if needed
  const bitmap = await createImageBitmap(compressed)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0)
  return new Promise<Blob>((res, rej) => {
    canvas.toBlob((blob) => blob ? res(blob) : rej(new Error('toBlob failed')), `image/${format}`, quality / 100)
  })
}

export default function ImageConverter() {
  const { toast } = useToast()
  const [items, setItems] = useState<ImageItem[]>([])
  const [format, setFormat] = useState<Format>('webp')
  const [quality, setQuality] = useState(85)
  const [maxWidth, setMaxWidth] = useState('')
  const [maxHeight, setMaxHeight] = useState('')
  const [processing, setProcessing] = useState(false)

  const handleFiles = useCallback((files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/'))
    if (!images.length) { toast('No image files found', 'error'); return }
    const newItems: ImageItem[] = images.map((file) => ({
      id: generateId(),
      file,
      objectUrl: URL.createObjectURL(file),
      outputBlob: null,
      outputSize: 0,
      processing: false,
      done: false,
    }))
    setItems((prev) => [...prev, ...newItems])
  }, [toast])

  const removeItem = (id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id)
      if (item) URL.revokeObjectURL(item.objectUrl)
      return prev.filter((i) => i.id !== id)
    })
  }

  const processAll = async () => {
    if (!items.length) return
    setProcessing(true)
    const mw = maxWidth ? parseInt(maxWidth) : null
    const mh = maxHeight ? parseInt(maxHeight) : null

    const updated = [...items]
    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], processing: true }
      setItems([...updated])
      try {
        const blob = await convertImage(updated[i].file, format, quality, mw, mh)
        updated[i] = { ...updated[i], processing: false, done: true, outputBlob: blob, outputSize: blob.size }
      } catch (e) {
        console.error(e)
        updated[i] = { ...updated[i], processing: false }
        toast(`Failed: ${updated[i].file.name}`, 'error')
      }
      setItems([...updated])
    }
    setProcessing(false)
    toast('All images converted!')
  }

  const downloadSingle = (item: ImageItem) => {
    if (!item.outputBlob) return
    downloadFile(item.outputBlob, `${stripExtension(item.file.name)}.${format}`)
  }

  const downloadAll = async () => {
    const done = items.filter((i) => i.outputBlob)
    if (!done.length) { toast('Nothing to download yet', 'error'); return }
    const files = done.map((i) => ({
      name: `${stripExtension(i.file.name)}.${format}`,
      blob: i.outputBlob!,
    }))
    const zip = await createZip(files)
    downloadFile(zip, `toolbox-images.zip`)
    toast(`Downloaded ${files.length} images`)
  }

  const doneCount = items.filter((i) => i.done).length

  const formats: { value: Format; label: string }[] = [
    { value: 'webp', label: 'WebP' },
    { value: 'jpeg', label: 'JPG' },
    { value: 'png', label: 'PNG' },
  ]

  return (
    <div className="px-6 py-10 md:px-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="w-9 h-9 bg-[#E85D20]/20 rounded-lg flex items-center justify-center text-xl">🖼</span>
          Image Converter
        </h1>
        <p className="text-sm text-[#666] mt-1">Convert, compress & resize images — batch download as ZIP</p>
      </div>

      <div className="grid lg:grid-cols-[300px_1fr] gap-8">
        {/* Settings panel */}
        <div className="space-y-5">
          {/* Format */}
          <div>
            <label className="block text-xs font-medium text-[#888] mb-2 uppercase tracking-wider">Output format</label>
            <div className="flex gap-2">
              {formats.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFormat(f.value)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    format === f.value ? 'bg-[#E85D20] text-white' : 'bg-[#1A1A1A] text-[#888] hover:text-white border border-[#2A2A2A]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quality */}
          <div>
            <label className="block text-xs font-medium text-[#888] mb-2 uppercase tracking-wider">
              Quality: <span className="text-white">{quality}%</span>
            </label>
            <input
              type="range"
              min={10}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-[#E85D20]"
            />
            <div className="flex justify-between text-xs text-[#444] mt-1">
              <span>Smaller</span><span>Best</span>
            </div>
          </div>

          {/* Resize */}
          <div>
            <label className="block text-xs font-medium text-[#888] mb-2 uppercase tracking-wider">Resize (optional)</label>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <input
                  type="number"
                  placeholder="Max W"
                  value={maxWidth}
                  onChange={(e) => setMaxWidth(e.target.value)}
                  className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#E85D20]"
                />
                <span className="absolute right-2 top-2.5 text-xs text-[#444]">px</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  placeholder="Max H"
                  value={maxHeight}
                  onChange={(e) => setMaxHeight(e.target.value)}
                  className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#E85D20]"
                />
                <span className="absolute right-2 top-2.5 text-xs text-[#444]">px</span>
              </div>
            </div>
            <p className="text-[10px] text-[#444] mt-1">Constrains longest side while maintaining aspect ratio</p>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <button
              onClick={processAll}
              disabled={!items.length || processing}
              className="w-full py-3 bg-[#E85D20] hover:bg-[#d45318] disabled:opacity-40 text-white font-semibold rounded-lg transition-colors"
            >
              {processing ? 'Converting...' : `Convert ${items.length} Image${items.length !== 1 ? 's' : ''}`}
            </button>
            {doneCount > 0 && (
              <button
                onClick={downloadAll}
                className="w-full py-2.5 bg-[#1A1A1A] hover:bg-[#222] text-white text-sm font-semibold rounded-lg border border-[#2A2A2A] transition-colors"
              >
                Download All as ZIP ({doneCount})
              </button>
            )}
          </div>
        </div>

        {/* Right — drop zone + file list */}
        <div className="space-y-4">
          <DropZone
            onFiles={handleFiles}
            accept="image/*"
            multiple
            label="Drop images or click to browse"
            sublabel="PNG, JPG, WebP, AVIF — multiple files supported"
          />

          {items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[#555]">{items.length} file{items.length !== 1 ? 's' : ''} queued</span>
                <button
                  onClick={() => setItems([])}
                  className="text-xs text-[#555] hover:text-[#888] transition-colors"
                >
                  Clear all
                </button>
              </div>

              {items.map((item) => {
                const savings = item.done
                  ? Math.round((1 - item.outputSize / item.file.size) * 100)
                  : null

                return (
                  <div key={item.id} className="flex items-center gap-3 bg-[#111] border border-[#2A2A2A] rounded-xl p-3">
                    {/* Thumbnail */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.objectUrl}
                      alt={item.file.name}
                      className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate font-medium">{item.file.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[#555]">{formatBytes(item.file.size)}</span>
                        {item.done && (
                          <>
                            <span className="text-xs text-[#333]">→</span>
                            <span className="text-xs text-white">{formatBytes(item.outputSize)}</span>
                            {savings !== null && savings > 0 && (
                              <span className="text-[10px] text-green-400 font-medium">−{savings}%</span>
                            )}
                            {savings !== null && savings < 0 && (
                              <span className="text-[10px] text-yellow-500 font-medium">+{Math.abs(savings)}%</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status + actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.processing && (
                        <div className="w-4 h-4 border-2 border-[#E85D20] border-t-transparent rounded-full animate-spin" />
                      )}
                      {item.done && (
                        <>
                          <span className="text-green-400 text-sm">✓</span>
                          <button
                            onClick={() => downloadSingle(item)}
                            className="text-xs text-[#E85D20] hover:text-[#ff6b2b] transition-colors font-medium"
                          >
                            ↓
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-xs text-[#444] hover:text-[#888] transition-colors ml-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
