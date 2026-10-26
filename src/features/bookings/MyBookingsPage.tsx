import { useState, type FormEvent } from 'react'
import { useLanguage } from '../../i18n/context'
import type { BookingId } from '../../types/booking'
import { BookingList } from './BookingList'
import { validatePhone } from './validation'
import { useBookingLookup } from './useBookingLookup'

export function MyBookingsPage() {
  const { t } = useLanguage()
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<BookingId | null>(null)
  const { state, cancelErrors, startLookup, cancel } = useBookingLookup()

  const loading = state.status === 'loading'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    const error = validatePhone(phone, t.validation)
    setPhoneError(error)
    if (error !== null) return
    setConfirmingId(null)
    startLookup(phone.trim())
  }

  function handleConfirmCancel(bookingId: BookingId) {
    setConfirmingId(null)
    cancel(bookingId)
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t.bookings.title}</h1>
      <p className="mt-2 text-sm text-slate-600">{t.bookings.intro}</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 sm:flex sm:items-end sm:gap-3">
        <div className="sm:flex-1">
          <label htmlFor="lookup-phone" className="text-sm font-medium text-slate-700">
            {t.bookings.phone}
          </label>
          <input
            id="lookup-phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value)
            }}
            aria-invalid={phoneError ? true : undefined}
            aria-describedby={phoneError ? 'lookup-phone-error' : undefined}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-3 w-full rounded-md bg-amber-600 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:mt-0 sm:w-auto"
        >
          {loading ? t.bookings.finding : t.bookings.find}
        </button>
      </form>

      {phoneError ? (
        <p id="lookup-phone-error" className="mt-2 text-sm text-red-700">
          {phoneError}
        </p>
      ) : null}

      {state.status === 'idle' ? (
        <p className="mt-6 text-sm text-slate-700">{t.bookings.idle}</p>
      ) : null}

      {loading ? (
        <p role="status" className="mt-6 text-sm text-slate-600">
          {t.bookings.loading}
        </p>
      ) : null}

      {state.status === 'error' ? (
        <div role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{state.message}</p>
          <button
            type="button"
            onClick={() => {
              startLookup(state.phone)
            }}
            className="mt-2 rounded border border-red-300 px-3 py-1 text-sm font-medium text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            {t.bookings.retry}
          </button>
        </div>
      ) : null}

      {state.status === 'success' && state.bookings.length === 0 ? (
        <p className="mt-6 rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">
          {t.bookings.empty(state.phone)}
        </p>
      ) : null}

      {state.status === 'success' && state.bookings.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-base font-semibold text-slate-900">
            {t.bookings.heading(state.phone)}
          </h2>
          <BookingList
            bookings={state.bookings}
            cancelErrors={cancelErrors}
            now={new Date()}
            confirmingId={confirmingId}
            onRequestConfirm={setConfirmingId}
            onDismissConfirm={() => {
              setConfirmingId(null)
            }}
            onConfirmCancel={handleConfirmCancel}
          />
        </section>
      ) : null}
    </main>
  )
}
