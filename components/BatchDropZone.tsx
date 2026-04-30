'use client';

import { useCallback, useRef, useState } from 'react';
import type { BatchItem } from '@/lib/batch';
import { formatBytes } from '@/lib/utils';

interface BatchDropZoneProps {
  items: BatchItem[];
  onAddFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  accept?: string;
  disabled?: boolean;
  label?: string;
}

export default function BatchDropZone({
  items, onAddFiles, onRemove, accept, disabled, label,
}: BatchDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) onAddFiles(files);
    },
    [onAddFiles, disabled]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onAddFiles(files);
    e.target.value = '';
  };

  const open = () => { if (!disabled) inputRef.current?.click(); };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={open}
        className={`
          flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed
          transition-all duration-200 p-6 min-h-[110px]
          ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
          ${dragging
            ? 'border-[#E85D20] bg-[#E85D20]/5'
            : items.length > 0
              ? 'border-[#2A2A2A] bg-[#111]/30 hover:border-[#3A3A3A]'
              : 'border-[#2A2A2A] bg-[#111]/40 hover:border-[#444] hover:bg-[#1A1A1A]/60'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          onChange={handleChange}
          className="hidden"
          disabled={disabled}
        />
        <span className="text-2xl opacity-50">📁</span>
        <p className="text-sm text-[#999] text-center">
          {label ?? 'Drop files here, or click to browse'}
        </p>
        <p className="text-xs text-[#444]">Multiple files supported · same preset applies to all</p>
      </div>

      {items.length > 0 && (
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
          {items.map((item) => (
            <FileRow key={item.id} item={item} onRemove={onRemove} disabled={disabled} />
          ))}
        </div>
      )}
    </div>
  );
}

function FileRow({ item, onRemove, disabled }: {
  item: BatchItem;
  onRemove: (id: string) => void;
  disabled?: boolean;
}) {
  const saved =
    item.status === 'done' && item.outputBlob && item.file.size > 0
      ? Math.round((1 - item.outputBlob.size / item.file.size) * 100)
      : null;

  const downloadURL =
    item.status === 'done' && item.outputBlob
      ? URL.createObjectURL(item.outputBlob)
      : null;

  return (
    <div className="flex items-center gap-3 rounded-lg bg-[#111] border border-[#2A2A2A] px-3 py-2.5">
      <span className="text-base flex-shrink-0">🎬</span>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate leading-tight">{item.file.name}</p>

        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-[#555]">{formatBytes(item.file.size)}</span>

          {item.status === 'done' && item.outputBlob && (
            <span className="text-xs text-green-500">
              → {formatBytes(item.outputBlob.size)}
              {saved !== null && saved > 0 && (
                <span className="text-green-600 ml-1">−{saved}%</span>
              )}
            </span>
          )}

          {item.status === 'error' && (
            <span className="text-xs text-red-400 truncate max-w-[180px]">{item.error}</span>
          )}
        </div>

        {item.status === 'processing' && (
          <div className="mt-1.5 h-1 w-full rounded-full bg-[#222] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{
                width: `${Math.round(item.progress * 100)}%`,
                background: 'linear-gradient(90deg, #E85D20, #ff8c57)',
              }}
            />
          </div>
        )}
      </div>

      <div className="flex-shrink-0 flex items-center gap-2">
        {item.status === 'pending' && !disabled && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
            className="text-[#555] hover:text-red-400 transition-colors text-xl leading-none pb-0.5"
            title="Remove"
          >
            ×
          </button>
        )}

        {item.status === 'processing' && (
          <div className="h-3.5 w-3.5 rounded-full border-2 border-[#E85D20] border-t-transparent animate-spin" />
        )}

        {item.status === 'done' && downloadURL && item.outputName && (
          <a
            href={downloadURL}
            download={item.outputName}
            onClick={(e) => e.stopPropagation()}
            className="text-xs px-2.5 py-1 rounded-md bg-[#1A1A1A] hover:bg-[#222] text-[#CCC] border border-[#2A2A2A] transition-colors"
          >
            ↓
          </a>
        )}

        {item.status === 'done' && <span className="text-green-400">✓</span>}
        {item.status === 'error' && <span className="text-red-400">✗</span>}
      </div>
    </div>
  );
}
