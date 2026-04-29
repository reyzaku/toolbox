export async function createZip(files: { name: string; blob: Blob }[]): Promise<Blob> {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  for (const { name, blob } of files) {
    zip.file(name, blob)
  }
  return zip.generateAsync({ type: 'blob' })
}
