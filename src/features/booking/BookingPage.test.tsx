import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { BookingPage } from './BookingPage'
import {
  __clearSlots,
  __getSlotById,
  __setSlots,
  configureMockApi,
  resetMockApi,
} from '../../api/mockApi'
import type { Slot } from '../../types/booking'
import { istDateKey } from '../../utils/datetime'

const TODAY = istDateKey(new Date())
const TEMPLE = 'sabarimala'

function slot(partial: Partial<Slot> & { id: string }): Slot {
  return {
    templeId: TEMPLE,
    date: TODAY,
    startsAt: fromNow(3),
    capacity: 30,
    remaining: 10,
    ...partial,
  }
}

const HOUR = 3600_000

function fromNow(hours: number): string {
  return new Date(Date.now() + hours * HOUR).toISOString()
}

const OPEN = slot({ id: 'open', startsAt: fromNow(3), remaining: 10 })
const FULL = slot({ id: 'full', startsAt: fromNow(2), capacity: 20, remaining: 0 })
const STARTED = slot({ id: 'started', startsAt: fromNow(-1), capacity: 25, remaining: 8 })

beforeEach(() => {
  // The page keeps its selection in the URL, so every test starts from a bare one.
  window.history.replaceState(null, '', '/')
  resetMockApi()
  configureMockApi({ failureRate: 0, minDelayMs: 0, maxDelayMs: 0 })
  __setSlots([
    { ...OPEN, startsAt: fromNow(3) },
    { ...FULL, startsAt: fromNow(2) },
    { ...STARTED, startsAt: fromNow(-1) },
  ])
})

async function fillAndBook(user: ReturnType<typeof userEvent.setup>, tickets: string) {
  await user.type(screen.getByLabelText(/name/i), 'Asha')
  await user.type(screen.getByLabelText(/phone number/i), '9876543210')
  const ticketField = screen.getByLabelText(/number of tickets/i)
  await user.clear(ticketField)
  await user.type(ticketField, tickets)
  await user.click(screen.getByRole('button', { name: /^book$/i }))
}

describe('BookingPage', () => {
  it('shows a loading state and then the slots for the default selection', async () => {
    configureMockApi({ minDelayMs: 5, maxDelayMs: 5 })
    render(<BookingPage />)

    expect(await screen.findByText(/loading slots/i)).toBeInTheDocument()
    expect(await screen.findByRole('group', { name: /available slots/i })).toBeInTheDocument()
  })

  it('leaves 7 remaining after booking 3 tickets from a slot with 10 remaining', async () => {
    const user = userEvent.setup()
    render(<BookingPage />)
    await screen.findByRole('group', { name: /available slots/i })

    await user.click(screen.getByRole('radio', { name: /10 of 30 tickets remaining/ }))
    await fillAndBook(user, '3')

    expect(await screen.findByRole('status')).toHaveTextContent(/booked 3 tickets/i)
    await waitFor(() => expect(__getSlotById('open')?.remaining).toBe(7))
    expect(await screen.findByRole('radio', { name: /7 of 30 tickets remaining/ })).toBeInTheDocument()
  })

  it('rejects more tickets than remain before sending the request', async () => {
    const user = userEvent.setup()
    render(<BookingPage />)
    await screen.findByRole('group', { name: /available slots/i })

    await user.click(screen.getByRole('radio', { name: /10 of 30 tickets remaining/ }))
    await fillAndBook(user, '11')

    expect(await screen.findByText(/only 10 tickets remain/i)).toBeInTheDocument()
    expect(__getSlotById('open')?.remaining).toBe(10)
  })

  it('rejects an invalid phone number before sending the request', async () => {
    const user = userEvent.setup()
    render(<BookingPage />)
    await screen.findByRole('group', { name: /available slots/i })

    await user.click(screen.getByRole('radio', { name: /10 of 30 tickets remaining/ }))
    await user.type(screen.getByLabelText(/name/i), 'Asha')
    await user.type(screen.getByLabelText(/phone number/i), '123')
    await user.click(screen.getByRole('button', { name: /^book$/i }))

    expect(await screen.findByText(/valid 10-digit phone number/i)).toBeInTheDocument()
    expect(__getSlotById('open')?.remaining).toBe(10)
  })

  it('requires a name before sending the request', async () => {
    const user = userEvent.setup()
    render(<BookingPage />)
    await screen.findByRole('group', { name: /available slots/i })

    await user.click(screen.getByRole('radio', { name: /10 of 30 tickets remaining/ }))
    await user.type(screen.getByLabelText(/phone number/i), '9876543210')
    await user.click(screen.getByRole('button', { name: /^book$/i }))

    expect(await screen.findByText(/enter the devotee name/i)).toBeInTheDocument()
  })

  it('cannot book a full slot or a slot that has started, and shows why', async () => {
    render(<BookingPage />)
    const group = await screen.findByRole('group', { name: /available slots/i })

    expect(within(group).getByText(/^full$/i)).toBeInTheDocument()
    expect(within(group).getByText(/already started/i)).toBeInTheDocument()

    expect(screen.getByRole('radio', { name: /0 of 20 tickets remaining/ })).toBeDisabled()
    expect(screen.getByRole('radio', { name: /8 of 25 tickets remaining/ })).toBeDisabled()
    expect(screen.getByRole('radio', { name: /10 of 30 tickets remaining/ })).toBeEnabled()
  })

  it('shows an error state with a retry action when loading slots fails', async () => {
    const user = userEvent.setup()
    render(<BookingPage />)
    await screen.findByRole('group', { name: /available slots/i })

    configureMockApi({ failureRate: 1 })
    await user.selectOptions(screen.getByLabelText(/^temple$/i), 'guruvayur')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/network request failed/i)

    configureMockApi({ failureRate: 0 })
    __setSlots([{ ...OPEN, templeId: 'guruvayur' }])
    await user.click(within(alert).getByRole('button', { name: /retry/i }))

    expect(await screen.findByRole('group', { name: /available slots/i })).toBeInTheDocument()
  })

  it('shows an empty state when the selected temple and date have no slots', async () => {
    const user = userEvent.setup()
    render(<BookingPage />)
    await screen.findByRole('group', { name: /available slots/i })

    __clearSlots()
    await user.selectOptions(screen.getByLabelText(/^temple$/i), 'guruvayur')

    expect(await screen.findByText(/no slots are available/i)).toBeInTheDocument()
  })

  it('surfaces an API error from the booking request without losing the form values', async () => {
    const user = userEvent.setup()
    render(<BookingPage />)
    await screen.findByRole('group', { name: /available slots/i })

    await user.click(screen.getByRole('radio', { name: /10 of 30 tickets remaining/ }))
    configureMockApi({ failureRate: 1 })
    await fillAndBook(user, '2')

    const alerts = await screen.findAllByRole('alert')
    expect(alerts.some((node) => /network request failed/i.test(node.textContent ?? ''))).toBe(true)
    expect(screen.getByLabelText(/name/i)).toHaveValue('Asha')
    expect(screen.getByLabelText(/phone number/i)).toHaveValue('9876543210')
  })
})
