import { useState, type FormEvent } from 'react'
import { useLanguage } from '../../i18n/context'
import type { BookingDetails, Slot } from '../../types/booking'
import { validateBooking, type BookingFormErrors } from './validation'

interface BookingFormProps {
  slot: Slot | null
  submitting: boolean
  onSubmit: (details: BookingDetails) => void
}

const FIELD_CLASS =
  'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500'

export function BookingForm({ slot, submitting, onSubmit }: BookingFormProps) {
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [tickets, setTickets] = useState('1')
  const [errors, setErrors] = useState<BookingFormErrors>({})

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validateBooking({ name, phone, tickets }, slot, t.validation)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    onSubmit({ name: name.trim(), phone: phone.trim(), tickets: Number(tickets) })
  }

  const disabled = slot === null || submitting

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
      <h2 className="text-base font-semibold text-slate-900">{t.booking.yourDetails}</h2>

      <div>
        <label htmlFor="booking-name" className="text-sm font-medium text-slate-700">
          {t.booking.name}
        </label>
        <input
          id="booking-name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? 'booking-name-error' : undefined}
          className={FIELD_CLASS}
        />
        {errors.name ? (
          <p id="booking-name-error" className="mt-1 text-sm text-red-700">
            {errors.name}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="booking-phone" className="text-sm font-medium text-slate-700">
          {t.booking.phone}
        </label>
        <input
          id="booking-phone"
          name="phone"
          inputMode="numeric"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          aria-invalid={errors.phone ? true : undefined}
          aria-describedby={errors.phone ? 'booking-phone-error' : undefined}
          className={FIELD_CLASS}
        />
        {errors.phone ? (
          <p id="booking-phone-error" className="mt-1 text-sm text-red-700">
            {errors.phone}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="booking-tickets" className="text-sm font-medium text-slate-700">
          {t.booking.tickets}
        </label>
        <input
          id="booking-tickets"
          name="tickets"
          type="number"
          min={1}
          max={slot?.remaining ?? 1}
          value={tickets}
          onChange={(event) => setTickets(event.target.value)}
          aria-invalid={errors.tickets ? true : undefined}
          aria-describedby={errors.tickets ? 'booking-tickets-error' : undefined}
          className={FIELD_CLASS}
        />
        {errors.tickets ? (
          <p id="booking-tickets-error" className="mt-1 text-sm text-red-700">
            {errors.tickets}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={disabled}
        className="rounded-md bg-amber-600 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        {submitting ? t.booking.booking : t.booking.book}
      </button>
      {slot === null ? <p className="text-sm text-slate-600">{t.booking.selectSlot}</p> : null}
    </form>
  )
}
