import type { Slot } from '../../types/booking'

export interface BookingFormErrors {
  name?: string
  phone?: string
  tickets?: string
}

export function validateBooking(
  values: { name: string; phone: string; tickets: string },
  slot: Slot | null,
): BookingFormErrors {
  const errors: BookingFormErrors = {}

  if (!values.name.trim()) errors.name = 'Enter the devotee name.'

  const phone = values.phone.trim()
  if (!phone) errors.phone = 'Enter a phone number.'
  else if (!/^[0-9]{10}$/.test(phone)) errors.phone = 'Enter a valid 10-digit phone number.'

  const tickets = Number(values.tickets)
  if (!values.tickets.trim()) errors.tickets = 'Enter the number of tickets.'
  else if (!Number.isInteger(tickets) || tickets < 1) errors.tickets = 'Enter at least one ticket.'
  else if (slot && tickets > slot.remaining) {
    errors.tickets = `Only ${slot.remaining} tickets remain in this slot.`
  }

  return errors
}
