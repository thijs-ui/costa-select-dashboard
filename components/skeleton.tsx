export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[rgba(0,75,70,0.08)] ${className}`} />
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-8 bg-gray-200 rounded w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 bg-gray-100 rounded" />
      ))}
    </div>
  )
}

export function KPISkeleton() {
  return <div className="h-24 bg-gray-200 rounded-lg animate-pulse" />
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse bg-white rounded-2xl border border-gray-100 p-6">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
      </div>
    </div>
  )
}
