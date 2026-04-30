export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function stripExtension(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '')
}

export function getExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? ''
}

/** pdf-lib returns Uint8Array<ArrayBufferLike> which TypeScript rejects as BlobPart.
 *  Copying into a fresh Uint8Array<ArrayBuffer> fixes the type at zero runtime cost. */
export function pdfBytesToBlob(bytes: Uint8Array): Blob {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return new Blob([copy], { type: 'application/pdf' })
}
