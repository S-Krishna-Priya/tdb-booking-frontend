import { addIstDays, istDateKey, isValidDateKey } from './datetime'

/**
 * The selection lives in the query string so a link can be shared and restored:
 *
 *   /?temple=<temple id>&date=<YYYY-MM-DD>
 *
 * `temple` is the mock API's temple id (`sabarimala`), not its display name, so the link
 * survives a rename. `date` is an IST calendar day in ISO `YYYY-MM-DD` form — the same key the
 * slots are stored under — so the link means the same day regardless of the reader's device
 * timezone.
 */
export const TEMPLE_PARAM = 'temple'
export const DATE_PARAM = 'date'

/** Darshan is bookable for today plus the next six IST days. */
export const BOOKING_WINDOW_DAYS = 7

export interface Selection {
  templeId: string
  date: string
}

/** The IST days that can be selected, today first. */
export function bookingDates(now: Date = new Date()): string[] {
  return bookingDatesFrom(istDateKey(now))
}

/** The bookable window starting at an IST day key. Taking the key keeps it a pure function of it. */
export function bookingDatesFrom(today: string): string[] {
  return Array.from({ length: BOOKING_WINDOW_DAYS }, (_, offset) => addIstDays(today, offset))
}

/** A date is selectable only when it is well formed and inside the bookable window. */
export function isSelectableDate(value: string, dates: readonly string[]): boolean {
  return isValidDateKey(value) && dates.includes(value)
}

export function sameSelection(a: Selection, b: Selection): boolean {
  return a.templeId === b.templeId && a.date === b.date
}

/**
 * Read a selection out of a query string.
 *
 * A missing, malformed or out-of-window date falls back to today: a link shared last month
 * should open on a bookable day rather than on an empty, unselectable one. An unknown temple id
 * is kept here and corrected once the temple list has loaded, because this function cannot know
 * which ids exist.
 */
export function parseSelection(search: string, dates: readonly string[]): Selection {
  const params = new URLSearchParams(search)
  const templeId = params.get(TEMPLE_PARAM)?.trim() ?? ''
  const date = params.get(DATE_PARAM)?.trim() ?? ''

  return {
    templeId,
    date: isSelectableDate(date, dates) ? date : (dates[0] ?? istDateKey(new Date())),
  }
}

/** Serialise a selection as a query string, including the leading `?`. */
export function selectionSearch(selection: Selection): string {
  const params = new URLSearchParams()
  if (selection.templeId) params.set(TEMPLE_PARAM, selection.templeId)
  if (selection.date) params.set(DATE_PARAM, selection.date)
  const query = params.toString()
  return query ? `?${query}` : ''
}
