import dynamic from 'next/dynamic'

const VideoConverter = dynamic(() => import('@/components/tools/VideoConverter'), { ssr: false })

export default function VideoConverterPage() {
  return <VideoConverter />
}
