'use client'
import ContentGenerator from '@/components/marketing/ContentGenerator'
import { mcGetCategory } from '@/lib/marketing-config'

export default function WebsiteBlogPage() {
  return <ContentGenerator category={mcGetCategory('website-blog')} />
}
