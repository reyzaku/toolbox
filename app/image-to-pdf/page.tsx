import ComingSoon from '@/components/ComingSoon'

export default function ImageToPdfPage() {
  return (
    <ComingSoon
      icon="📁"
      label="Images → PDF"
      description="Combine multiple images into a single PDF"
      color="#F39C12"
      features={[
        'Batch upload images (JPG, PNG, WebP)',
        'Drag to reorder images before converting',
        'Page size options: A4, Letter, fit to image',
        'Margin control',
        'Download as single PDF',
      ]}
    />
  )
}
