import {
  CheckCircle2,
  GitBranch,
  GraduationCap,
  KeyRound,
  PhoneCall,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  'graduation-cap': GraduationCap,
  wrench: Wrench,
  'phone-call': PhoneCall,
  'key-round': KeyRound,
  'git-branch': GitBranch,
  'check-circle-2': CheckCircle2,
}

export function CategoryIcon({ name, size = 16 }: { name: string; size?: number }) {
  const Icon = ICON_MAP[name] ?? GraduationCap
  return <Icon size={size} />
}
