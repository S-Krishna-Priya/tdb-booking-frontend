import { beforeEach, describe, expect, it } from 'vitest'
import {
  __getSlotById,
  cancelBooking,
  configureMockApi,
  createBooking,
  getBookings,
  getSlots,
  getTemples,
  resetMockApi,
} from './mockApi'
import { ApiError } from '../types/booking'
import { addIstDays, hasStarted, istDateKey } from '../utils/datetime'

const TODAY = istDateKey(new Date())

function deterministic() {
  resetMockApi()
  configureMockApi({ failureRate: 0, minDelayMs: 0, maxDelayMs: 0 })
}

describe('mock API seed', () => {
  beforeEach(deterministic)

  it('seeds at least three temples', async () => {
    const temples = await getTemples()
    expect(temples.length).toBeGreaterThanOrEqual(3)
  })

  it('seeds slots for the next seven days at each temple', async () => {
    const temples = await getTemples()
    for (const temple of temples) {
      for (let offset = 0; offset < 7; offset += 1) {
        const date = new Date()
        date.setUTCDate(date.getUTCDate() + offset)
        const slots = await getSlots(temple.id, istDateKey(date))
        expect(slots.length).toBeGreaterThan(0)
      }
    }
  })

  it('seeds some full slots and some already-started slots', async () => {
    const slots = await getSlots('sabarimala', TODAY)
    expect(slots.some((slot) => slot.remaining === 0)).toBe(true)
    expect(slots.some((slot) => hasStarted(slot.startsAt))).toBe(true)
  })

  it('exposes a configurable failure rate that defaults to 20 percent', async () => {
    resetMockApi()
    const { getMockApiConfig } = await import('./mockApi')
    expect(getMockApiConfig().failureRate).toBe(0.2)
    expect(getMockApiConfig().minDelayMs).toBe(200)
    expect(getMockApiConfig().maxDelayMs).toBe(1500)
  })

  it('fails every call when the failure rate is forced to 1', async () => {
    configureMockApi({ failureRate: 1 })
    await expect(getTemples()).rejects.toBeInstanceOf(ApiError)
  })
})

describe('createBooking', () => {
  beforeEach(deterministic)

  async function firstBookableSlot() {
    const slots = await getSlots('guruvayur', TODAY)
    const slot = slots.find((candidate) => candidate.remaining > 0 && !hasStarted(candidate.startsAt))
    if (!slot) throw new Error('no bookable slot in seed')
    return slot
  }

  it('decrements the remaining tickets by the number booked', async () => {
    const slot = await firstBookableSlot()
    const before = slot.remaining

    await createBooking({ slotId: slot.id, name: 'Asha', phone: '9876543210', tickets: 3 })

    expect(__getSlotById(slot.id)?.remaining).toBe(before - 3)
  })

  it('leaves 7 remaining when 3 are booked from a slot with 10 remaining', async () => {
    const slot = await firstBookableSlot()
    const live = __getSlotById(slot.id)
    if (!live) throw new Error('slot missing')
    live.remaining = 10

    await createBooking({ slotId: slot.id, name: 'Asha', phone: '9876543210', tickets: 3 })

    expect(__getSlotById(slot.id)?.remaining).toBe(7)
  })

  it('rejects a request for more tickets than remain', async () => {
    const slot = await firstBookableSlot()
    const live = __getSlotById(slot.id)
    if (!live) throw new Error('slot missing')
    live.remaining = 2

    await expect(
      createBooking({ slotId: slot.id, name: 'Asha', phone: '9876543210', tickets: 3 }),
    ).rejects.toMatchObject({ code: 'slot_full' })
    expect(__getSlotById(slot.id)?.remaining).toBe(2)
  })

  it('rejects booking a full slot', async () => {
    const tomorrow = addIstDays(TODAY, 1)
    const slots = await getSlots('sabarimala', tomorrow)
    const full = slots.find((slot) => slot.remaining === 0 && !hasStarted(slot.startsAt))
    if (!full) throw new Error('no full future slot in seed')

    await expect(
      createBooking({ slotId: full.id, name: 'Asha', phone: '9876543210', tickets: 1 }),
    ).rejects.toMatchObject({ code: 'slot_full' })
  })

  it('rejects booking a slot that has already started', async () => {
    const slots = await getSlots('sabarimala', TODAY)
    const started = slots.find((slot) => hasStarted(slot.startsAt))
    if (!started) throw new Error('no started slot in seed')

    await expect(
      createBooking({ slotId: started.id, name: 'Asha', phone: '9876543210', tickets: 1 }),
    ).rejects.toMatchObject({ code: 'slot_started' })
  })

  it('rejects an invalid phone number', async () => {
    const slot = await firstBookableSlot()
    await expect(
      createBooking({ slotId: slot.id, name: 'Asha', phone: '123', tickets: 1 }),
    ).rejects.toMatchObject({ code: 'invalid_request' })
  })
})

describe('getBookings and cancelBooking', () => {
  beforeEach(deterministic)

  it('returns only the bookings for the given phone number', async () => {
    const slots = await getSlots('guruvayur', TODAY)
    const slot = slots.find((candidate) => candidate.remaining > 2 && !hasStarted(candidate.startsAt))
    if (!slot) throw new Error('no bookable slot')

    await createBooking({ slotId: slot.id, name: 'Asha', phone: '9876543210', tickets: 1 })
    await createBooking({ slotId: slot.id, name: 'Biju', phone: '9000000000', tickets: 1 })

    const asha = await getBookings('9876543210')
    expect(asha).toHaveLength(1)
    expect(asha[0]?.name).toBe('Asha')
  })

  it('releases the tickets back to the slot when a booking is cancelled', async () => {
    const slots = await getSlots('guruvayur', TODAY)
    const slot = slots.find((candidate) => candidate.remaining > 2 && !hasStarted(candidate.startsAt))
    if (!slot) throw new Error('no bookable slot')
    const before = __getSlotById(slot.id)?.remaining ?? 0

    const booking = await createBooking({
      slotId: slot.id,
      name: 'Asha',
      phone: '9876543210',
      tickets: 2,
    })
    expect(__getSlotById(slot.id)?.remaining).toBe(before - 2)

    const cancelled = await cancelBooking(booking.id)
    expect(cancelled.status).toBe('cancelled')
    expect(__getSlotById(slot.id)?.remaining).toBe(before)
  })
})
