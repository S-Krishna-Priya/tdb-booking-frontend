import type { ValidationMessages } from '../../i18n/translations'
import type { Slot } from '../../types/booking'

export interface BookingFormErrors {
  name?: string
  phone?: string
  tickets?: string
}

/**
 * Validation decides which rule was broken; the caller's message set decides how that reads. The
 * messages are passed in rather than imported so the rules stay pure and the text follows the
 * interface language.
 */
export function validateBooking(
  values: { name: string; phone: string; tickets: string },
  slot: Slot | null,
  messages: ValidationMessages,
): BookingFormErrors {
  const errors: BookingFormErrors = {}

  if (!values.name.trim()) errors.name = messages.nameRequired

  const phone = values.phone.trim()
  if (!phone) errors.phone = messages.phoneRequired
  else if (!/^[0-9]{10}$/.test(phone)) errors.phone = messages.phoneInvalid

  const tickets = Number(values.tickets)
  if (!values.tickets.trim()) errors.tickets = messages.ticketsRequired
  else if (!Number.isInteger(tickets) || tickets < 1) errors.tickets = messages.ticketsMinimum
  else if (slot && tickets > slot.remaining) {
    errors.tickets = messages.ticketsExceedRemaining(slot.remaining)
  }

  return errors
}
