import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import {
  __getAllBookings,
  __getSlotById,
  __setSlots,
  configureMockApi,
  resetMockApi,
} from '../../api/mockApi'
import type { Slot } from '../../types/booking'
import { istDateKey, istSlotInstant } from '../../utils/datetime'

const TEMPLE = 'sabarimala'
const TODAY = istDateKey(new Date())

/**
 * The clock is pinned to 22:30 IST — the hour at which every slot the API seeds for today has
 * already started — so a test that only passes in the morning fails here and now. The fixtures
 * below are then expressed relative to that pinned instant rather than at an absolute IST hour,
 * which is what makes "three hours from now" mean a slot that has genuinely not started.
 */
const PINNED_NOW = new Date(istSlotInstant(TODAY, 22, 30))
const HOUR = 3_600_000

function fromNow(hours: number): string {
  return new Date(Date.now() + hours * HOUR).toISOString()
}

function slot(id: string, hoursFromNow: number, capacity: number, remaining: number): Slot {
  return { id, templeId: TEMPLE, date: TODAY, startsAt: fromNow(hoursFromNow), capacity, remaining }
}

const STARTED_SLOT = /8 of 25 tickets remaining/
const FIRST_OPEN_SLOT = /10 of 30 tickets remaining/
const SECOND_OPEN_SLOT = /5 of 40 tickets remaining/

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  window.localStorage.clear()
  document.documentElement.lang = ''

  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(PINNED_NOW)

  resetMockApi(PINNED_NOW)
  configureMockApi({ failureRate: 0, minDelayMs: 0, maxDelayMs: 0 })
  // getSlots sorts by start time, so the slot that has already started is rendered first and the
  // keyboard has to step over it.
  __setSlots([slot('started', -1, 25, 8), slot('open', 3, 30, 10), slot('later', 4, 40, 5)])
})

afterEach(() => {
  vi.useRealTimers()
})

async function slotsOnScreen() {
  return screen.findByRole('group', { name: 'Available slots' })
}

describe('the booking flow with the keyboard alone', () => {
  it('books a slot from the top of the page without a single pointer event', async () => {
    const user = userEvent.setup()
    render(<App />)
    await slotsOnScreen()

    // The live region exists before there is anything to announce, so the confirmation is a
    // change inside a region the screen reader is already watching.
    expect(document.querySelector('[aria-live="polite"]')).toBeInTheDocument()

    // Tab 1 and 2: the two sections in the navigation.
    await user.tab()
    expect(screen.getByRole('button', { name: 'Book a darshan' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'My bookings' })).toHaveFocus()

    // Tab 3: the language switch, which is one stop because it is a radio group.
    await user.tab()
    expect(screen.getByRole('radio', { name: 'English' })).toHaveFocus()

    // Tab 4 and 5: temple and date. Both are native selects, so they are reachable and operable
    // with the keyboard; this run keeps the defaults, which already name today's sabarimala list.
    await user.tab()
    expect(screen.getByRole('combobox', { name: 'Temple' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('combobox', { name: 'Date' })).toHaveFocus()

    // Tab 6: into the slot radio group. The slot that has already started is disabled, so the
    // keyboard steps straight over it onto the first bookable slot.
    await user.tab()
    expect(screen.getByRole('radio', { name: STARTED_SLOT })).not.toHaveFocus()
    expect(screen.getByRole('radio', { name: FIRST_OPEN_SLOT })).toHaveFocus()

    // Arrow keys move inside the group, Space chooses — both native radio behaviour.
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('radio', { name: SECOND_OPEN_SLOT })).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    await user.keyboard(' ')
    expect(screen.getByRole('radio', { name: FIRST_OPEN_SLOT })).toBeChecked()

    // Tab 7, 8, 9: the three form fields. A chosen radio is a single stop, so one Tab leaves the
    // group entirely.
    await user.tab()
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus()
    await user.keyboard('Asha')

    await user.tab()
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveFocus()
    await user.keyboard('9876543210')

    await user.tab()
    expect(screen.getByRole('spinbutton', { name: 'Number of tickets' })).toHaveFocus()
    await user.keyboard('{Backspace}3')

    // Tab 10: Book, enabled now that a slot is chosen. Enter activates it.
    await user.tab()
    expect(screen.getByRole('button', { name: 'Book' })).toHaveFocus()
    await user.keyboard('{Enter}')

    const confirmation = await screen.findByText(/booked 3 tickets/i)
    expect(confirmation).toHaveTextContent(/booking reference/i)
    await waitFor(() => {
      expect(__getSlotById('open')?.remaining).toBe(7)
    })
    expect(__getAllBookings()).toHaveLength(1)
  })

  it('moves focus to the confirmation once the booking succeeds', async () => {
    const user = userEvent.setup()
    render(<App />)
    await slotsOnScreen()

    await user.tab()
    await user.tab()
    await user.tab()
    await user.tab()
    await user.tab()
    await user.tab()
    await user.keyboard(' ')
    await user.tab()
    await user.keyboard('Asha')
    await user.tab()
    await user.keyboard('9876543210')
    await user.tab()
    await user.tab()
    await user.keyboard('{Enter}')

    const confirmation = await screen.findByText(/booked 1 ticket for/i)
    await waitFor(() => {
      expect(confirmation).toHaveFocus()
    })
    // Focus lands on the message itself, not merely near it, and the message is the thing a
    // screen reader reads out: a status inside the polite region that was already there.
    expect(confirmation).toHaveAttribute('role', 'status')
    expect(confirmation).toHaveAttribute('tabindex', '-1')
    expect(confirmation.closest('[aria-live="polite"]')).toBeInTheDocument()
  })

  it('announces a failed booking through an alert without clearing the form', async () => {
    const user = userEvent.setup()
    render(<App />)
    await slotsOnScreen()

    await user.tab()
    await user.tab()
    await user.tab()
    await user.tab()
    await user.tab()
    await user.tab()
    await user.keyboard(' ')
    await user.tab()
    await user.keyboard('Asha')
    await user.tab()
    await user.keyboard('9876543210')

    configureMockApi({ failureRate: 1 })
    await user.tab()
    await user.tab()
    await user.keyboard('{Enter}')

    const alerts = await screen.findAllByRole('alert')
    expect(alerts.some((node) => /network request failed/i.test(node.textContent ?? ''))).toBe(true)
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Asha')
    expect(__getAllBookings()).toHaveLength(0)
  })

  it('gives every control in the flow a label a screen reader announces', async () => {
    render(<App />)
    const group = await slotsOnScreen()

    // Queried by role and accessible name only: a control missing its label cannot be found here.
    expect(screen.getByRole('radio', { name: 'English' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'മലയാളം' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Temple' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Date' })).toBeInTheDocument()
    expect(within(group).getByRole('radio', { name: FIRST_OPEN_SLOT })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: 'Number of tickets' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Book' })).toBeInTheDocument()

    // A disabled slot still says why, and says it to assistive technology through the input's own
    // description rather than through colour or position.
    const started = screen.getByRole('radio', { name: STARTED_SLOT })
    expect(started).toBeDisabled()
    expect(started).toHaveAccessibleDescription('Already started')
  })

  it('reaches the bookings page and its lookup field with the keyboard', async () => {
    const user = userEvent.setup()
    render(<App />)
    await slotsOnScreen()

    await user.tab()
    await user.tab()
    expect(screen.getByRole('button', { name: 'My bookings' })).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(screen.getByRole('heading', { level: 1, name: 'My bookings' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Find my bookings' })).toBeInTheDocument()
  })
})
