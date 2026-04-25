'use client'
import ContentGenerator from '@/components/marketing/ContentGenerator'
import { mcGetCategory } from '@/lib/marketing-config'

export default function VideoPage() {
  return <ContentGenerator category={mcGetCategory('video')} />
}
