import type { BookingsMessages } from '../../i18n/translations'
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

/**
 * `startsAt` is an absolute instant, so the comparison is timezone independent:
 * only the display is pinned to IST. `now` is injected so the decision is
 * deterministic in tests, and `messages` so the reason reads in the chosen language.
 */
export function cancelAvailability(
  booking: Booking,
  now: Date,
  messages: BookingsMessages,
): CancelAvailability {
  if (booking.status === 'cancelled') return { kind: 'none' }
  if (hasStarted(booking.startsAt, now)) {
    return { kind: 'blocked', reason: messages.startedReason }
  }
  return { kind: 'available' }
}

export function statusLabel(status: BookingStatus, messages: BookingsMessages): string {
  return status === 'cancelled' ? messages.cancelled : messages.confirmed
}
