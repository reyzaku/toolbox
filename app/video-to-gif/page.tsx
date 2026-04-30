import dynamic from 'next/dynamic'

const VideoToGif = dynamic(() => import('@/components/tools/VideoToGif'), { ssr: false })

export default function VideoToGifPage() {
  return <VideoToGif />
}
