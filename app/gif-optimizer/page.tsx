import dynamic from 'next/dynamic'

const GifOptimizer = dynamic(() => import('@/components/tools/GifOptimizer'), { ssr: false })

export default function GifOptimizerPage() {
  return <GifOptimizer />
}
