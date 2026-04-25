'use client'
import ContentGenerator from '@/components/marketing/ContentGenerator'
import { mcGetCategory } from '@/lib/marketing-config'

export default function BrochuresPage() {
  return <ContentGenerator category={mcGetCategory('brochures')} />
}
