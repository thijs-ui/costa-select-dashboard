'use client'
import ContentGenerator from '@/components/marketing/ContentGenerator'
import { mcGetCategory } from '@/lib/marketing-config'

export default function SocialMediaPage() {
  return <ContentGenerator category={mcGetCategory('social-media')} />
}
