import Image from 'next/image'

type Variant =
  // Alleen het geometrische merkteken (beeldmerk), geel, transparente bg.
  // Werkt op elke surface; op deepsea bg neemt hij automatisch de juiste look.
  | 'mark'
  // Merkteken + "COSTA SELECT" wordmark, horizontaal (787×58).
  | 'wordmark-white'
  | 'wordmark-deepsea'
  // Idem + NL descriptor eronder (787×104).
  | 'full-nl-white'
  | 'full-nl-deepsea'
  // Idem + EN descriptor eronder (787×103).
  | 'full-en-white'
  | 'full-en-deepsea'
  // Square tiles met achtergrond (voor avatars, social, etc.).
  | 'tile-deepsea'
  | 'tile-white'
  // Square tile met merkteken + "COSTA SELECT" wordmark eronder (sidebar-variant).
  | 'tile-wordmark-deepsea'

interface VariantInfo {
  src: string
  w: number
  h: number
}

const VARIANTS: Record<Variant, VariantInfo> = {
  mark:               { src: '/brand/costa-select-primary.svg',         w: 658,  h: 377 },
  'wordmark-white':   { src: '/brand/costa-select-wordmark-white.svg',  w: 787,  h: 58 },
  'wordmark-deepsea': { src: '/brand/costa-select-wordmark-deepsea.svg',w: 787,  h: 58 },
  'full-nl-white':    { src: '/brand/costa-select-full-nl-white.svg',   w: 787,  h: 104 },
  'full-nl-deepsea':  { src: '/brand/costa-select-full-nl-deepsea.svg', w: 787,  h: 104 },
  'full-en-white':    { src: '/brand/costa-select-full-en-white.svg',   w: 787,  h: 103 },
  'full-en-deepsea':  { src: '/brand/costa-select-full-en-deepsea.svg', w: 787,  h: 103 },
  'tile-deepsea':     { src: '/brand/costa-select-primary-deepsea.svg', w: 1080, h: 1080 },
  'tile-white':       { src: '/brand/costa-select-icon-white.svg',      w: 1080, h: 1080 },
  'tile-wordmark-deepsea': { src: '/brand/costa-select-tile-wordmark-deepsea.svg', w: 1080, h: 1080 },
}

interface LogoProps {
  variant?: Variant
  /** Hoogte in pixels; breedte wordt automatisch berekend vanuit aspect-ratio. */
  size?: number
  className?: string
  priority?: boolean
}

export function Logo({ variant = 'wordmark-deepsea', size = 32, className = '', priority = false }: LogoProps) {
  const { src, w, h } = VARIANTS[variant]
  const width = Math.round((size / h) * w)
  return (
    <Image
      src={src}
      width={width}
      height={size}
      alt="Costa Select"
      priority={priority}
      className={className}
    />
  )
}
