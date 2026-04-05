'use client'

import { Play } from 'lucide-react'
import { PageLayout } from '@/components/page-layout'
import { useState } from 'react'

interface TrainingVideo {
  id: string
  title: string
  youtubeId: string
  category: string
}

const trainingCategories = [
  'Onboarding',
  'Tools',
  'Opvolging',
  'Aankoopproces',
  'Processen',
  'Afhandeling',
] as const

// Video's — voeg hier nieuwe video's toe
const videos: TrainingVideo[] = [
  { id: '1', title: 'Test video', youtubeId: '9q5ojtkqsBs', category: 'Onboarding' },
]

function getVideosByCategory(): Record<string, TrainingVideo[]> {
  const grouped: Record<string, TrainingVideo[]> = {}
  for (const cat of trainingCategories) {
    grouped[cat] = videos.filter(v => v.category === cat)
  }
  return grouped
}

export default function TrainingPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [playingVideo, setPlayingVideo] = useState<string | null>(null)
  const grouped = getVideosByCategory()

  const displayCategories = activeCategory
    ? [activeCategory]
    : [...trainingCategories]

  return (
    <PageLayout title="Training" subtitle="Onboarding en trainingsmateriaal voor consultants">

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveCategory(null)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          style={{
            backgroundColor: !activeCategory ? '#004B46' : '#F5F5F5',
            color: !activeCategory ? '#FFFFFF' : '#7A8C8B',
          }}
        >
          Alles
        </button>
        {trainingCategories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            style={{
              backgroundColor: activeCategory === cat ? '#004B46' : '#F5F5F5',
              color: activeCategory === cat ? '#FFFFFF' : '#7A8C8B',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Video grid per category */}
      <div className="space-y-8">
        {displayCategories.map(cat => {
          const catVideos = grouped[cat]
          return (
            <div key={cat}>
              <h2
                className="text-sm font-semibold mb-3"
                style={{ color: '#004B46', fontFamily: 'var(--font-heading, sans-serif)' }}
              >
                {cat}
                <span className="ml-2 text-xs font-normal" style={{ color: '#7A8C8B' }}>
                  ({catVideos.length} {catVideos.length === 1 ? 'video' : "video's"})
                </span>
              </h2>

              {catVideos.length === 0 ? (
                <div className="flex items-center gap-2 px-4 py-3 bg-white/50 rounded-xl border border-dashed border-gray-200">
                  <span className="text-sm text-gray-400 italic">
                    Nog geen video&apos;s in deze categorie
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {catVideos.map(video => (
                    <div
                      key={video.id}
                      className="bg-white rounded-xl border border-gray-100 overflow-hidden"
                    >
                      {playingVideo === video.id ? (
                        <div className="aspect-video">
                          <iframe
                            src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1`}
                            title={video.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full"
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => setPlayingVideo(video.id)}
                          className="relative w-full aspect-video cursor-pointer group"
                        >
                          <img
                            src={`https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                              <Play size={20} style={{ color: '#004B46' }} className="ml-0.5" />
                            </div>
                          </div>
                        </button>
                      )}
                      <div className="p-3">
                        <h3
                          className="text-sm font-medium"
                          style={{ color: '#004B46' }}
                        >
                          {video.title}
                        </h3>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </PageLayout>
  )
}
