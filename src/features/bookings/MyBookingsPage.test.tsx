import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../api/mockApi'
import { ApiError, type Booking, type Slot } from '../../types/booking'
import { IST_TIME_ZONE, istSlotInstant } from '../../utils/datetime'
import { MyBookingsPage } from './MyBookingsPage'

/**
 * The device is deliberately NOT in Indian Standard Time for every test in this
 * file, so any use of the device clock for display fails the assertions below.
 */
const DEVICE_TIME_ZONE = 'America/Los_Angeles'

const DATE_KEY = '2026-03-10'
/** 09:30 IST on 10 Mar 2026 — before both seeded slots start. */
const BOOKING_TIME = new Date('2026-03-10T04:00:00.000Z')
/** 11:30 IST on 10 Mar 2026 — after the 11:00 slot, before the 18:00 slot. */
const AFTER_MORNING_SLOT = new Date('2026-03-10T06:00:00.000Z')

const PHONE = '9876543210'
const OTHER_PHONE = '9000000000'
const EVENING_BOOKING = 'bkg-2'

const MORNING: Slot = {
  id: 'morning',
  templeId: 'guruvayur',
  date: DATE_KEY,
  startsAt: istSlotInstant(DATE_KEY, 11),
  capacity: 30,
  remaining: 10,
}

const EVENING: Slot = {
  id: 'evening',
  templeId: 'sabarimala',
  date: DATE_KEY,
  startsAt: istSlotInstant(DATE_KEY, 18),
  capacity: 40,
  remaining: 20,
}

interface Deferred<T> {
  promise: Promise<T>
  reject: (reason: unknown) => void
}

/** A request the test settles by hand, so ordering never depends on a timer. */
function deferred<T>(): Deferred<T> {
  const parts: { reject?: (reason: unknown) => void } = {}
  const promise = new Promise<T>((_resolve, reject) => {
    parts.reject = reject
  })
  const reject = parts.reject
  if (!reject) throw new Error('the promise executor did not run synchronously')
  return { promise, reject }
}

function storedStatus(bookingId: string): string | undefined {
  return api.__getAllBookings().find((booking) => booking.id === bookingId)?.status
}

async function lookUp(user: ReturnType<typeof userEvent.setup>, phone: string) {
  const field = screen.getByLabelText(/phone number/i)
  await user.clear(field)
  await user.type(field, phone)
  await user.click(screen.getByRole('button', { name: /find my bookings/i }))
}

async function confirmCancel(user: ReturnType<typeof userEvent.setup>, article: HTMLElement) {
  await user.click(within(article).getByRole('button', { name: /^cancel booking for/i }))
  await user.click(screen.getByRole('button', { name: /^yes, cancel booking$/i }))
}

beforeEach(async () => {
  vi.stubEnv('TZ', DEVICE_TIME_ZONE)
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(BOOKING_TIME)

  api.resetMockApi(BOOKING_TIME)
  api.configureMockApi({ failureRate: 0, minDelayMs: 0, maxDelayMs: 0 })
  api.__setSlots([MORNING, EVENING])

  await api.createBooking({ slotId: 'morning', name: 'Asha', phone: PHONE, tickets: 2 })
  await api.createBooking({ slotId: 'evening', name: 'Asha', phone: PHONE, tickets: 3 })
  await api.createBooking({ slotId: 'evening', name: 'Biju', phone: OTHER_PHONE, tickets: 1 })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('MyBookingsPage', () => {
  it('shows a loading state and then the bookings for the phone number', async () => {
    const user = userEvent.setup()
    api.configureMockApi({ minDelayMs: 200, maxDelayMs: 200 })
    render(<MyBookingsPage />)

    await lookUp(user, PHONE)

    expect(screen.getByText(/looking up your bookings/i)).toBeInTheDocument()
    expect(await screen.findAllByRole('article')).toHaveLength(2)
    expect(screen.queryByText(/looking up your bookings/i)).not.toBeInTheDocument()
  })

  it('lists only the bookings that belong to the phone number looked up', async () => {
    const user = userEvent.setup()
    render(<MyBookingsPage />)

    await lookUp(user, PHONE)

    expect(await screen.findAllByRole('article')).toHaveLength(2)
    expect(screen.getByRole('article', { name: /guruvayur/i })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: /sabarimala/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Bookings for ' + PHONE })).toBeInTheDocument()
  })

  it('shows the temple, date, start time, tickets and status for each booking', async () => {
    const user = userEvent.setup()
    render(<MyBookingsPage />)

    await lookUp(user, PHONE)

    const article = await screen.findByRole('article', { name: /sabarimala/i })
    expect(within(article).getByRole('heading', { level: 3 })).toHaveTextContent(
      'Sabarimala Sree Dharmasastha Temple',
    )
    expect(within(article).getByText('10 Mar 2026')).toBeInTheDocument()
    expect(within(article).getByText(/06:00\s*pm IST/i)).toBeInTheDocument()
    expect(within(article).getByText('3')).toBeInTheDocument()
    expect(within(article).getByText('Confirmed')).toBeInTheDocument()
  })

  it('renders the date and start time in Indian Standard Time whatever time zone the device is in', async () => {
    expect(DEVICE_TIME_ZONE).not.toBe(IST_TIME_ZONE)
    expect(new Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(DEVICE_TIME_ZONE)

    const user = userEvent.setup()
    render(<MyBookingsPage />)

    await lookUp(user, PHONE)

    // 2026-03-10T12:30:00Z is 06:00 pm in IST and 05:30 am on this device.
    const evening = await screen.findByRole('article', { name: /sabarimala/i })
    expect(within(evening).getByText(/06:00\s*pm IST/i)).toBeInTheDocument()
    expect(within(evening).getByText('10 Mar 2026')).toBeInTheDocument()
    expect(within(evening).queryByText(/05:30\s*am/i)).not.toBeInTheDocument()

    // 2026-03-10T05:30:00Z is 11:00 am in IST and 10:30 pm on 9 Mar on this device.
    const morning = screen.getByRole('article', { name: /guruvayur/i })
    expect(within(morning).getByText(/11:00\s*am IST/i)).toBeInTheDocument()
    expect(within(morning).getByText('10 Mar 2026')).toBeInTheDocument()
    expect(within(morning).queryByText(/10:30\s*pm/i)).not.toBeInTheDocument()
    expect(within(morning).queryByText('9 Mar 2026')).not.toBeInTheDocument()
  })

  it('requires an explicit confirmation before a booking is cancelled', async () => {
    const user = userEvent.setup()
    const cancelSpy = vi.spyOn(api, 'cancelBooking')
    render(<MyBookingsPage />)

    await lookUp(user, PHONE)
    const article = await screen.findByRole('article', { name: /sabarimala/i })
    await user.click(within(article).getByRole('button', { name: /^cancel booking for/i }))

    expect(cancelSpy).not.toHaveBeenCalled()
    expect(within(article).getByText('Confirmed')).toBeInTheDocument()
    expect(storedStatus(EVENING_BOOKING)).toBe('confirmed')

    await user.click(screen.getByRole('button', { name: /^keep booking$/i }))

    expect(cancelSpy).not.toHaveBeenCalled()
    expect(within(article).getByText('Confirmed')).toBeInTheDocument()
    expect(within(article).getByRole('button', { name: /^cancel booking for/i })).toBeInTheDocument()
  })

  it('shows the booking as cancelled immediately, before the cancellation request settles', async () => {
    const user = userEvent.setup()
    const pending = deferred<Booking>()
    vi.spyOn(api, 'cancelBooking').mockReturnValue(pending.promise)
    render(<MyBookingsPage />)

    await lookUp(user, PHONE)
    const article = await screen.findByRole('article', { name: /sabarimala/i })
    await confirmCancel(user, article)

    // Nothing has resolved, so this can only be the optimistic update.
    expect(within(article).getByText('Cancelled')).toBeInTheDocument()
    expect(within(article).queryByText('Confirmed')).not.toBeInTheDocument()
    expect(within(article).queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    expect(storedStatus(EVENING_BOOKING)).toBe('confirmed')
  })

  it('keeps the booking cancelled once the API confirms the cancellation', async () => {
    const user = userEvent.setup()
    render(<MyBookingsPage />)

    await lookUp(user, PHONE)
    const article = await screen.findByRole('article', { name: /sabarimala/i })
    await confirmCancel(user, article)

    await waitFor(() => {
      expect(storedStatus(EVENING_BOOKING)).toBe('cancelled')
    })
    expect(within(article).getByText('Cancelled')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    const other = screen.getByRole('article', { name: /guruvayur/i })
    expect(within(other).getByText('Confirmed')).toBeInTheDocument()
  })

  it('rolls the booking back to its previous state and shows an error when the cancellation fails', async () => {
    const user = userEvent.setup()
    const pending = deferred<Booking>()
    vi.spyOn(api, 'cancelBooking').mockReturnValue(pending.promise)
    render(<MyBookingsPage />)

    await lookUp(user, PHONE)
    const article = await screen.findByRole('article', { name: /sabarimala/i })
    await confirmCancel(user, article)

    expect(within(article).getByText('Cancelled')).toBeInTheDocument()

    pending.reject(new ApiError('network', 'The network request failed. Please try again.'))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/network request failed/i)

    // Every detail is back exactly as it was before the cancellation was sent.
    expect(within(article).getByText('Confirmed')).toBeInTheDocument()
    expect(within(article).queryByText('Cancelled')).not.toBeInTheDocument()
    expect(within(article).getByText('10 Mar 2026')).toBeInTheDocument()
    expect(within(article).getByText(/06:00\s*pm IST/i)).toBeInTheDocument()
    expect(within(article).getByText('3')).toBeInTheDocument()
    expect(within(article).getByRole('button', { name: /^cancel booking for/i })).toBeEnabled()

    // The other booking on screen is untouched by the rollback.
    const other = screen.getByRole('article', { name: /guruvayur/i })
    expect(within(other).getByText('Confirmed')).toBeInTheDocument()
  })

  it('leaves the booking confirmed when the real cancellation request is rejected', async () => {
    const user = userEvent.setup()
    render(<MyBookingsPage />)

    await lookUp(user, PHONE)
    const article = await screen.findByRole('article', { name: /sabarimala/i })
    api.configureMockApi({ failureRate: 1 })
    await confirmCancel(user, article)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/network request failed/i)
    expect(within(article).getByText('Confirmed')).toBeInTheDocument()
    expect(within(article).queryByText('Cancelled')).not.toBeInTheDocument()
    expect(storedStatus(EVENING_BOOKING)).toBe('confirmed')
  })

  it('gives a booking whose slot has already started no cancel action, and shows the reason', async () => {
    vi.setSystemTime(AFTER_MORNING_SLOT)
    const user = userEvent.setup()
    render(<MyBookingsPage />)

    await lookUp(user, PHONE)

    const started = await screen.findByRole('article', { name: /guruvayur/i })
    expect(within(started).queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    expect(within(started).getByText(/already started/i)).toBeVisible()
    expect(within(started).getByText('Confirmed')).toBeInTheDocument()

    const upcoming = screen.getByRole('article', { name: /sabarimala/i })
    expect(within(upcoming).getByRole('button', { name: /^cancel booking for/i })).toBeEnabled()
  })

  it('shows an empty state when the phone number has no bookings', async () => {
    const user = userEvent.setup()
    render(<MyBookingsPage />)

    await lookUp(user, '9123456780')

    expect(await screen.findByText(/no bookings found for 9123456780/i)).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows an error with a retry action when the lookup fails', async () => {
    const user = userEvent.setup()
    api.configureMockApi({ failureRate: 1 })
    render(<MyBookingsPage />)

    await lookUp(user, PHONE)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/network request failed/i)
    expect(screen.queryByText(/no bookings found/i)).not.toBeInTheDocument()

    api.configureMockApi({ failureRate: 0 })
    await user.click(within(alert).getByRole('button', { name: /retry/i }))

    expect(await screen.findAllByRole('article')).toHaveLength(2)
  })

  it('rejects a phone number that is not ten digits without calling the API', async () => {
    const user = userEvent.setup()
    const spy = vi.spyOn(api, 'getBookings')
    render(<MyBookingsPage />)

    await lookUp(user, '12345')

    expect(await screen.findByText(/valid 10-digit phone number/i)).toBeInTheDocument()
    expect(spy).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/phone number/i)).toHaveValue('12345')
    expect(screen.getByLabelText(/phone number/i)).toHaveAttribute('aria-invalid', 'true')
  })
})
