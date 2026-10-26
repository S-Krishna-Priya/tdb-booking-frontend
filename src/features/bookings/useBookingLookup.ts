import { useCallback, useEffect, useRef, useState } from 'react'
import { cancelBooking, getBookings } from '../../api/mockApi'
import type { Booking, BookingId } from '../../types/booking'
import { errorMessage } from '../../utils/errors'

interface Lookup {
  phone: string
  attempt: number
}

type LookupResult =
  | { key: string; ok: true; bookings: readonly Booking[] }
  | { key: string; ok: false; message: string }

export type BookingLookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; phone: string; message: string }
  | { status: 'success'; phone: string; bookings: readonly Booking[] }

export interface BookingLookup {
  state: BookingLookupState
  cancelError: string | null
  startLookup: (phone: string) => void
  cancel: (bookingId: BookingId) => void
}

function lookupKey(lookup: Lookup | null): string {
  return lookup === null ? '' : `${lookup.phone}|${String(lookup.attempt)}`
}

function toState(lookup: Lookup | null, result: LookupResult | null, key: string): BookingLookupState {
  if (lookup === null) return { status: 'idle' }
  if (result === null || result.key !== key) return { status: 'loading' }
  if (!result.ok) return { status: 'error', phone: lookup.phone, message: result.message }
  return { status: 'success', phone: lookup.phone, bookings: result.bookings }
}

export function useBookingLookup(): BookingLookup {
  const [lookup, setLookup] = useState<Lookup | null>(null)
  const [result, setResult] = useState<LookupResult | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [pendingIds, setPendingIds] = useState<readonly BookingId[]>([])
  const attempts = useRef(0)
  const mounted = useRef(true)

  const key = lookupKey(lookup)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (lookup === null) return undefined
    let active = true
    getBookings(lookup.phone)
      .then((bookings) => {
        if (active) setResult({ key, ok: true, bookings })
      })
      .catch((error: unknown) => {
        if (active) setResult({ key, ok: false, message: errorMessage(error) })
      })
    return () => {
      active = false
    }
  }, [lookup, key])

  const startLookup = useCallback((phone: string) => {
    attempts.current += 1
    setCancelError(null)
    setLookup({ phone, attempt: attempts.current })
  }, [])

  const cancel = useCallback(
    (bookingId: BookingId) => {
      const previous = result
      if (previous === null || !previous.ok) return
      if (pendingIds.includes(bookingId)) return

      const target = previous.bookings.find((booking) => booking.id === bookingId)
      if (target === undefined || target.status !== 'confirmed') return

      setCancelError(null)
      setPendingIds((ids) => [...ids, bookingId])

      // Optimistic: the devotee sees "Cancelled" before the request is sent.
      setResult({
        ...previous,
        bookings: previous.bookings.map(
          (booking): Booking =>
            booking.id === bookingId ? { ...booking, status: 'cancelled' } : booking,
        ),
      })

      cancelBooking(bookingId)
        .then((confirmed) => {
          if (!mounted.current) return
          setResult((current) => {
            if (current === null || !current.ok || current.key !== previous.key) return current
            return {
              ...current,
              bookings: current.bookings.map((booking) =>
                booking.id === bookingId ? confirmed : booking,
              ),
            }
          })
        })
        .catch((error: unknown) => {
          if (!mounted.current) return
          // Roll back to the exact booking object that was on screen before.
          setResult((current) => {
            if (current === null || !current.ok || current.key !== previous.key) return current
            return {
              ...current,
              bookings: current.bookings.map((booking) =>
                booking.id === bookingId ? target : booking,
              ),
            }
          })
          setCancelError(errorMessage(error))
        })
        .finally(() => {
          if (!mounted.current) return
          setPendingIds((ids) => ids.filter((id) => id !== bookingId))
        })
    },
    [result, pendingIds],
  )

  return { state: toState(lookup, result, key), cancelError, startLookup, cancel }
}
