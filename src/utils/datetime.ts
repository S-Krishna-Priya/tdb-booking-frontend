export const IST_TIME_ZONE = 'Asia/Kolkata'

const ISO_DATE_PART = /^\d{4}-\d{2}-\d{2}$/

function partsInIst(instant: Date): Record<string, string> {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts: Record<string, string> = {}
  for (const part of formatter.formatToParts(instant)) {
    if (part.type !== 'literal') parts[part.type] = part.value
  }
  return parts
}

export function istDateKey(instant: Date): string {
  const parts = partsInIst(instant)
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function isValidDateKey(value: string): boolean {
  if (!ISO_DATE_PART.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && istDateKeyFromUtcMidnight(parsed) === value
}

function istDateKeyFromUtcMidnight(instant: Date): string {
  const year = instant.getUTCFullYear().toString().padStart(4, '0')
  const month = (instant.getUTCMonth() + 1).toString().padStart(2, '0')
  const day = instant.getUTCDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatIstTime(isoInstant: string, locale = 'en-IN'): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: IST_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(isoInstant))
}

export function formatIstDate(isoInstant: string, locale = 'en-IN'): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: IST_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(isoInstant))
}

export function formatIstDateKey(dateKey: string, locale = 'en-IN'): string {
  return formatIstDate(`${dateKey}T06:00:00.000Z`, locale)
}

export function hasStarted(isoInstant: string, now: Date = new Date()): boolean {
  return new Date(isoInstant).getTime() <= now.getTime()
}

export function addIstDays(dateKey: string, days: number): string {
  const base = new Date(`${dateKey}T00:00:00Z`)
  base.setUTCDate(base.getUTCDate() + days)
  return istDateKeyFromUtcMidnight(base)
}

export function istSlotInstant(dateKey: string, hour: number, minute = 0): string {
  const utcHour = hour - 5
  const utcMinute = minute - 30
  const instant = new Date(`${dateKey}T00:00:00Z`)
  instant.setUTCHours(utcHour, utcMinute, 0, 0)
  return instant.toISOString()
}
