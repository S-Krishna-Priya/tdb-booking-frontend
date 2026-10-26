import { describe, expect, it } from 'vitest'
import {
  bookingDates,
  isSelectableDate,
  parseSelection,
  sameSelection,
  selectionSearch,
} from './selection'

// 2026-03-10T12:00:00Z is 17:30 on 2026-03-10 in IST.
const NOW = new Date('2026-03-10T12:00:00Z')
const DATES = bookingDates(NOW)

describe('bookingDates', () => {
  it('lists seven consecutive IST days starting today', () => {
    expect(DATES).toEqual([
      '2026-03-10',
      '2026-03-11',
      '2026-03-12',
      '2026-03-13',
      '2026-03-14',
      '2026-03-15',
      '2026-03-16',
    ])
  })

  it('uses the IST day, not the UTC day, late in the evening UTC', () => {
    // 20:00 UTC is already 01:30 the next morning in IST.
    expect(bookingDates(new Date('2026-03-10T20:00:00Z'))[0]).toBe('2026-03-11')
  })
})

describe('selectionSearch', () => {
  it('writes the temple id and the IST date key as query parameters', () => {
    expect(selectionSearch({ templeId: 'guruvayur', date: '2026-03-12' })).toBe(
      '?temple=guruvayur&date=2026-03-12',
    )
  })

  it('omits a parameter that has no value yet', () => {
    expect(selectionSearch({ templeId: '', date: '2026-03-12' })).toBe('?date=2026-03-12')
    expect(selectionSearch({ templeId: '', date: '' })).toBe('')
  })
})

describe('parseSelection', () => {
  it('reads the temple and date out of a shared link', () => {
    expect(parseSelection('?temple=guruvayur&date=2026-03-12', DATES)).toEqual({
      templeId: 'guruvayur',
      date: '2026-03-12',
    })
  })

  it('round-trips a selection through the query string', () => {
    const selection = { templeId: 'padmanabhaswamy', date: '2026-03-16' }
    expect(sameSelection(parseSelection(selectionSearch(selection), DATES), selection)).toBe(true)
  })

  it('falls back to today when the date is missing, malformed or outside the window', () => {
    expect(parseSelection('?temple=guruvayur', DATES).date).toBe('2026-03-10')
    expect(parseSelection('?temple=guruvayur&date=12-03-2026', DATES).date).toBe('2026-03-10')
    expect(parseSelection('?temple=guruvayur&date=2026-02-30', DATES).date).toBe('2026-03-10')
    expect(parseSelection('?temple=guruvayur&date=2026-04-01', DATES).date).toBe('2026-03-10')
  })

  it('keeps an unknown temple id for the loaded temple list to correct', () => {
    expect(parseSelection('?temple=not-a-temple&date=2026-03-12', DATES).templeId).toBe(
      'not-a-temple',
    )
    expect(parseSelection('', DATES).templeId).toBe('')
  })
})

describe('isSelectableDate', () => {
  it('accepts a well-formed date inside the booking window', () => {
    expect(isSelectableDate('2026-03-16', DATES)).toBe(true)
  })

  it('rejects a malformed date and a date outside the booking window', () => {
    expect(isSelectableDate('not-a-date', DATES)).toBe(false)
    expect(isSelectableDate('2026-03-17', DATES)).toBe(false)
  })
})
