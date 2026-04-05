'use client'

interface PageLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export function PageLayout({ children, title, subtitle }: PageLayoutProps) {
  return (
    <div className="px-8 py-8">
      {title && (
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-bold text-[#004B46]">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
