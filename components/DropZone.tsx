'use client'

import { useCallback, useState } from 'react'

interface DropZoneProps {
  onFiles: (files: File[]) => void
  accept?: string
  multiple?: boolean
  label?: string
  sublabel?: string
}

export default function DropZone({ onFiles, accept, multiple = true, label, sublabel }: DropZoneProps) {
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) onFiles(files)
  }, [onFiles])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length) onFiles(files)
    e.target.value = ''
  }, [onFiles])

  return (
    <label
      className={`relative flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-10 cursor-pointer transition-all duration-200 ${
        dragging
          ? 'border-[#E85D20] bg-[#E85D20]/5 scale-[1.01]'
          : 'border-[#2A2A2A] bg-[#111111] hover:border-[#E85D20]/50 hover:bg-[#1A1A1A]'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-colors ${dragging ? 'bg-[#E85D20]/20' : 'bg-[#1E1E1E]'}`}>
        {dragging ? '📂' : '📁'}
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-[#CCC]">
          {label ?? 'Drop files here or click to browse'}
        </p>
        {sublabel && <p className="text-xs text-[#555] mt-1">{sublabel}</p>}
      </div>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={handleChange}
      />
    </label>
  )
}
