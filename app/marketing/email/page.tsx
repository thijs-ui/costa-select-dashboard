'use client'
import ContentGenerator from '@/components/marketing/ContentGenerator'
import { mcGetCategory } from '@/lib/marketing-config'

export default function EmailPage() {
  return <ContentGenerator category={mcGetCategory('email')} />
}
