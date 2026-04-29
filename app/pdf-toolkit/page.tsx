import ComingSoon from '@/components/ComingSoon'

export default function PdfToolkitPage() {
  return (
    <ComingSoon
      icon="📄"
      label="PDF Toolkit"
      description="Merge, split, compress and reorder PDF pages"
      color="#E74C3C"
      features={[
        'Merge multiple PDFs into one',
        'Split PDF by page range or extract single pages',
        'Compress PDF (remove metadata, optimize)',
        'Reorder pages via drag and drop',
        'Download result',
      ]}
    />
  )
}
