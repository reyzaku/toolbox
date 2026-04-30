'use client'

import { useCallback, useState } from 'react'
import DropZone from '@/components/DropZone'
import { useToast } from '@/components/Toast'
import { downloadFile, formatBytes, stripExtension, pdfBytesToBlob } from '@/lib/utils'

type PageSize = 'a4' | 'letter' | 'fit'
type Margin = 'none' | 'small' | 'medium' | 'large'

interface ImgItem {
  id: string
  file: File
  objectUrl: string
  width: number
  height: number
}

// mm → PDF points (1 pt = 0.352778 mm)
const mmToPt = (mm: number) => mm * (72 / 25.4)

const PAGE_SIZES: Record<PageSize, [number, number]> = {
  a4:     [mmToPt(210), mmToPt(297)],
  letter: [mmToPt(215.9), mmToPt(279.4)],
  fit:    [0, 0], // calculated per-image
}

const MARGINS: Record<Margin, number> = {
  none:   0,
  small:  mmToPt(10),
  medium: mmToPt(20),
  large:  mmToPt(30),
}

function uid() { return Math.random().toString(36).slice(2) }

export default function ImageToPdf() {
  const { toast } = useToast()
  const [items, setItems] = useState<ImgItem[]>([])
  const [pageSize, setPageSize] = useState<PageSize>('a4')
  const [margin, setMargin] = useState<Margin>('small')
  const [processing, setProcessing] = useState(false)

  const handleFiles = useCallback((files: File[]) => {
    const imgs = files.filter(f => f.type.startsWith('image/'))
    if (!imgs.length) { toast('No image files found', 'error'); return }
    const newItems: ImgItem[] = []
    let pending = imgs.length
    imgs.forEach(file => {
      const objectUrl = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        newItems.push({ id: uid(), file, objectUrl, width: img.naturalWidth, height: img.naturalHeight })
        pending--
        if (pending === 0) setItems(prev => [...prev, ...newItems])
      }
      img.src = objectUrl
    })
  }, [toast])

  const remove = (id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id)
      if (item) URL.revokeObjectURL(item.objectUrl)
      return prev.filter(i => i.id !== id)
    })
  }

  const moveUp = (idx: number) => {
    if (idx === 0) return
    setItems(prev => { const a = [...prev]; [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; return a })
  }
  const moveDown = (idx: number) => {
    setItems(prev => {
      if (idx >= prev.length - 1) return prev
      const a = [...prev]; [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; return a
    })
  }

  const convert = async () => {
    if (!items.length) return
    setProcessing(true)
    try {
      const { PDFDocument, rgb } = await import('pdf-lib')
      const doc = await PDFDocument.create()
      const m = MARGINS[margin]

      for (const item of items) {
        // Load image bytes
        const buf = await item.file.arrayBuffer()
        let pdfImg
        const mime = item.file.type
        if (mime === 'image/jpeg' || mime === 'image/jpg') {
          pdfImg = await doc.embedJpg(buf)
        } else {
          // PNG or WebP — canvas-convert to PNG first
          const bitmap = await createImageBitmap(new Blob([buf], { type: mime }))
          const canvas = document.createElement('canvas')
          canvas.width = bitmap.width
          canvas.height = bitmap.height
          canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
          const pngBuf = await new Promise<ArrayBuffer>((res, rej) =>
            canvas.toBlob(b => b ? res(b.arrayBuffer()) : rej(), 'image/png')
          )
          pdfImg = await doc.embedPng(await pngBuf)
        }

        const imgW = pdfImg.width
        const imgH = pdfImg.height

        let pageW: number, pageH: number
        if (pageSize === 'fit') {
          pageW = imgW + m * 2
          pageH = imgH + m * 2
        } else {
          [pageW, pageH] = PAGE_SIZES[pageSize]
          // Rotate page to landscape if image is wider than tall and page is portrait
          if (imgW > imgH && pageW < pageH) [pageW, pageH] = [pageH, pageW]
        }

        const page = doc.addPage([pageW, pageH])

        // Scale image to fit within margins
        const maxW = pageW - m * 2
        const maxH = pageH - m * 2
        const scale = Math.min(maxW / imgW, maxH / imgH, 1)
        const drawW = imgW * scale
        const drawH = imgH * scale
        const x = (pageW - drawW) / 2
        const y = (pageH - drawH) / 2

        page.drawImage(pdfImg, { x, y, width: drawW, height: drawH })
        void rgb // suppress unused
      }

      const bytes = await doc.save()
      const name = items.length === 1 ? `${stripExtension(items[0].file.name)}.pdf` : 'images.pdf'
      downloadFile(pdfBytesToBlob(bytes), name)
      toast('PDF downloaded')
    } catch (e) {
      console.error(e)
      toast('Failed to create PDF', 'error')
    } finally { setProcessing(false) }
  }

  const pageSizes: { value: PageSize; label: string }[] = [
    { value: 'a4', label: 'A4' },
    { value: 'letter', label: 'Letter' },
    { value: 'fit', label: 'Fit to image' },
  ]
  const margins: { value: Margin; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
  ]

  return (
    <div className="px-6 py-10 md:px-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="w-9 h-9 bg-[#F39C12]/20 rounded-lg flex items-center justify-center text-xl">📁</span>
          Images → PDF
        </h1>
        <p className="text-sm text-[#666] mt-1">Combine multiple images into a single PDF</p>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-8">
        {/* Settings */}
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-[#888] mb-2 uppercase tracking-wider">Page size</label>
            <div className="space-y-1.5">
              {pageSizes.map(s => (
                <button key={s.value} onClick={() => setPageSize(s.value)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pageSize === s.value ? 'bg-[#E85D20] text-white' : 'bg-[#1A1A1A] text-[#888] hover:text-white border border-[#2A2A2A]'
                  }`}>{s.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#888] mb-2 uppercase tracking-wider">Margin</label>
            <div className="grid grid-cols-2 gap-1.5">
              {margins.map(m => (
                <button key={m.value} onClick={() => setMargin(m.value)}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                    margin === m.value ? 'bg-[#E85D20] text-white' : 'bg-[#1A1A1A] text-[#888] hover:text-white border border-[#2A2A2A]'
                  }`}>{m.label}</button>
              ))}
            </div>
          </div>

          {items.length > 0 && (
            <button onClick={convert} disabled={processing}
              className="w-full py-3 bg-[#E85D20] hover:bg-[#d94f14] disabled:opacity-40 text-white font-semibold rounded-xl transition-colors">
              {processing ? 'Building PDF…' : `Create PDF (${items.length} image${items.length !== 1 ? 's' : ''})`}
            </button>
          )}
        </div>

        {/* Drop zone + image list */}
        <div className="space-y-4">
          <DropZone
            onFiles={handleFiles}
            accept="image/*"
            multiple
            label="Drop images here — drag to reorder"
            sublabel="JPG, PNG, WebP supported"
          />

          {items.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#555]">{items.length} image{items.length !== 1 ? 's' : ''} — drag rows to reorder</span>
                <button onClick={() => setItems([])} className="text-xs text-[#555] hover:text-[#888]">Clear all</button>
              </div>
              {items.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-3 bg-[#111] border border-[#2A2A2A] rounded-xl p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.objectUrl} alt={item.file.name}
                    className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{item.file.name}</p>
                    <p className="text-xs text-[#555]">{formatBytes(item.file.size)} · {item.width}×{item.height}</p>
                  </div>
                  <div className="flex gap-1 items-center">
                    <button onClick={() => moveUp(idx)} disabled={idx === 0}
                      className="w-6 h-6 text-xs text-[#666] hover:text-white disabled:opacity-20 flex items-center justify-center">▲</button>
                    <button onClick={() => moveDown(idx)} disabled={idx === items.length - 1}
                      className="w-6 h-6 text-xs text-[#666] hover:text-white disabled:opacity-20 flex items-center justify-center">▼</button>
                    <button onClick={() => remove(item.id)} className="text-[#444] hover:text-red-400 text-lg leading-none ml-1">×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
