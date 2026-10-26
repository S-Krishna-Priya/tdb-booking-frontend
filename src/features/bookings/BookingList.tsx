import { useLanguage } from '../../i18n/context'
import type { Booking, BookingId } from '../../types/booking'
import { formatIstDateKey, formatIstTime } from '../../utils/datetime'
import { cancelAvailability, statusLabel } from './cancellation'

interface BookingListProps {
  bookings: readonly Booking[]
  cancelErrors: Readonly<Record<BookingId, string>>
  now: Date
  confirmingId: BookingId | null
  onRequestConfirm: (bookingId: BookingId) => void
  onDismissConfirm: () => void
  onConfirmCancel: (bookingId: BookingId) => void
}

const BUTTON_CLASS =
  'rounded-md px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500'

export function BookingList({
  bookings,
  cancelErrors,
  now,
  confirmingId,
  onRequestConfirm,
  onDismissConfirm,
  onConfirmCancel,
}: BookingListProps) {
  const { t, locale } = useLanguage()

  return (
    <ul className="mt-4 space-y-4">
      {bookings.map((booking) => {
        const availability = cancelAvailability(booking, now, t.bookings)
        const titleId = `booking-${booking.id}-temple`
        const promptId = `booking-${booking.id}-prompt`
        const date = formatIstDateKey(booking.date, locale)
        const time = formatIstTime(booking.startsAt, locale)

        return (
          <li key={booking.id}>
            <article
              aria-labelledby={titleId}
              className="rounded-lg border border-slate-300 bg-white p-4"
            >
              <h3 id={titleId} className="text-base font-semibold text-slate-900">
                {booking.templeName}
              </h3>

              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-slate-600">{t.bookings.date}</dt>
                  <dd className="font-medium text-slate-900">{date}</dd>
                </div>
                <div>
                  <dt className="text-slate-600">{t.bookings.startTime}</dt>
                  <dd className="font-medium text-slate-900">
                    {time} {t.bookings.timeZoneSuffix}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-600">{t.bookings.tickets}</dt>
                  <dd className="font-medium text-slate-900">{booking.tickets}</dd>
                </div>
                <div>
                  <dt className="text-slate-600">{t.bookings.status}</dt>
                  <dd className="font-medium text-slate-900">
                    {statusLabel(booking.status, t.bookings)}
                  </dd>
                </div>
              </dl>

              {cancelErrors[booking.id] !== undefined ? (
                <p
                  role="alert"
                  className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                >
                  {cancelErrors[booking.id]}
                </p>
              ) : null}

              {availability.kind === 'blocked' ? (
                <p className="mt-3 rounded-md bg-slate-100 p-3 text-sm text-slate-700">
                  {availability.reason}
                </p>
              ) : null}

              {availability.kind === 'available' && confirmingId !== booking.id ? (
                <button
                  type="button"
                  onClick={() => {
                    onRequestConfirm(booking.id)
                  }}
                  aria-label={t.bookings.cancelFor(booking.templeName)}
                  className={`${BUTTON_CLASS} mt-3 border border-red-300 text-red-800 hover:bg-red-50`}
                >
                  {t.bookings.cancel}
                </button>
              ) : null}

              {availability.kind === 'available' && confirmingId === booking.id ? (
                <div
                  role="group"
                  aria-labelledby={promptId}
                  className="mt-3 rounded-md border border-red-200 bg-red-50 p-3"
                >
                  <p id={promptId} className="text-sm text-red-900">
                    {t.bookings.confirmPrompt(booking.tickets, booking.templeName, date, time)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onConfirmCancel(booking.id)
                      }}
                      className={`${BUTTON_CLASS} bg-red-700 text-white hover:bg-red-800`}
                    >
                      {t.bookings.confirmCancel}
                    </button>
                    <button
                      type="button"
                      onClick={onDismissConfirm}
                      className={`${BUTTON_CLASS} border border-slate-300 text-slate-800 hover:bg-white`}
                    >
                      {t.bookings.keepBooking}
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          </li>
        )
      })}
    </ul>
  )
}
