import type { Booking, BookingStatus } from '../../types/booking'
import { hasStarted } from '../../utils/datetime'

/**
 * Why a booking cannot be cancelled, or that it can.
 *
 * `none` covers a booking that is already cancelled: there is nothing to cancel
 * and nothing to explain. `blocked` carries the reason that must stay visible.
 */
export type CancelAvailability =
  | { kind: 'available' }
  | { kind: 'blocked'; reason: string }
  | { kind: 'none' }

const SLOT_STARTED_REASON =
  'This slot has already started, so this booking can no longer be cancelled.'

/**
 * `startsAt` is an absolute instant, so the comparison is timezone independent:
 * only the display is pinned to IST. `now` is injected so the decision is
 * deterministic in tests.
 */
export function cancelAvailability(booking: Booking, now: Date): CancelAvailability {
  if (booking.status === 'cancelled') return { kind: 'none' }
  if (hasStarted(booking.startsAt, now)) return { kind: 'blocked', reason: SLOT_STARTED_REASON }
  return { kind: 'available' }
}

export function statusLabel(status: BookingStatus): string {
  return status === 'cancelled' ? 'Cancelled' : 'Confirmed'
}
