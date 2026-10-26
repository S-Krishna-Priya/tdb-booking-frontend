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

export interface CreateBookingRequest {
  slotId: SlotId
  name: string
  phone: string
  tickets: number
}

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
