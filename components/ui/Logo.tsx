import Image from 'next/image'

type Variant =
  | 'primary'       // geel geometrisch merkteken, transparante bg — werkt op elke surface
  | 'full-dark'     // merkteken + wordmark + descriptor, op deepsea bg (square)
  | 'icon-white'    // alleen merkteken, op witte bg (square)
  | 'icon-dark'     // alleen merkteken, op deepsea bg (square)

interface VariantInfo {
  src: string
  nativeWidth: number
  nativeHeight: number
}

const VARIANTS: Record<Variant, VariantInfo> = {
  primary:      { src: '/brand/costa-select-primary.svg',         nativeWidth: 658,  nativeHeight: 377 },
  'full-dark':  { src: '/brand/costa-select-primary-deepsea.svg', nativeWidth: 1080, nativeHeight: 1080 },
  'icon-white': { src: '/brand/costa-select-icon-white.svg',      nativeWidth: 1080, nativeHeight: 1080 },
  'icon-dark':  { src: '/brand/costa-select-icon-deepsea.svg',    nativeWidth: 1080, nativeHeight: 1080 },
}

interface LogoProps {
  variant?: Variant
  /** Hoogte in pixels; breedte wordt automatisch berekend vanuit aspect-ratio */
  size?: number
  className?: string
  priority?: boolean
}

export function Logo({ variant = 'primary', size = 48, className = '', priority = false }: LogoProps) {
  const { src, nativeWidth, nativeHeight } = VARIANTS[variant]
  const width = Math.round((size / nativeHeight) * nativeWidth)
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

interface BeeldmerkProps {
  /** Lichte achtergrond? dan de deepsea icon, anders de witte. */
  onLight?: boolean
  size?: number
  className?: string
}

export function Beeldmerk({ onLight = true, size = 40, className = '' }: BeeldmerkProps) {
  const src = onLight ? '/brand/costa-select-icon-deepsea.svg' : '/brand/costa-select-icon-white.svg'
  return (
    <Image
      src={src}
      width={size}
      height={size}
      alt="Costa Select"
      className={className}
    />
  )
}
