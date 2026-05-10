/**
 * ISO-week string in formaat "YYYY-Www" (bv. "2026-W19").
 * Volgt ISO 8601 — week 1 is de week met de eerste donderdag van het jaar.
 */
export function getIsoWeek(date: Date = new Date()): string {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = (target.getUTCDay() + 6) % 7
  target.setUTCDate(target.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4))
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3)
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000))
  return `${target.getUTCFullYear()}-W${week.toString().padStart(2, '0')}`
}
