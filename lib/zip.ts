import type { BatchItem } from './batch';

/** Used by the image converter tool */
export async function createZip(files: { name: string; blob: Blob }[]): Promise<Blob> {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  for (const { name, blob } of files) {
    zip.file(name, blob)
  }
  return zip.generateAsync({ type: 'blob' })
}

/** Used by FFmpeg-powered tools (video/GIF) — uses fflate for speed */
export async function downloadAsZip(
  items: BatchItem[],
  zipName = 'toolbox-batch.zip'
): Promise<void> {
  const done = items.filter((i) => i.status === 'done' && i.outputBlob && i.outputName);
  if (done.length === 0) return;

  const { zipSync } = await import('fflate');
  const files: Record<string, Uint8Array> = {};
  for (const item of done) {
    const buf = await item.outputBlob!.arrayBuffer();
    files[item.outputName!] = new Uint8Array(buf);
  }

  const zipped = zipSync(files, { level: 0 }); // level 0 = store only (media already compressed)
  const copy = new Uint8Array(zipped.byteLength);
  copy.set(zipped);
  const blob = new Blob([copy], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = zipName;
  a.click();
  URL.revokeObjectURL(url);
}
