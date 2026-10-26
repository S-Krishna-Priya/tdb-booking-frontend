import { useEffect, useMemo, useState } from 'react'
import { createBooking, getTemples } from '../../api/mockApi'
import { useSlots } from '../../hooks/useSlots'
import { useUrlSelection } from '../../hooks/useUrlSelection'
import type { Booking, Temple } from '../../types/booking'
import { formatIstDateKey, istDateKey } from '../../utils/datetime'
import { errorMessage } from '../../utils/errors'
import { bookingDates, type Selection } from '../../utils/selection'
import { BookingForm } from './BookingForm'
import { SlotList } from './SlotList'

type Loaded<T> =
  | { key: string; ok: true; data: T; at: Date }
  | { key: string; ok: false; message: string }

/**
 * Everything the devotee has done to one selection. It carries the selection it belongs to, so
 * changing temple or date — including by going Back — never shows a slot, a confirmation or an
 * error that belonged to a selection they have already left.
 */
interface SelectionWork {
  key: string
  selectedSlotId: string | null
  confirmation: Booking | null
  error: string | null
}

function emptyWork(key: string): SelectionWork {
  return { key, selectedSlotId: null, confirmation: null, error: null }
}

function selectionKeyOf(selection: Selection): string {
  return `${selection.templeId}|${selection.date}`
}

export function BookingPage() {
  const todayKey = istDateKey(new Date())
  const dates = useMemo(() => bookingDates(), [todayKey])
  const { selection, select, adoptKnownTemple } = useUrlSelection(dates)
  const [temples, setTemples] = useState<Loaded<Temple[]> | null>(null)
  const [templeReload, setTempleReload] = useState(0)
  const [work, setWork] = useState<SelectionWork>(() => emptyWork(''))
  const [submitting, setSubmitting] = useState(false)

  const templeKey = `temples:${templeReload}`
  const selectionKey = selectionKeyOf(selection)
  const currentWork = work.key === selectionKey ? work : emptyWork(selectionKey)
  const confirmation = currentWork.confirmation

  useEffect(() => {
    let active = true
    getTemples()
      .then((data) => {
        if (!active) return
        setTemples({ key: templeKey, ok: true, data, at: new Date() })
        adoptKnownTemple(data.map((temple) => temple.id))
      })
      .catch((error: unknown) => {
        if (active) setTemples({ key: templeKey, ok: false, message: errorMessage(error) })
      })
    return () => {
      active = false
    }
  }, [templeKey, adoptKnownTemple])

  const { state: slots, reload: reloadSlots } = useSlots(selection.templeId, selection.date)

  const templesLoading = temples === null || temples.key !== templeKey
  const slotData = slots.status === 'success' ? slots.data : null
  const selectedSlot = slotData?.find((slot) => slot.id === currentWork.selectedSlotId) ?? null

  function handleSelectSlot(slotId: string) {
    setWork({ ...currentWork, selectedSlotId: slotId, error: null })
  }

  async function book(details: { name: string; phone: string; tickets: number }) {
    if (!selectedSlot) return
    const key = selectionKey
    setSubmitting(true)
    setWork({ ...currentWork, error: null, confirmation: null })
    try {
      const booking = await createBooking({ slotId: selectedSlot.id, ...details })
      setWork({ key, selectedSlotId: null, confirmation: booking, error: null })
      reloadSlots()
    } catch (error) {
      setWork((previous) => ({ ...previous, key, error: errorMessage(error) }))
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
            value={selection.templeId}
            onChange={(event) => select({ templeId: event.target.value })}
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
              <option value={selection.templeId}>Loading temples…</option>
            )}
          </select>
        </div>

        <div>
          <label htmlFor="date" className="text-sm font-medium text-slate-700">
            Date
          </label>
          <select
            id="date"
            value={selection.date}
            onChange={(event) => select({ date: event.target.value })}
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

      {slots.status === 'loading' ? (
        <p role="status" className="mt-6 text-sm text-slate-600">
          Loading slots…
        </p>
      ) : null}

      {slots.status === 'error' ? (
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
            selectedSlotId={currentWork.selectedSlotId}
            onSelect={handleSelectSlot}
            now={slots.status === 'success' ? slots.loadedAt : new Date()}
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

      {currentWork.error ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {currentWork.error}
        </p>
      ) : null}
    </main>
  )
}
