import dynamic from 'next/dynamic'

const VideoCompressor = dynamic(() => import('@/components/tools/VideoCompressor'), { ssr: false })

export default function VideoCompressorPage() {
  return <VideoCompressor />
}
