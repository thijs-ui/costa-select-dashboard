'use client'
import ContentGenerator from '@/components/marketing/ContentGenerator'
import { mcGetCategory } from '@/lib/marketing-config'

export default function AdvertentiesPage() {
  return <ContentGenerator category={mcGetCategory('advertenties')} />
}
