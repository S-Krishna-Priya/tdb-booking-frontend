import { afterEach, describe, expect, it, vi } from 'vitest'
import { configureMockApi, createBooking, getSlots, resetMockApi } from './mockApi'
import { addIstDays, hasStarted, istDateKey, istSlotInstant } from '../utils/datetime'

const LATE_IST_HOURS = [0, 6, 11, 19, 20, 21, 22, 23]

afterEach(() => {
  vi.useRealTimers()
})

function pinIstHour(hour: number): void {
  const today = istDateKey(new Date())
  vi.useFakeTimers()
  vi.setSystemTime(new Date(istSlotInstant(today, hour, 30)))
}

describe('seed and fixtures are independent of the hour the suite runs', () => {
  it.each(LATE_IST_HOURS)('still offers a bookable slot at %i:30 IST', async (hour) => {
    pinIstHour(hour)
    resetMockApi()
    configureMockApi({ failureRate: 0, minDelayMs: 0, maxDelayMs: 0 })

    const tomorrow = addIstDays(istDateKey(new Date()), 1)
    const slots = await getSlots('guruvayur', tomorrow)
    const bookable = slots.filter(
      (slot) => slot.remaining > 0 && !hasStarted(slot.startsAt, new Date()),
    )

    expect(bookable.length).toBeGreaterThan(0)
  })

  it.each(LATE_IST_HOURS)('still seeds a full and a started slot at %i:30 IST', async (hour) => {
    pinIstHour(hour)
    resetMockApi()
    configureMockApi({ failureRate: 0, minDelayMs: 0, maxDelayMs: 0 })

    const today = istDateKey(new Date())
    const slots = await getSlots('sabarimala', today)

    expect(slots.some((slot) => slot.remaining === 0)).toBe(true)
    expect(slots.some((slot) => hasStarted(slot.startsAt, new Date()))).toBe(true)
  })

  it.each(LATE_IST_HOURS)('books 3 of 10 leaving 7 at %i:30 IST', async (hour) => {
    pinIstHour(hour)
    resetMockApi()
    configureMockApi({ failureRate: 0, minDelayMs: 0, maxDelayMs: 0 })

    const tomorrow = addIstDays(istDateKey(new Date()), 1)
    const slots = await getSlots('guruvayur', tomorrow)
    const target = slots.find(
      (slot) => slot.remaining > 0 && !hasStarted(slot.startsAt, new Date()),
    )
    if (!target) throw new Error('no bookable slot')

    const { __getSlotById } = await import('./mockApi')
    const live = __getSlotById(target.id)
    if (!live) throw new Error('slot missing')
    live.remaining = 10

    await createBooking({
      slotId: target.id,
      name: 'Asha',
      phone: '9876543210',
      tickets: 3,
      idempotencyKey: `clock-independence-${hour}`,
    })

    expect(__getSlotById(target.id)?.remaining).toBe(7)
  })
})
