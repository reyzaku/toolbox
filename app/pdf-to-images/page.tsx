import ComingSoon from '@/components/ComingSoon'

export default function PdfToImagesPage() {
  return (
    <ComingSoon
      icon="📑"
      label="PDF → Images"
      description="Convert each PDF page to PNG or JPG"
      color="#2980B9"
      features={[
        'Upload PDF, convert each page to PNG or JPG',
        'DPI/quality selector (72, 150, 300)',
        'Preview each page before download',
        'Download all pages as a ZIP archive',
      ]}
    />
  )
}
