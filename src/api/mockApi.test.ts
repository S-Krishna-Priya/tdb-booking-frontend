import { beforeEach, describe, expect, it } from 'vitest'
import {
  __getAllBookings,
  __getSlotById,
  cancelBooking,
  configureMockApi,
  createBooking,
  getBookings,
  getSlots,
  getTemples,
  resetMockApi,
} from './mockApi'
import { ApiError, type Booking } from '../types/booking'
import { addIstDays, hasStarted, istDateKey } from '../utils/datetime'

const TODAY = istDateKey(new Date())
const TOMORROW = addIstDays(TODAY, 1)

let keyCounter = 0

/** A fresh idempotency key, so each call here counts as a distinct booking attempt. */
function newKey(): string {
  keyCounter += 1
  return `attempt-${String(keyCounter)}`
}

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
    const slots = await getSlots('guruvayur', TOMORROW)
    const slot = slots.find((candidate) => candidate.remaining > 0 && !hasStarted(candidate.startsAt))
    if (!slot) throw new Error('no bookable slot in seed')
    return slot
  }

  it('decrements the remaining tickets by the number booked', async () => {
    const slot = await firstBookableSlot()
    const before = slot.remaining

    await createBooking({
      slotId: slot.id,
      name: 'Asha',
      phone: '9876543210',
      tickets: 3,
      idempotencyKey: newKey(),
    })

    expect(__getSlotById(slot.id)?.remaining).toBe(before - 3)
  })

  it('leaves 7 remaining when 3 are booked from a slot with 10 remaining', async () => {
    const slot = await firstBookableSlot()
    const live = __getSlotById(slot.id)
    if (!live) throw new Error('slot missing')
    live.remaining = 10

    await createBooking({
      slotId: slot.id,
      name: 'Asha',
      phone: '9876543210',
      tickets: 3,
      idempotencyKey: newKey(),
    })

    expect(__getSlotById(slot.id)?.remaining).toBe(7)
  })

  it('rejects a request for more tickets than remain', async () => {
    const slot = await firstBookableSlot()
    const live = __getSlotById(slot.id)
    if (!live) throw new Error('slot missing')
    live.remaining = 2

    await expect(
      createBooking({
        slotId: slot.id,
        name: 'Asha',
        phone: '9876543210',
        tickets: 3,
        idempotencyKey: newKey(),
      }),
    ).rejects.toMatchObject({ code: 'slot_full' })
    expect(__getSlotById(slot.id)?.remaining).toBe(2)
  })

  it('rejects booking a full slot', async () => {
    const slots = await getSlots('sabarimala', TOMORROW)
    const full = slots.find((slot) => slot.remaining === 0 && !hasStarted(slot.startsAt))
    if (!full) throw new Error('no full future slot in seed')

    await expect(
      createBooking({
        slotId: full.id,
        name: 'Asha',
        phone: '9876543210',
        tickets: 1,
        idempotencyKey: newKey(),
      }),
    ).rejects.toMatchObject({ code: 'slot_full' })
  })

  it('rejects booking a slot that has already started', async () => {
    const slots = await getSlots('sabarimala', TODAY)
    const started = slots.find((slot) => hasStarted(slot.startsAt))
    if (!started) throw new Error('no started slot in seed')

    await expect(
      createBooking({
        slotId: started.id,
        name: 'Asha',
        phone: '9876543210',
        tickets: 1,
        idempotencyKey: newKey(),
      }),
    ).rejects.toMatchObject({ code: 'slot_started' })
  })

  it('rejects an invalid phone number', async () => {
    const slot = await firstBookableSlot()
    await expect(
      createBooking({
        slotId: slot.id,
        name: 'Asha',
        phone: '123',
        tickets: 1,
        idempotencyKey: newKey(),
      }),
    ).rejects.toMatchObject({ code: 'invalid_request' })
  })
})

describe('getBookings and cancelBooking', () => {
  beforeEach(deterministic)

  it('returns only the bookings for the given phone number', async () => {
    const slots = await getSlots('guruvayur', TOMORROW)
    const slot = slots.find((candidate) => candidate.remaining > 2 && !hasStarted(candidate.startsAt))
    if (!slot) throw new Error('no bookable slot')

    await createBooking({
      slotId: slot.id,
      name: 'Asha',
      phone: '9876543210',
      tickets: 1,
      idempotencyKey: newKey(),
    })
    await createBooking({
      slotId: slot.id,
      name: 'Biju',
      phone: '9000000000',
      tickets: 1,
      idempotencyKey: newKey(),
    })

    const asha = await getBookings('9876543210')
    expect(asha).toHaveLength(1)
    expect(asha[0]?.name).toBe('Asha')
  })

  it('releases the tickets back to the slot when a booking is cancelled', async () => {
    const slots = await getSlots('guruvayur', TOMORROW)
    const slot = slots.find((candidate) => candidate.remaining > 2 && !hasStarted(candidate.startsAt))
    if (!slot) throw new Error('no bookable slot')
    const before = __getSlotById(slot.id)?.remaining ?? 0

    const booking = await createBooking({
      slotId: slot.id,
      name: 'Asha',
      phone: '9876543210',
      tickets: 2,
      idempotencyKey: newKey(),
    })
    expect(__getSlotById(slot.id)?.remaining).toBe(before - 2)

    const cancelled = await cancelBooking(booking.id)
    expect(cancelled.status).toBe('cancelled')
    expect(__getSlotById(slot.id)?.remaining).toBe(before)
  })
})

describe('createBooking idempotency', () => {
  beforeEach(deterministic)

  /** A bookable slot with a known 10 tickets remaining. */
  async function slotWithTenRemaining() {
    const slots = await getSlots('guruvayur', TODAY)
    const found = slots.find(
      (candidate) => candidate.remaining > 0 && !hasStarted(candidate.startsAt),
    )
    if (!found) throw new Error('no bookable slot in seed')
    const live = __getSlotById(found.id)
    if (!live) throw new Error('slot missing')
    live.remaining = 10
    return live
  }

  /**
   * The caller's view of a request whose response was lost on the way back: the API processes it
   * and keeps the booking, but the caller only ever learns that the call failed.
   */
  async function loseResponse(request: Promise<Booking>): Promise<never> {
    await request.catch(() => undefined)
    throw new ApiError('network', 'The network request failed. Please try again.')
  }

  it('returns the original booking when a request whose response was lost is retried', async () => {
    const slot = await slotWithTenRemaining()
    const request = {
      slotId: slot.id,
      name: 'Asha',
      phone: '9876543210',
      tickets: 2,
      idempotencyKey: 'attempt-lost-response',
    }

    await expect(loseResponse(createBooking(request))).rejects.toMatchObject({ code: 'network' })

    // The request did reach the API: the booking exists even though the caller never saw it.
    const afterFirst = __getAllBookings()
    expect(afterFirst).toHaveLength(1)
    expect(__getSlotById(slot.id)?.remaining).toBe(8)

    const retry = await createBooking(request)

    expect(__getAllBookings()).toHaveLength(1)
    expect(retry.id).toBe(afterFirst[0]?.id)
    expect(retry.tickets).toBe(2)
    expect(__getSlotById(slot.id)?.remaining).toBe(8)
  })

  it('creates a second booking when a new attempt carries a new key', async () => {
    const slot = await slotWithTenRemaining()
    const details = { slotId: slot.id, name: 'Asha', phone: '9876543210', tickets: 2 }

    const first = await createBooking({ ...details, idempotencyKey: 'attempt-1' })
    const second = await createBooking({ ...details, idempotencyKey: 'attempt-2' })

    expect(second.id).not.toBe(first.id)
    expect(__getAllBookings()).toHaveLength(2)
    expect(__getSlotById(slot.id)?.remaining).toBe(6)
  })

  it('books on retry when the failed request never reached the API', async () => {
    const slot = await slotWithTenRemaining()
    const request = {
      slotId: slot.id,
      name: 'Asha',
      phone: '9876543210',
      tickets: 2,
      idempotencyKey: 'attempt-never-arrived',
    }

    configureMockApi({ failureRate: 1 })
    await expect(createBooking(request)).rejects.toMatchObject({ code: 'network' })
    expect(__getAllBookings()).toHaveLength(0)

    configureMockApi({ failureRate: 0 })
    await createBooking(request)

    expect(__getAllBookings()).toHaveLength(1)
    expect(__getSlotById(slot.id)?.remaining).toBe(8)
  })

  it('answers a repeat of a key with the booking it already made, ignoring changed details', async () => {
    const slot = await slotWithTenRemaining()
    const request = {
      slotId: slot.id,
      name: 'Asha',
      phone: '9876543210',
      tickets: 2,
      idempotencyKey: 'attempt-edited',
    }

    const original = await createBooking(request)
    const repeat = await createBooking({ ...request, tickets: 5 })

    expect(repeat.id).toBe(original.id)
    expect(repeat.tickets).toBe(2)
    expect(__getAllBookings()).toHaveLength(1)
    expect(__getSlotById(slot.id)?.remaining).toBe(8)
  })

  it('rejects a request that carries no idempotency key', async () => {
    const slot = await slotWithTenRemaining()

    await expect(
      createBooking({
        slotId: slot.id,
        name: 'Asha',
        phone: '9876543210',
        tickets: 1,
        idempotencyKey: '  ',
      }),
    ).rejects.toMatchObject({ code: 'invalid_request' })
    expect(__getAllBookings()).toHaveLength(0)
  })
})
