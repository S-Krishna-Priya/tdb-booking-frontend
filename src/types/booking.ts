export type TempleId = string

export type SlotId = string

export type BookingId = string

export interface Temple {
  id: TempleId
  name: string
}

export interface Slot {
  id: SlotId
  templeId: TempleId
  startsAt: string
  date: string
  capacity: number
  remaining: number
}

export type BookingStatus = 'confirmed' | 'cancelled'

export interface Booking {
  id: BookingId
  slotId: SlotId
  templeId: TempleId
  templeName: string
  startsAt: string
  date: string
  name: string
  phone: string
  tickets: number
  status: BookingStatus
  createdAt: string
}

export type IdempotencyKey = string

export interface CreateBookingRequest {
  slotId: SlotId
  name: string
  phone: string
  tickets: number
  /**
   * Identifies one logical booking attempt. The same key is sent again when that attempt is
   * retried, so the API can recognise the repeat and return the booking it already made rather
   * than creating a second one. A genuinely new booking carries a new key.
   */
  idempotencyKey: IdempotencyKey
}

/** The part of a booking request the devotee fills in; the page adds the slot and the key. */
export type BookingDetails = Pick<CreateBookingRequest, 'name' | 'phone' | 'tickets'>

export class ApiError extends Error {
  readonly code: ApiErrorCode

  constructor(code: ApiErrorCode, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

export type ApiErrorCode =
  | 'network'
  | 'slot_not_found'
  | 'slot_full'
  | 'slot_started'
  | 'booking_not_found'
  | 'booking_already_cancelled'
  | 'invalid_request'
