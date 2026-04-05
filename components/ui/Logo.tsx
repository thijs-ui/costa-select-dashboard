import Image from 'next/image'

interface LogoProps {
  variant?: 'light' | 'dark' | 'discriptor'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const LOGO_FILES = {
  light: '/brand/costa-select-logo-light.svg',
  dark: '/brand/costa-select-wordmark.svg',
  discriptor: '/brand/costa-select-logo-discriptor.svg',
}

const LOGO_SIZES = {
  sm: { width: 120, height: 24 },
  md: { width: 180, height: 36 },
  lg: { width: 240, height: 48 },
  xl: { width: 320, height: 64 },
}

export function Logo({ variant = 'light', size = 'md', className = '' }: LogoProps) {
  const src = LOGO_FILES[variant]
  const { width, height } = LOGO_SIZES[size]

  return (
    <Image
      src={src}
      width={width}
      height={height}
      alt="Costa Select"
      priority
      className={className}
    />
  )
}

interface BeeldmerkProps {
  size?: number
  className?: string
}

export function Beeldmerk({ size = 40, className = '' }: BeeldmerkProps) {
  return (
    <Image
      src="/brand/costa-select-beeldmerk.svg"
      width={size}
      height={size}
      alt="Costa Select"
      className={className}
    />
  )
}
