'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/components/Toast'
import { downloadFile, pdfBytesToBlob } from '@/lib/utils'

interface LineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
}

interface InvoiceData {
  fromName: string
  fromEmail: string
  fromAddress: string
  clientName: string
  clientEmail: string
  clientAddress: string
  invoiceNumber: string
  issueDate: string
  dueDate: string
  currency: string
  taxRate: number
  notes: string
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'IDR', 'SGD', 'AUD', 'JPY', 'CNY']

const STORAGE_KEY = 'toolbox-invoice-data'

function uid() { return Math.random().toString(36).slice(2) }

function emptyItem(): LineItem {
  return { id: uid(), description: '', quantity: 1, unitPrice: 0 }
}

function defaultData(): InvoiceData {
  const today = new Date()
  const due = new Date(today)
  due.setDate(due.getDate() + 30)
  return {
    fromName: '', fromEmail: '', fromAddress: '',
    clientName: '', clientEmail: '', clientAddress: '',
    invoiceNumber: `INV-${String(today.getFullYear()).slice(2)}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-001`,
    issueDate: today.toISOString().slice(0, 10),
    dueDate: due.toISOString().slice(0, 10),
    currency: 'USD',
    taxRate: 0,
    notes: '',
  }
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

export default function InvoiceGenerator() {
  const { toast } = useToast()
  const [data, setData] = useState<InvoiceData>(defaultData)
  const [items, setItems] = useState<LineItem[]>([emptyItem()])
  const [generating, setGenerating] = useState(false)

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const { data: d, items: it } = JSON.parse(saved)
        if (d) setData(d)
        if (it) setItems(it)
      }
    } catch { /* ignore */ }
  }, [])

  // Save to localStorage on change
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, items })) } catch { /* ignore */ }
  }, [data, items])

  const set = <K extends keyof InvoiceData>(key: K, value: InvoiceData[K]) =>
    setData(prev => ({ ...prev, [key]: value }))

  const updateItem = (id: string, patch: Partial<LineItem>) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))

  const addItem = () => setItems(prev => [...prev, emptyItem()])
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id))

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
  const taxAmount = subtotal * (data.taxRate / 100)
  const total = subtotal + taxAmount

  const generate = async () => {
    if (!data.fromName.trim()) { toast('Add your name/company', 'error'); return }
    if (!data.clientName.trim()) { toast('Add client name', 'error'); return }
    if (!items.some(i => i.description.trim())) { toast('Add at least one line item', 'error'); return }

    setGenerating(true)
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib')
      const doc = await PDFDocument.create()
      const page = doc.addPage([595, 842]) // A4
      const { width, height } = page.getSize()

      const bold = await doc.embedFont(StandardFonts.HelveticaBold)
      const regular = await doc.embedFont(StandardFonts.Helvetica)

      const accent = rgb(0.91, 0.365, 0.125) // #E85D20
      const dark   = rgb(0.05, 0.05, 0.05)
      const mid    = rgb(0.45, 0.45, 0.45)
      const light  = rgb(0.93, 0.93, 0.93)
      const white  = rgb(1, 1, 1)

      const margin = 50
      let y = height - margin

      // ── Header bar ──
      page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: dark })
      page.drawText('INVOICE', { x: margin, y: height - 52, size: 28, font: bold, color: white })
      page.drawText(`#${data.invoiceNumber}`, { x: margin, y: height - 68, size: 11, font: regular, color: rgb(0.6, 0.6, 0.6) })

      // Accent stripe
      page.drawRectangle({ x: width - 6, y: 0, width: 6, height, color: accent })

      y = height - 100

      // ── From / To ──
      const col2 = width / 2 + 10

      // FROM
      page.drawText('FROM', { x: margin, y, size: 8, font: bold, color: accent })
      y -= 16
      page.drawText(data.fromName, { x: margin, y, size: 12, font: bold, color: dark })
      y -= 14
      if (data.fromEmail) { page.drawText(data.fromEmail, { x: margin, y, size: 9, font: regular, color: mid }); y -= 12 }
      if (data.fromAddress) {
        data.fromAddress.split('\n').forEach(line => {
          page.drawText(line, { x: margin, y, size: 9, font: regular, color: mid }); y -= 12
        })
      }

      // TO (right side)
      let yTo = height - 100
      page.drawText('BILL TO', { x: col2, y: yTo, size: 8, font: bold, color: accent })
      yTo -= 16
      page.drawText(data.clientName, { x: col2, y: yTo, size: 12, font: bold, color: dark })
      yTo -= 14
      if (data.clientEmail) { page.drawText(data.clientEmail, { x: col2, y: yTo, size: 9, font: regular, color: mid }); yTo -= 12 }
      if (data.clientAddress) {
        data.clientAddress.split('\n').forEach(line => {
          page.drawText(line, { x: col2, y: yTo, size: 9, font: regular, color: mid }); yTo -= 12
        })
      }

      y = Math.min(y, yTo) - 24

      // ── Dates row ──
      const dateBoxW = (width - margin * 2 - 20) / 3
      const dateFields = [
        { label: 'Issue Date', value: data.issueDate },
        { label: 'Due Date', value: data.dueDate },
        { label: 'Currency', value: data.currency },
      ]
      dateFields.forEach((f, i) => {
        const x = margin + i * (dateBoxW + 10)
        page.drawRectangle({ x, y: y - 32, width: dateBoxW, height: 36, color: light, borderColor: rgb(0.88, 0.88, 0.88), borderWidth: 0.5 })
        page.drawText(f.label.toUpperCase(), { x: x + 8, y: y - 10, size: 7, font: bold, color: mid })
        page.drawText(f.value, { x: x + 8, y: y - 24, size: 10, font: bold, color: dark })
      })
      y -= 56

      // ── Line items table ──
      const cols = { desc: margin, qty: width - 200, unit: width - 130, total: width - 60 }

      // Header
      page.drawRectangle({ x: margin, y: y - 20, width: width - margin * 2, height: 22, color: dark })
      page.drawText('DESCRIPTION', { x: cols.desc + 6, y: y - 13, size: 8, font: bold, color: white })
      page.drawText('QTY', { x: cols.qty, y: y - 13, size: 8, font: bold, color: white })
      page.drawText('UNIT', { x: cols.unit, y: y - 13, size: 8, font: bold, color: white })
      page.drawText('TOTAL', { x: cols.total - 20, y: y - 13, size: 8, font: bold, color: white })
      y -= 24

      // Rows
      const validItems = items.filter(i => i.description.trim())
      validItems.forEach((item, idx) => {
        const rowColor = idx % 2 === 0 ? white : light
        const lineTotal = item.quantity * item.unitPrice
        page.drawRectangle({ x: margin, y: y - 18, width: width - margin * 2, height: 20, color: rowColor })

        // Truncate long descriptions
        const desc = item.description.length > 55 ? item.description.slice(0, 52) + '…' : item.description
        page.drawText(desc, { x: cols.desc + 6, y: y - 11, size: 9, font: regular, color: dark })
        page.drawText(String(item.quantity), { x: cols.qty, y: y - 11, size: 9, font: regular, color: dark })
        page.drawText(formatCurrency(item.unitPrice, data.currency), { x: cols.unit - 20, y: y - 11, size: 9, font: regular, color: dark })
        page.drawText(formatCurrency(lineTotal, data.currency), { x: cols.total - 40, y: y - 11, size: 9, font: bold, color: dark })
        y -= 20
      })

      y -= 10

      // ── Totals ──
      const totW = 200
      const totX = width - margin - totW

      const drawTotalRow = (label: string, value: string, isBold = false, bg?: ReturnType<typeof rgb>) => {
        if (bg) page.drawRectangle({ x: totX - 10, y: y - 16, width: totW + 10, height: 20, color: bg })
        page.drawText(label, { x: totX, y: y - 10, size: 9, font: isBold ? bold : regular, color: isBold ? white : mid })
        page.drawText(value, { x: totX + totW - 60, y: y - 10, size: 9, font: isBold ? bold : regular, color: isBold ? white : dark })
        y -= 20
      }

      drawTotalRow('Subtotal', formatCurrency(subtotal, data.currency))
      if (data.taxRate > 0) drawTotalRow(`Tax (${data.taxRate}%)`, formatCurrency(taxAmount, data.currency))
      drawTotalRow('TOTAL DUE', formatCurrency(total, data.currency), true, accent)

      // ── Notes ──
      if (data.notes.trim()) {
        y -= 24
        page.drawText('NOTES', { x: margin, y, size: 8, font: bold, color: accent })
        y -= 14
        data.notes.split('\n').slice(0, 5).forEach(line => {
          page.drawText(line, { x: margin, y, size: 9, font: regular, color: mid }); y -= 13
        })
      }

      // ── Footer ──
      page.drawRectangle({ x: 0, y: 0, width, height: 32, color: dark })
      page.drawText('Thank you for your business.', { x: margin, y: 11, size: 9, font: regular, color: rgb(0.6, 0.6, 0.6) })
      page.drawText(data.fromName, { x: width - margin - bold.widthOfTextAtSize(data.fromName, 9), y: 11, size: 9, font: bold, color: rgb(0.7, 0.7, 0.7) })

      const bytes = await doc.save()
      downloadFile(pdfBytesToBlob(bytes), `invoice-${data.invoiceNumber}.pdf`)
      toast('Invoice downloaded')
    } catch (e) {
      console.error(e)
      toast('Failed to generate invoice', 'error')
    } finally { setGenerating(false) }
  }

  return (
    <div className="px-6 py-10 md:px-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="w-9 h-9 bg-[#1ABC9C]/20 rounded-lg flex items-center justify-center text-xl">🧾</span>
          Invoice Generator
        </h1>
        <p className="text-sm text-[#666] mt-1">Create professional PDF invoices — saved automatically in your browser</p>
      </div>

      <div className="space-y-6">
        {/* From / To */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Section title="Your Details">
            <Field label="Name / Company" value={data.fromName} onChange={v => set('fromName', v)} placeholder="Acme Studio" />
            <Field label="Email" value={data.fromEmail} onChange={v => set('fromEmail', v)} placeholder="hello@acme.com" />
            <Field label="Address" value={data.fromAddress} onChange={v => set('fromAddress', v)} placeholder="123 Main St, City" multiline />
          </Section>
          <Section title="Client Details">
            <Field label="Client Name" value={data.clientName} onChange={v => set('clientName', v)} placeholder="Client Corp" />
            <Field label="Client Email" value={data.clientEmail} onChange={v => set('clientEmail', v)} placeholder="billing@client.com" />
            <Field label="Client Address" value={data.clientAddress} onChange={v => set('clientAddress', v)} placeholder="456 Park Ave, City" multiline />
          </Section>
        </div>

        {/* Invoice meta */}
        <Section title="Invoice Details">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Field label="Invoice #" value={data.invoiceNumber} onChange={v => set('invoiceNumber', v)} placeholder="INV-001" />
            <Field label="Issue Date" value={data.issueDate} onChange={v => set('issueDate', v)} type="date" />
            <Field label="Due Date" value={data.dueDate} onChange={v => set('dueDate', v)} type="date" />
            <div>
              <label className="block text-xs text-[#888] mb-1.5">Currency</label>
              <select value={data.currency} onChange={e => set('currency', e.target.value)}
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E85D20]">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </Section>

        {/* Line items */}
        <Section title="Line Items">
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-[1fr_80px_110px_40px] gap-2 px-1">
              <span className="text-xs text-[#555]">Description</span>
              <span className="text-xs text-[#555]">Qty</span>
              <span className="text-xs text-[#555]">Unit Price</span>
              <span />
            </div>
            {items.map(item => (
              <div key={item.id} className="grid grid-cols-[1fr_80px_110px_40px] gap-2 items-center">
                <input
                  value={item.description}
                  onChange={e => updateItem(item.id, { description: e.target.value })}
                  placeholder="Service or product description"
                  className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#E85D20]"
                />
                <input
                  type="number" min={1} value={item.quantity}
                  onChange={e => updateItem(item.id, { quantity: Math.max(0, Number(e.target.value)) })}
                  className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E85D20]"
                />
                <input
                  type="number" min={0} step={0.01} value={item.unitPrice}
                  onChange={e => updateItem(item.id, { unitPrice: Math.max(0, Number(e.target.value)) })}
                  className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E85D20]"
                />
                <button onClick={() => removeItem(item.id)} disabled={items.length === 1}
                  className="text-[#444] hover:text-red-400 text-xl disabled:opacity-20">×</button>
              </div>
            ))}
            <button onClick={addItem}
              className="text-sm text-[#E85D20] hover:text-[#ff6b2b] transition-colors">
              + Add line item
            </button>
          </div>

          {/* Totals */}
          <div className="mt-4 border-t border-[#2A2A2A] pt-4 space-y-2">
            <div className="flex justify-end">
              <div className="w-64 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-[#666]">Subtotal</span>
                  <span className="text-white">{formatCurrency(subtotal, data.currency)}</span>
                </div>
                <div className="flex items-center justify-between text-sm gap-3">
                  <span className="text-[#666]">Tax</span>
                  <div className="flex items-center gap-1">
                    <input type="number" min={0} max={100} step={0.5} value={data.taxRate}
                      onChange={e => set('taxRate', Math.max(0, Math.min(100, Number(e.target.value))))}
                      className="w-16 bg-[#0D0D0D] border border-[#2A2A2A] rounded px-2 py-1 text-sm text-white text-right focus:outline-none focus:border-[#E85D20]"
                    />
                    <span className="text-[#666] text-sm">%</span>
                    <span className="text-white text-sm ml-2">{formatCurrency(taxAmount, data.currency)}</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-[#2A2A2A] pt-2">
                  <span className="text-white">Total</span>
                  <span className="text-[#E85D20] text-base">{formatCurrency(total, data.currency)}</span>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Notes */}
        <Section title="Notes (optional)">
          <textarea
            value={data.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Payment terms, bank details, thank you message…"
            rows={3}
            className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#E85D20] resize-none"
          />
        </Section>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={generate} disabled={generating}
            className="flex-1 py-3 bg-[#E85D20] hover:bg-[#d94f14] disabled:opacity-50 text-white font-bold rounded-xl transition-colors">
            {generating ? 'Generating…' : '↓ Download PDF Invoice'}
          </button>
          <button onClick={() => { setData(defaultData()); setItems([emptyItem()]) }}
            className="px-4 py-3 bg-[#1A1A1A] hover:bg-[#222] text-[#888] hover:text-white text-sm rounded-xl border border-[#2A2A2A] transition-colors">
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111] border border-[#2A2A2A] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2A2A2A]">
        <span className="text-xs font-semibold text-[#666] uppercase tracking-wider">{title}</span>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', multiline = false }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; multiline?: boolean;
}) {
  const base = "w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#E85D20]"
  return (
    <div>
      <label className="block text-xs text-[#888] mb-1.5">{label}</label>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            rows={2} className={`${base} resize-none`} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)}
            placeholder={placeholder} className={base} />
      }
    </div>
  )
}
