import {
  ApiError,
  type Booking,
  type BookingId,
  type CreateBookingRequest,
  type IdempotencyKey,
  type Slot,
  type SlotId,
  type Temple,
} from '../types/booking'
import { addIstDays, hasStarted, istDateKey, istSlotInstant } from '../utils/datetime'

export interface MockApiConfig {
  failureRate: number
  minDelayMs: number
  maxDelayMs: number
}

const DEFAULT_CONFIG: MockApiConfig = {
  failureRate: 0.2,
  minDelayMs: 200,
  maxDelayMs: 1500,
}

let config: MockApiConfig = { ...DEFAULT_CONFIG }

export function configureMockApi(partial: Partial<MockApiConfig>): void {
  config = { ...config, ...partial }
}

export function getMockApiConfig(): MockApiConfig {
  return { ...config }
}

const TEMPLES: readonly Temple[] = [
  { id: 'sabarimala', name: 'Sabarimala Sree Dharmasastha Temple' },
  { id: 'guruvayur', name: 'Guruvayur Sree Krishna Temple' },
  { id: 'padmanabhaswamy', name: 'Sree Padmanabhaswamy Temple' },
  { id: 'chottanikkara', name: 'Chottanikkara Bhagavathy Temple' },
]

const SLOT_HOURS: readonly number[] = [5, 8, 11, 14, 17, 20]

interface SlotSeedShape {
  capacity: number
  booked: number
}

function seedShape(dayOffset: number, hourIndex: number): SlotSeedShape {
  const capacity = 20 + ((dayOffset + hourIndex) % 3) * 10
  if (hourIndex === 1) return { capacity, booked: capacity }
  if (hourIndex === 3) return { capacity: 30, booked: 20 }
  const booked = ((dayOffset * 7 + hourIndex * 3) % (capacity - 4)) + 1
  return { capacity, booked }
}

let slots: Slot[] = []
let bookings: Booking[] = []
let bookingCounter = 0

/**
 * The bookings this API has already made, keyed by the idempotency key of the request that made
 * them. A repeat of a key that is already in here is answered with the original booking, so a
 * retry of a request that reached the API cannot book twice. In a real backend this would be
 * durable storage with an expiry window; here it lives for the lifetime of the module.
 */
const processedKeys = new Map<IdempotencyKey, Booking>()

/** Every idempotency key `createBooking` has been called with, in order. Test seam. */
let requestedKeys: IdempotencyKey[] = []

/** Set while requests are held open by `__holdRequests`. */
let heldRequests: { promise: Promise<void>; release: () => void } | null = null

/** Bumped by `resetMockApi`, so a request that was in flight across a reset is abandoned. */
let generation = 0

/**
 * Test seam: hold every request that starts from now on, so a test can act while a request is in
 * flight without depending on the simulated latency. Returns the function that lets them finish.
 */
export function __holdRequests(): () => void {
  releaseHeldRequests()
  let release = (): void => undefined
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  const held = { promise, release }
  heldRequests = held
  return () => {
    if (heldRequests === held) heldRequests = null
    held.release()
  }
}

function releaseHeldRequests(): void {
  const held = heldRequests
  heldRequests = null
  held?.release()
}

function buildSeed(now: Date): Slot[] {
  const today = istDateKey(now)
  const seeded: Slot[] = []

  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    const date = addIstDays(today, dayOffset)
    for (let hourIndex = 0; hourIndex < SLOT_HOURS.length; hourIndex += 1) {
      const hour = SLOT_HOURS[hourIndex] ?? 0
      for (const temple of TEMPLES) {
        const { capacity, booked } = seedShape(dayOffset, hourIndex)
        seeded.push({
          id: `${temple.id}-${date}-${String(hour).padStart(2, '0')}`,
          templeId: temple.id,
          startsAt: istSlotInstant(date, hour),
          date,
          capacity,
          remaining: Math.max(0, capacity - booked),
        })
      }
    }
  }

  for (const temple of TEMPLES) {
    const started = new Date(now.getTime() - 2 * 60 * 60 * 1000)
    seeded.push({
      id: `${temple.id}-${today}-started`,
      templeId: temple.id,
      startsAt: started.toISOString(),
      date: today,
      capacity: 25,
      remaining: 12,
    })
  }

  return seeded
}

export function resetMockApi(now: Date = new Date()): void {
  config = { ...DEFAULT_CONFIG }
  slots = buildSeed(now)
  bookings = []
  bookingCounter = 0
  processedKeys.clear()
  requestedKeys = []
  generation += 1
  releaseHeldRequests()
}

resetMockApi()

export function __getSlotById(slotId: SlotId): Slot | undefined {
  return slots.find((slot) => slot.id === slotId)
}

export function __getAllBookings(): readonly Booking[] {
  return bookings
}

export function __clearSlots(): void {
  slots = []
}

export function __setSlots(next: readonly Slot[]): void {
  slots = next.map((slot) => ({ ...slot }))
}

export function __getCreateBookingKeys(): readonly IdempotencyKey[] {
  return requestedKeys
}

function delay(): Promise<void> {
  const span = Math.max(0, config.maxDelayMs - config.minDelayMs)
  const ms = config.minDelayMs + Math.random() * span
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function simulateNetwork(): Promise<void> {
  const startedIn = generation
  if (heldRequests) await heldRequests.promise
  await delay()
  // A request still in flight when the API was reset is abandoned rather than applied to the
  // fresh state, so one test cannot book into the next one.
  const abandoned = generation !== startedIn
  if (abandoned || (config.failureRate > 0 && Math.random() < config.failureRate)) {
    throw new ApiError('network', 'The network request failed. Please try again.')
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export async function getTemples(): Promise<Temple[]> {
  await simulateNetwork()
  return clone([...TEMPLES])
}

export async function getSlots(templeId: string, date: string): Promise<Slot[]> {
  await simulateNetwork()
  return clone(
    slots
      .filter((slot) => slot.templeId === templeId && slot.date === date)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
  )
}

export async function createBooking(request: CreateBookingRequest): Promise<Booking> {
  const key = request.idempotencyKey.trim()
  requestedKeys.push(key)

  await simulateNetwork()

  if (!key) {
    throw new ApiError('invalid_request', 'A booking request needs an idempotency key.')
  }

  // A repeat of a key this API has already booked is the same logical booking arriving twice,
  // so answer it with the booking that was made the first time and change nothing.
  const alreadyBooked = processedKeys.get(key)
  if (alreadyBooked) return clone(alreadyBooked)

  const slot = slots.find((candidate) => candidate.id === request.slotId)
  if (!slot) throw new ApiError('slot_not_found', 'That slot no longer exists.')

  if (!Number.isInteger(request.tickets) || request.tickets < 1) {
    throw new ApiError('invalid_request', 'Enter at least one ticket.')
  }
  if (!request.name.trim()) {
    throw new ApiError('invalid_request', 'Enter the devotee name.')
  }
  if (!/^[0-9]{10}$/.test(request.phone.trim())) {
    throw new ApiError('invalid_request', 'Enter a valid 10-digit phone number.')
  }
  if (hasStarted(slot.startsAt)) {
    throw new ApiError('slot_started', 'This slot has already started.')
  }
  if (slot.remaining <= 0) {
    throw new ApiError('slot_full', 'This slot is full.')
  }
  if (request.tickets > slot.remaining) {
    throw new ApiError('slot_full', `Only ${slot.remaining} tickets remain in this slot.`)
  }

  slot.remaining -= request.tickets
  bookingCounter += 1

  const temple = TEMPLES.find((candidate) => candidate.id === slot.templeId)
  const booking: Booking = {
    id: `bkg-${bookingCounter}`,
    slotId: slot.id,
    templeId: slot.templeId,
    templeName: temple?.name ?? slot.templeId,
    startsAt: slot.startsAt,
    date: slot.date,
    name: request.name.trim(),
    phone: request.phone.trim(),
    tickets: request.tickets,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  }

  bookings.push(booking)
  processedKeys.set(key, booking)
  return clone(booking)
}

export async function getBookings(phone: string): Promise<Booking[]> {
  await simulateNetwork()
  return clone(
    bookings
      .filter((booking) => booking.phone === phone.trim())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  )
}

export async function cancelBooking(bookingId: BookingId): Promise<Booking> {
  await simulateNetwork()

  const booking = bookings.find((candidate) => candidate.id === bookingId)
  if (!booking) throw new ApiError('booking_not_found', 'That booking no longer exists.')
  if (booking.status === 'cancelled') {
    throw new ApiError('booking_already_cancelled', 'That booking is already cancelled.')
  }
  if (hasStarted(booking.startsAt)) {
    throw new ApiError('slot_started', 'A booking cannot be cancelled once its slot has started.')
  }

  booking.status = 'cancelled'
  const slot = slots.find((candidate) => candidate.id === booking.slotId)
  if (slot) slot.remaining += booking.tickets

  return clone(booking)
}
