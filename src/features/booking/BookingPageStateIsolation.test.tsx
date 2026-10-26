import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as mockApi from '../../api/mockApi'
import { ApiError, type Booking, type Slot } from '../../types/booking'
import { addIstDays, istDateKey } from '../../utils/datetime'
import { BookingPage } from './BookingPage'

const TODAY = istDateKey(new Date())
const TOMORROW = addIstDays(TODAY, 1)

function slot(id: string, templeId: string, date: string, capacity: number, remaining: number): Slot {
  return {
    id,
    templeId,
    date,
    startsAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    capacity,
    remaining,
  }
}

const SABARIMALA_TODAY = slot('sab-today', 'sabarimala', TODAY, 30, 10)
const SABARIMALA_TOMORROW = slot('sab-tomorrow', 'sabarimala', TOMORROW, 50, 6)

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
}

function deferred<T>(): Deferred<T> {
  const handlers: { resolve?: (value: T) => void; reject?: (reason: unknown) => void } = {}
  const promise = new Promise<T>((resolve, reject) => {
    handlers.resolve = resolve
    handlers.reject = reject
  })
  return {
    promise,
    resolve: (value) => handlers.resolve?.(value),
    reject: (reason) => handlers.reject?.(reason),
  }
}

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  mockApi.resetMockApi()
  mockApi.configureMockApi({ failureRate: 0, minDelayMs: 0, maxDelayMs: 0 })
  mockApi.__setSlots([SABARIMALA_TODAY, SABARIMALA_TOMORROW])
})

describe('work belonging to one selection never leaks into another', () => {
  it('keeps the slot picked on the new date when a booking for the old date settles late', async () => {
    const user = userEvent.setup()
    const booking = deferred<Booking>()
    vi.spyOn(mockApi, 'createBooking').mockReturnValue(booking.promise)

    render(<BookingPage />)
    await screen.findByRole('radio', { name: /10 of 30 tickets remaining/ })

    // Start a booking on today.
    await user.click(screen.getByRole('radio', { name: /10 of 30 tickets remaining/ }))
    await user.type(screen.getByLabelText(/name/i), 'Asha')
    await user.type(screen.getByLabelText(/phone number/i), '9876543210')
    await user.click(screen.getByRole('button', { name: /^book$/i }))

    // Move to tomorrow and pick a slot there while that request is still in flight.
    await user.selectOptions(screen.getByRole('combobox', { name: /^date$/i }), TOMORROW)
    const tomorrowSlot = await screen.findByRole('radio', { name: /6 of 50 tickets remaining/ })
    await user.click(tomorrowSlot)
    expect(tomorrowSlot).toBeChecked()

    // The earlier selection's request now settles. It must not disturb this selection.
    await act(async () => {
      booking.reject(new ApiError('network', 'The network request failed. Please try again.'))
      await Promise.resolve()
    })

    expect(screen.getByRole('radio', { name: /6 of 50 tickets remaining/ })).toBeChecked()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows loading, not the old error, when returning to a selection that failed earlier', async () => {
    const requests = new Map<string, Deferred<Slot[]>>()
    vi.spyOn(mockApi, 'getSlots').mockImplementation((templeId: string, date: string) => {
      const request = deferred<Slot[]>()
      requests.set(`${templeId}|${date}`, request)
      return request.promise
    })

    async function requestFor(key: string): Promise<Deferred<Slot[]>> {
      await waitFor(() => {
        expect(requests.has(key)).toBe(true)
      })
      const request = requests.get(key)
      if (!request) throw new Error(`no request for ${key}`)
      return request
    }

    const user = userEvent.setup()
    render(<BookingPage />)

    // Today fails, so its error is on screen.
    const first = await requestFor(`sabarimala|${TODAY}`)
    await act(async () => {
      first.reject(new ApiError('network', 'The network request failed. Please try again.'))
      await Promise.resolve()
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(/network request failed/i)

    // Move to tomorrow and leave that request IN FLIGHT. Nothing overwrites the stored result,
    // so coming back builds the same key again and the earlier failure is still sitting there.
    await user.selectOptions(screen.getByRole('combobox', { name: /^date$/i }), TOMORROW)
    await requestFor(`sabarimala|${TOMORROW}`)

    // Back to today. A fresh request is in flight, so the screen must say loading rather than
    // re-show the error from the previous visit.
    await user.selectOptions(screen.getByRole('combobox', { name: /^date$/i }), TODAY)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/loading slots/i)
  })
})
