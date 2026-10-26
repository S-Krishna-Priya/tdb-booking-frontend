import { useEffect, useState } from 'react'
import { createBooking, getSlots, getTemples } from '../../api/mockApi'
import { ApiError, type Booking, type Slot, type Temple } from '../../types/booking'
import { addIstDays, formatIstDateKey, istDateKey } from '../../utils/datetime'
import { BookingForm } from './BookingForm'
import { SlotList } from './SlotList'

type Loaded<T> =
  | { key: string; ok: true; data: T; at: Date }
  | { key: string; ok: false; message: string }

function errorMessage(error: unknown): string {
  return error instanceof ApiError || error instanceof Error
    ? error.message
    : 'Something went wrong. Please try again.'
}

function nextSevenDays(): string[] {
  const today = istDateKey(new Date())
  return Array.from({ length: 7 }, (_, offset) => addIstDays(today, offset))
}

export function BookingPage() {
  const [temples, setTemples] = useState<Loaded<Temple[]> | null>(null)
  const [templeReload, setTempleReload] = useState(0)
  const [templeId, setTempleId] = useState('')
  const [date, setDate] = useState(() => istDateKey(new Date()))
  const [slots, setSlots] = useState<Loaded<Slot[]> | null>(null)
  const [slotReload, setSlotReload] = useState(0)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState<Booking | null>(null)
  const [bookingError, setBookingError] = useState<string | null>(null)

  const dates = nextSevenDays()
  const templeKey = `temples:${templeReload}`
  const slotKey = `${templeId}|${date}|${slotReload}`

  useEffect(() => {
    let active = true
    getTemples()
      .then((data) => {
        if (!active) return
        setTemples({ key: templeKey, ok: true, data, at: new Date() })
        setTempleId((current) => current || (data[0]?.id ?? ''))
      })
      .catch((error: unknown) => {
        if (active) setTemples({ key: templeKey, ok: false, message: errorMessage(error) })
      })
    return () => {
      active = false
    }
  }, [templeKey])

  useEffect(() => {
    if (!templeId || !date) return undefined
    let active = true
    getSlots(templeId, date)
      .then((data) => {
        if (active) setSlots({ key: slotKey, ok: true, data, at: new Date() })
      })
      .catch((error: unknown) => {
        if (active) setSlots({ key: slotKey, ok: false, message: errorMessage(error) })
      })
    return () => {
      active = false
    }
  }, [templeId, date, slotKey])

  const templesLoading = temples === null || temples.key !== templeKey
  const slotsLoading = !templeId || slots === null || slots.key !== slotKey
  const loadedSlots = !slotsLoading && slots.ok ? slots : null
  const slotData = loadedSlots?.data ?? null
  const selectedSlot = slotData?.find((slot) => slot.id === selectedSlotId) ?? null

  function reloadSlots() {
    setSlotReload((value) => value + 1)
  }

  function handleSelectSlot(slotId: string) {
    setSelectedSlotId(slotId)
    setBookingError(null)
  }

  function changeSelection(next: { templeId?: string; date?: string }) {
    if (next.templeId !== undefined) setTempleId(next.templeId)
    if (next.date !== undefined) setDate(next.date)
    setSelectedSlotId(null)
    setConfirmation(null)
    setBookingError(null)
  }

  async function book(details: { name: string; phone: string; tickets: number }) {
    if (!selectedSlot) return
    setSubmitting(true)
    setBookingError(null)
    setConfirmation(null)
    try {
      const booking = await createBooking({ slotId: selectedSlot.id, ...details })
      setConfirmation(booking)
      setSelectedSlotId(null)
      reloadSlots()
    } catch (error) {
      setBookingError(errorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Temple Darshan Booking</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="temple" className="text-sm font-medium text-slate-700">
            Temple
          </label>
          <select
            id="temple"
            value={templeId}
            onChange={(event) => changeSelection({ templeId: event.target.value })}
            disabled={templesLoading || !temples.ok}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            {!templesLoading && temples.ok ? (
              temples.data.map((temple) => (
                <option key={temple.id} value={temple.id}>
                  {temple.name}
                </option>
              ))
            ) : (
              <option value="">Loading temples…</option>
            )}
          </select>
        </div>

        <div>
          <label htmlFor="date" className="text-sm font-medium text-slate-700">
            Date
          </label>
          <select
            id="date"
            value={date}
            onChange={(event) => changeSelection({ date: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            {dates.map((value) => (
              <option key={value} value={value}>
                {formatIstDateKey(value)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!templesLoading && !temples.ok ? (
        <div role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{temples.message}</p>
          <button
            type="button"
            onClick={() => setTempleReload((value) => value + 1)}
            className="mt-2 rounded border border-red-300 px-3 py-1 text-sm font-medium text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            Retry
          </button>
        </div>
      ) : null}

      {slotsLoading ? (
        <p role="status" className="mt-6 text-sm text-slate-600">
          Loading slots…
        </p>
      ) : null}

      {!slotsLoading && !slots.ok ? (
        <div role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{slots.message}</p>
          <button
            type="button"
            onClick={reloadSlots}
            className="mt-2 rounded border border-red-300 px-3 py-1 text-sm font-medium text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            Retry
          </button>
        </div>
      ) : null}

      {slotData && slotData.length === 0 ? (
        <p className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          No slots are available for this temple on this date.
        </p>
      ) : null}

      {slotData && slotData.length > 0 ? (
        <>
          <SlotList
            slots={slotData}
            selectedSlotId={selectedSlotId}
            onSelect={handleSelectSlot}
            now={loadedSlots?.at ?? new Date()}
          />
          <BookingForm
            slot={selectedSlot}
            submitting={submitting}
            onSubmit={(details) => void book(details)}
          />
        </>
      ) : null}

      <div aria-live="polite" className="mt-6">
        {confirmation ? (
          <p
            role="status"
            className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-900"
          >
            Booked {confirmation.tickets} ticket{confirmation.tickets === 1 ? '' : 's'} for{' '}
            {confirmation.templeName}. Booking reference {confirmation.id}.
          </p>
        ) : null}
      </div>

      {bookingError ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {bookingError}
        </p>
      ) : null}
    </main>
  )
}
