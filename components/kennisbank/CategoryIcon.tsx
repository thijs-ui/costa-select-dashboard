import {
  Home,
  KeyRound,
  MapPin,
  Megaphone,
  Plane,
  Scale,
  TrendingUp,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  'key-round': KeyRound,
  scale: Scale,
  'map-pin': MapPin,
  home: Home,
  'trending-up': TrendingUp,
  plane: Plane,
  wrench: Wrench,
  megaphone: Megaphone,
}

export function CategoryIcon({ name, size = 16 }: { name: string; size?: number }) {
  const Icon = ICON_MAP[name] ?? KeyRound
  return <Icon size={size} />
}
