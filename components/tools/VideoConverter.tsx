'use client';

import { useState } from 'react';
import BatchDropZone from '@/components/BatchDropZone';
import FFmpegLoader from '@/components/FFmpegLoader';
import { loadFFmpeg, fetchFile, getFileExtension, fileDataToBlob } from '@/lib/ffmpeg';
import { type BatchItem, createBatchItems, makeOutputName } from '@/lib/batch';
import { downloadAsZip } from '@/lib/zip';
import { formatBytes } from '@/lib/utils';

const OUTPUT_FORMATS = ['mp4', 'webm', 'mov', 'avi', 'mkv'] as const;
type OutputFormat = typeof OUTPUT_FORMATS[number];

const FORMAT_ARGS: Record<OutputFormat, string[]> = {
  mp4:  ['-c:v', 'libx264', '-c:a', 'aac', '-movflags', '+faststart'],
  webm: ['-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0', '-c:a', 'libopus'],
  mov:  ['-c:v', 'libx264', '-c:a', 'aac'],
  avi:  ['-c:v', 'libxvid', '-c:a', 'mp3'],
  mkv:  ['-c:v', 'libx264', '-c:a', 'aac'],
};

type RunStatus = 'idle' | 'loading' | 'running' | 'done';

export default function VideoConverter() {
  const [items, setItems]         = useState<BatchItem[]>([]);
  const [outputFormat, setFormat] = useState<OutputFormat>('mp4');
  const [runStatus, setRunStatus] = useState<RunStatus>('idle');
  const [error, setError]         = useState<string | null>(null);

  const addFiles   = (files: File[]) => setItems((p) => [...p, ...createBatchItems(files)]);
  const removeItem = (id: string)    => setItems((p) => p.filter((i) => i.id !== id));
  const updateItem = (id: string, patch: Partial<BatchItem>) =>
    setItems((p) => p.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const run = async () => {
    const pending = items.filter((i) => i.status === 'pending');
    if (pending.length === 0) return;
    setError(null);

    try {
      setRunStatus('loading');
      const ffmpeg = await loadFFmpeg();
      setRunStatus('running');

      const usedNames = new Set<string>();

      for (const item of pending) {
        updateItem(item.id, { status: 'processing', progress: 0 });
        const handler = ({ progress: p }: { progress: number }) =>
          updateItem(item.id, { progress: p });
        ffmpeg.on('progress', handler);

        try {
          const inputExt  = getFileExtension(item.file.name);
          const inputName = `input.${inputExt}`;
          const outputName = `output.${outputFormat}`;

          await ffmpeg.writeFile(inputName, await fetchFile(item.file));
          await ffmpeg.exec(['-i', inputName, ...FORMAT_ARGS[outputFormat], outputName]);

          const data = await ffmpeg.readFile(outputName);
          const blob = fileDataToBlob(data, `video/${outputFormat}`);

          await ffmpeg.deleteFile(inputName);
          await ffmpeg.deleteFile(outputName);

          const outName = makeOutputName(item.file.name, '_converted', outputFormat, usedNames);
          updateItem(item.id, { status: 'done', progress: 1, outputBlob: blob, outputName: outName });
        } catch (err) {
          updateItem(item.id, { status: 'error', error: err instanceof Error ? err.message : 'Failed' });
        } finally {
          ffmpeg.off('progress', handler);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load FFmpeg');
    }

    setRunStatus('done');
  };

  const reset = () => { setItems([]); setRunStatus('idle'); setError(null); };

  const doneItems    = items.filter((i) => i.status === 'done');
  const isRunning    = runStatus === 'loading' || runStatus === 'running';
  const pendingCount = items.filter((i) => i.status === 'pending').length;
  const totalSaved   = doneItems.reduce(
    (acc, i) => acc + (i.file.size - (i.outputBlob?.size ?? i.file.size)), 0
  );

  return (
    <div className="px-6 py-10 md:px-10 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="w-9 h-9 bg-[#3498DB]/20 rounded-lg flex items-center justify-center text-xl">🎞</span>
          Video Converter
        </h1>
        <p className="text-sm text-[#666] mt-1">Convert between video formats locally in your browser</p>
      </div>

      <div className="space-y-6">
        <BatchDropZone items={items} onAddFiles={addFiles} onRemove={removeItem} accept="video/*" disabled={isRunning} />

        {items.length > 0 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-[#888] mb-2 uppercase tracking-wider">Output Format</label>
              <div className="flex flex-wrap gap-2">
                {OUTPUT_FORMATS.map((fmt) => (
                  <button key={fmt} onClick={() => setFormat(fmt)} disabled={isRunning}
                    className={`px-4 py-2 rounded-lg text-sm font-medium uppercase transition-all ${
                      outputFormat === fmt
                        ? 'bg-[#E85D20] text-white'
                        : 'bg-[#1A1A1A] text-[#888] hover:bg-[#222] border border-[#2A2A2A] disabled:opacity-40'
                    }`}>
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {runStatus === 'loading' && <FFmpegLoader />}

            {!isRunning && pendingCount > 0 && (
              <button onClick={run}
                className="w-full py-3 rounded-xl bg-[#E85D20] hover:bg-[#d94f14] text-white font-semibold transition-colors">
                Convert {pendingCount} file{pendingCount !== 1 ? 's' : ''} → {outputFormat.toUpperCase()}
              </button>
            )}

            {doneItems.length > 0 && !isRunning && (
              <div className="rounded-xl bg-[#111] border border-[#2A2A2A] p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="text-sm space-y-0.5">
                  <p className="text-white font-medium">{doneItems.length}/{items.length} converted</p>
                  {totalSaved > 0 && <p className="text-green-400 text-xs">{formatBytes(totalSaved)} saved total</p>}
                </div>
                <div className="flex gap-2">
                  {doneItems.length >= 2 && (
                    <button onClick={() => downloadAsZip(items, `toolbox-${outputFormat}.zip`)}
                      className="px-4 py-2 rounded-lg bg-[#E85D20] hover:bg-[#d94f14] text-white text-sm font-semibold transition-colors">
                      Download All (ZIP)
                    </button>
                  )}
                  <button onClick={reset}
                    className="px-4 py-2 rounded-lg bg-[#1A1A1A] hover:bg-[#222] text-[#CCC] text-sm border border-[#2A2A2A] transition-colors">
                    Reset
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="text-red-400 text-sm rounded-xl bg-red-950/40 border border-red-900/50 px-4 py-3">{error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
