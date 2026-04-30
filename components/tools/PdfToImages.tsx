'use client'

import { useCallback, useState } from 'react'
import DropZone from '@/components/DropZone'
import { useToast } from '@/components/Toast'
import { downloadFile } from '@/lib/utils'

type ImgFormat = 'png' | 'jpeg'
type DPI = 72 | 150 | 300

interface PagePreview {
  pageNum: number
  dataUrl: string
  blob: Blob
}

const PDFJS_VERSION = '5.7.284'
const WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`

export default function PdfToImages() {
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [pages, setPages] = useState<PagePreview[]>([])
  const [format, setFormat] = useState<ImgFormat>('png')
  const [dpi, setDpi] = useState<DPI>(150)
  const [converting, setConverting] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFiles = useCallback((files: File[]) => {
    const pdf = files.find(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'))
    if (!pdf) { toast('Upload a PDF file', 'error'); return }
    setFile(pdf)
    setPages([])
  }, [toast])

  const convert = async () => {
    if (!file) return
    setConverting(true)
    setProgress(0)
    setPages([])

    try {
      const pdfjs = await import('pdfjs-dist')
      pdfjs.GlobalWorkerOptions.workerSrc = WORKER_URL

      const buf = await file.arrayBuffer()
      const pdf = await pdfjs.getDocument({ data: buf }).promise
      const total = pdf.numPages
      const scale = dpi / 96 // 96 = base CSS DPI assumed by pdfjs

      const previews: PagePreview[] = []

      for (let i = 1; i <= total; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        const ctx = canvas.getContext('2d')!

        await page.render({ canvas, canvasContext: ctx, viewport }).promise

        const mimeType = `image/${format}`
        const quality = format === 'jpeg' ? 0.92 : undefined
        const dataUrl = canvas.toDataURL(mimeType, quality)
        const blob = await new Promise<Blob>((res, rej) =>
          canvas.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), mimeType, quality)
        )

        previews.push({ pageNum: i, dataUrl, blob })
        setProgress(Math.round((i / total) * 100))
        setPages([...previews])
      }

      toast(`Converted ${total} page${total !== 1 ? 's' : ''}`)
    } catch (e) {
      console.error(e)
      toast('Failed to convert PDF', 'error')
    } finally {
      setConverting(false)
    }
  }

  const downloadSingle = (p: PagePreview) => {
    const ext = format === 'jpeg' ? 'jpg' : 'png'
    downloadFile(p.blob, `page-${p.pageNum}.${ext}`)
  }

  const downloadAll = async () => {
    if (!pages.length) return
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    const ext = format === 'jpeg' ? 'jpg' : 'png'
    pages.forEach(p => zip.file(`page-${p.pageNum}.${ext}`, p.blob))
    const blob = await zip.generateAsync({ type: 'blob' })
    downloadFile(blob, `${file?.name.replace('.pdf', '') ?? 'pages'}-images.zip`)
    toast('Downloaded all pages as ZIP')
  }

  const dpiOptions: DPI[] = [72, 150, 300]
  const formatOptions: { value: ImgFormat; label: string }[] = [
    { value: 'png', label: 'PNG' },
    { value: 'jpeg', label: 'JPG' },
  ]

  return (
    <div className="px-6 py-10 md:px-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="w-9 h-9 bg-[#2980B9]/20 rounded-lg flex items-center justify-center text-xl">📑</span>
          PDF → Images
        </h1>
        <p className="text-sm text-[#666] mt-1">Convert each PDF page to PNG or JPG</p>
      </div>

      <div className="space-y-6">
        {!file ? (
          <DropZone onFiles={handleFiles} accept=".pdf,application/pdf" multiple={false}
            label="Drop a PDF to convert" sublabel="PDF files only" />
        ) : (
          <div className="flex items-center gap-4 bg-[#111] border border-[#2A2A2A] rounded-xl px-4 py-3">
            <span className="text-2xl">📄</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{file.name}</p>
              <p className="text-xs text-[#555]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button onClick={() => { setFile(null); setPages([]) }}
              className="text-[#555] hover:text-red-400 text-lg">×</button>
          </div>
        )}

        {file && (
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Format */}
            <div>
              <label className="block text-xs font-medium text-[#888] mb-2 uppercase tracking-wider">Format</label>
              <div className="flex gap-2">
                {formatOptions.map(f => (
                  <button key={f.value} onClick={() => setFormat(f.value)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      format === f.value ? 'bg-[#E85D20] text-white' : 'bg-[#1A1A1A] text-[#888] hover:text-white border border-[#2A2A2A]'
                    }`}>{f.label}</button>
                ))}
              </div>
            </div>
            {/* DPI */}
            <div>
              <label className="block text-xs font-medium text-[#888] mb-2 uppercase tracking-wider">Quality (DPI)</label>
              <div className="flex gap-2">
                {dpiOptions.map(d => (
                  <button key={d} onClick={() => setDpi(d)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      dpi === d ? 'bg-[#E85D20] text-white' : 'bg-[#1A1A1A] text-[#888] hover:text-white border border-[#2A2A2A]'
                    }`}>{d}</button>
                ))}
              </div>
              <p className="text-xs text-[#444] mt-1">72 = screen, 150 = balanced, 300 = print</p>
            </div>
          </div>
        )}

        {file && !converting && !pages.length && (
          <button onClick={convert}
            className="w-full py-3 bg-[#E85D20] hover:bg-[#d94f14] text-white font-semibold rounded-xl transition-colors">
            Convert to Images
          </button>
        )}

        {converting && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#888]">Converting pages…</span>
              <span className="text-white">{progress}%</span>
            </div>
            <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
              <div className="h-full bg-[#E85D20] rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {pages.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#888]">{pages.length} page{pages.length !== 1 ? 's' : ''} converted</span>
              <div className="flex gap-2">
                <button onClick={() => { setFile(null); setPages([]) }}
                  className="px-3 py-1.5 text-xs rounded-lg bg-[#1A1A1A] text-[#888] hover:text-white border border-[#2A2A2A]">
                  New PDF
                </button>
                <button onClick={downloadAll}
                  className="px-3 py-1.5 text-xs rounded-lg bg-[#E85D20] hover:bg-[#d94f14] text-white font-semibold">
                  Download All ZIP
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {pages.map(p => (
                <button key={p.pageNum} onClick={() => downloadSingle(p)}
                  className="group relative bg-[#111] border border-[#2A2A2A] rounded-xl overflow-hidden hover:border-[#E85D20] transition-colors">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.dataUrl} alt={`Page ${p.pageNum}`} className="w-full object-contain" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">↓ Download</span>
                  </div>
                  <div className="px-2 py-1.5 text-center">
                    <span className="text-xs text-[#666]">Page {p.pageNum}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
