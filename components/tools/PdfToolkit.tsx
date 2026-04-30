'use client'

import { useCallback, useState } from 'react'
import DropZone from '@/components/DropZone'
import { useToast } from '@/components/Toast'
import { downloadFile, formatBytes, pdfBytesToBlob } from '@/lib/utils'

type Mode = 'merge' | 'split' | 'compress'

interface PdfFile {
  id: string
  file: File
  pageCount: number | null
}

function uid() { return Math.random().toString(36).slice(2) }

export default function PdfToolkit() {
  const { toast } = useToast()
  const [mode, setMode] = useState<Mode>('merge')
  const [files, setFiles] = useState<PdfFile[]>([])
  const [processing, setProcessing] = useState(false)

  // Split options
  const [splitMode, setSplitMode] = useState<'range' | 'all'>('all')
  const [splitRange, setSplitRange] = useState('')

  const handleFiles = useCallback(async (newFiles: File[]) => {
    const pdfs = newFiles.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'))
    if (!pdfs.length) { toast('Please upload PDF files', 'error'); return }

    const { PDFDocument } = await import('pdf-lib')
    const items: PdfFile[] = await Promise.all(pdfs.map(async (file) => {
      try {
        const buf = await file.arrayBuffer()
        const doc = await PDFDocument.load(buf, { ignoreEncryption: true })
        return { id: uid(), file, pageCount: doc.getPageCount() }
      } catch {
        return { id: uid(), file, pageCount: null }
      }
    }))
    setFiles(prev => [...prev, ...items])
  }, [toast])

  const remove = (id: string) => setFiles(prev => prev.filter(f => f.id !== id))

  const moveUp = (idx: number) => {
    if (idx === 0) return
    setFiles(prev => { const a = [...prev]; [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; return a })
  }
  const moveDown = (idx: number) => {
    setFiles(prev => {
      if (idx === prev.length - 1) return prev
      const a = [...prev]; [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; return a
    })
  }

  // ── Merge ──
  const merge = async () => {
    if (files.length < 2) { toast('Add at least 2 PDFs to merge', 'error'); return }
    setProcessing(true)
    try {
      const { PDFDocument } = await import('pdf-lib')
      const merged = await PDFDocument.create()
      for (const item of files) {
        const buf = await item.file.arrayBuffer()
        const doc = await PDFDocument.load(buf, { ignoreEncryption: true })
        const pages = await merged.copyPages(doc, doc.getPageIndices())
        pages.forEach(p => merged.addPage(p))
      }
      const bytes = await merged.save()
      downloadFile(pdfBytesToBlob(bytes), 'merged.pdf')
      toast('Merged PDF downloaded')
    } catch (e) {
      console.error(e)
      toast('Failed to merge PDFs', 'error')
    } finally { setProcessing(false) }
  }

  // ── Split ──
  const split = async () => {
    if (!files.length) { toast('Upload a PDF first', 'error'); return }
    setProcessing(true)
    try {
      const { PDFDocument } = await import('pdf-lib')
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      for (const item of files) {
        const buf = await item.file.arrayBuffer()
        const src = await PDFDocument.load(buf, { ignoreEncryption: true })
        const total = src.getPageCount()
        const baseName = item.file.name.replace(/\.pdf$/i, '')

        let pageIndices: number[][]

        if (splitMode === 'all') {
          // Each page → its own PDF
          pageIndices = Array.from({ length: total }, (_, i) => [i])
        } else {
          // Parse range string: "1-3, 5, 7-9"
          const parsed: number[] = []
          for (const part of splitRange.split(',')) {
            const t = part.trim()
            const m = t.match(/^(\d+)-(\d+)$/)
            if (m) {
              for (let i = parseInt(m[1]); i <= parseInt(m[2]); i++) parsed.push(i - 1)
            } else if (/^\d+$/.test(t)) {
              parsed.push(parseInt(t) - 1)
            }
          }
          if (!parsed.length) { toast('Invalid page range', 'error'); setProcessing(false); return }
          pageIndices = [parsed.filter(i => i >= 0 && i < total)]
        }

        for (let g = 0; g < pageIndices.length; g++) {
          const out = await PDFDocument.create()
          const copied = await out.copyPages(src, pageIndices[g])
          copied.forEach(p => out.addPage(p))
          const bytes = await out.save()
          const label = splitMode === 'all'
            ? `${baseName}_p${pageIndices[g][0] + 1}.pdf`
            : `${baseName}_split.pdf`
          zip.file(label, bytes)
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      downloadFile(blob, 'split-pages.zip')
      toast('Split pages downloaded as ZIP')
    } catch (e) {
      console.error(e)
      toast('Failed to split PDF', 'error')
    } finally { setProcessing(false) }
  }

  // ── Compress ──
  const compress = async () => {
    if (!files.length) { toast('Upload a PDF first', 'error'); return }
    setProcessing(true)
    try {
      const { PDFDocument } = await import('pdf-lib')
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      for (const item of files) {
        const buf = await item.file.arrayBuffer()
        const src = await PDFDocument.load(buf, { ignoreEncryption: true })

        // Strip metadata
        src.setTitle('')
        src.setAuthor('')
        src.setSubject('')
        src.setKeywords([])
        src.setProducer('')
        src.setCreator('')

        const bytes = await src.save({ useObjectStreams: true })
        const name = item.file.name.replace(/\.pdf$/i, '_compressed.pdf')
        zip.file(name, bytes)
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      if (files.length === 1) {
        const item = files[0]
        const buf = await item.file.arrayBuffer()
        const src = await (await import('pdf-lib')).PDFDocument.load(buf, { ignoreEncryption: true })
        src.setTitle(''); src.setAuthor(''); src.setSubject(''); src.setKeywords([]); src.setProducer(''); src.setCreator('')
        const bytes = await src.save({ useObjectStreams: true })
        downloadFile(pdfBytesToBlob(bytes), item.file.name.replace(/\.pdf$/i, '_compressed.pdf'))
      } else {
        downloadFile(blob, 'compressed-pdfs.zip')
      }
      toast('Compressed PDF downloaded')
    } catch (e) {
      console.error(e)
      toast('Failed to compress PDF', 'error')
    } finally { setProcessing(false) }
  }

  const handleAction = () => {
    if (mode === 'merge') merge()
    else if (mode === 'split') split()
    else compress()
  }

  const actionLabel = processing
    ? 'Processing…'
    : mode === 'merge' ? `Merge ${files.length} PDFs`
    : mode === 'split' ? 'Split & Download ZIP'
    : `Compress ${files.length} PDF${files.length !== 1 ? 's' : ''}`

  const modes: { value: Mode; label: string; icon: string }[] = [
    { value: 'merge', label: 'Merge', icon: '⊕' },
    { value: 'split', label: 'Split', icon: '✂' },
    { value: 'compress', label: 'Compress', icon: '⬛' },
  ]

  return (
    <div className="px-6 py-10 md:px-10 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="w-9 h-9 bg-[#E74C3C]/20 rounded-lg flex items-center justify-center text-xl">📄</span>
          PDF Toolkit
        </h1>
        <p className="text-sm text-[#666] mt-1">Merge, split & compress PDFs — all client-side</p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-6">
        {modes.map(m => (
          <button key={m.value} onClick={() => { setMode(m.value); setFiles([]) }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === m.value ? 'bg-[#E85D20] text-white' : 'bg-[#1A1A1A] text-[#888] hover:text-white border border-[#2A2A2A]'
            }`}>
            <span>{m.icon}</span>{m.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <DropZone
          onFiles={handleFiles}
          accept=".pdf,application/pdf"
          multiple={mode !== 'split'}
          label={mode === 'merge' ? 'Drop PDFs to merge (order matters)' : mode === 'split' ? 'Drop a PDF to split' : 'Drop PDFs to compress'}
          sublabel="PDF files only"
        />

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#555]">{files.length} file{files.length !== 1 ? 's' : ''}</span>
              <button onClick={() => setFiles([])} className="text-xs text-[#555] hover:text-[#888]">Clear all</button>
            </div>
            {files.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3 bg-[#111] border border-[#2A2A2A] rounded-xl px-4 py-3">
                <span className="text-xl">📄</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{item.file.name}</p>
                  <p className="text-xs text-[#555] mt-0.5">
                    {formatBytes(item.file.size)}
                    {item.pageCount !== null && <span className="ml-2">· {item.pageCount} page{item.pageCount !== 1 ? 's' : ''}</span>}
                  </p>
                </div>
                {mode === 'merge' && (
                  <div className="flex gap-1">
                    <button onClick={() => moveUp(idx)} disabled={idx === 0}
                      className="w-6 h-6 text-xs text-[#666] hover:text-white disabled:opacity-20 flex items-center justify-center">▲</button>
                    <button onClick={() => moveDown(idx)} disabled={idx === files.length - 1}
                      className="w-6 h-6 text-xs text-[#666] hover:text-white disabled:opacity-20 flex items-center justify-center">▼</button>
                  </div>
                )}
                <button onClick={() => remove(item.id)} className="text-[#444] hover:text-red-400 text-lg leading-none">×</button>
              </div>
            ))}
          </div>
        )}

        {/* Split options */}
        {mode === 'split' && files.length > 0 && (
          <div className="bg-[#111] border border-[#2A2A2A] rounded-xl p-4 space-y-3">
            <label className="block text-xs font-medium text-[#888] uppercase tracking-wider">Split mode</label>
            <div className="flex gap-2">
              <button onClick={() => setSplitMode('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${splitMode === 'all' ? 'bg-[#E85D20] text-white' : 'bg-[#1A1A1A] text-[#888] border border-[#2A2A2A]'}`}>
                Every page
              </button>
              <button onClick={() => setSplitMode('range')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${splitMode === 'range' ? 'bg-[#E85D20] text-white' : 'bg-[#1A1A1A] text-[#888] border border-[#2A2A2A]'}`}>
                Page range
              </button>
            </div>
            {splitMode === 'range' && (
              <div>
                <input
                  className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#E85D20]"
                  placeholder="e.g. 1-3, 5, 7-9"
                  value={splitRange}
                  onChange={e => setSplitRange(e.target.value)}
                />
                <p className="text-xs text-[#444] mt-1">Extracts specified pages into one PDF</p>
              </div>
            )}
          </div>
        )}

        {files.length > 0 && (
          <button
            onClick={handleAction}
            disabled={processing || (mode === 'merge' && files.length < 2)}
            className="w-full py-3 bg-[#E85D20] hover:bg-[#d94f14] disabled:opacity-40 text-white font-semibold rounded-xl transition-colors"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}
