export type DatePreset =
  | 'deze_maand'
  | 'vorige_maand'
  | 'dit_jaar'
  | 'vorig_jaar'
  | 'laatste_7'
  | 'laatste_30'
  | 'laatste_90'
  | 'alles'

export interface DateRange {
  from: Date | null
  to: Date | null
  label: string
}

export function getDateRange(preset: DatePreset): DateRange {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (preset) {
    case 'deze_maand': {
      const from = new Date(today.getFullYear(), today.getMonth(), 1)
      const to = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { from, to, label: 'Deze maand' }
    }
    case 'vorige_maand': {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const to = new Date(today.getFullYear(), today.getMonth(), 0)
      return { from, to, label: 'Vorige maand' }
    }
    case 'dit_jaar': {
      const from = new Date(today.getFullYear(), 0, 1)
      const to = new Date(today.getFullYear(), 11, 31)
      return { from, to, label: 'Dit jaar' }
    }
    case 'vorig_jaar': {
      const from = new Date(today.getFullYear() - 1, 0, 1)
      const to = new Date(today.getFullYear() - 1, 11, 31)
      return { from, to, label: 'Vorig jaar' }
    }
    case 'laatste_7': {
      const from = new Date(today)
      from.setDate(from.getDate() - 7)
      return { from, to: today, label: 'Laatste 7 d' }
    }
    case 'laatste_30': {
      const from = new Date(today)
      from.setDate(from.getDate() - 30)
      return { from, to: today, label: 'Laatste 30 d' }
    }
    case 'laatste_90': {
      const from = new Date(today)
      from.setDate(from.getDate() - 90)
      return { from, to: today, label: 'Laatste 90 d' }
    }
    case 'alles':
      return { from: null, to: null, label: 'Alles' }
  }
}

export function isInRange(dateStr: string, range: DateRange): boolean {
  // Parse as local time (not UTC) to avoid timezone offset issues
  const parts = dateStr.split('T')[0].split('-').map(Number)
  const date = new Date(parts[0], parts[1] - 1, parts[2])
  if (isNaN(date.getTime())) return false
  if (range.from && date < range.from) return false
  if (range.to) {
    const toEnd = new Date(range.to)
    toEnd.setHours(23, 59, 59, 999)
    if (date > toEnd) return false
  }
  return true
}

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'deze_maand', label: 'Deze maand' },
  { value: 'vorige_maand', label: 'Vorige maand' },
  { value: 'laatste_30', label: 'Laatste 30 d' },
  { value: 'laatste_90', label: 'Laatste 90 d' },
  { value: 'dit_jaar', label: 'Dit jaar' },
  { value: 'vorig_jaar', label: 'Vorig jaar' },
  { value: 'alles', label: 'Alles' },
]
