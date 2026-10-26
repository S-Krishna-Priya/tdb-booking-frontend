import { render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configureMockApi, resetMockApi, __setSlots } from '../../api/mockApi'
import { addIstDays, formatIstDateKey, istDateKey } from '../../utils/datetime'
import { BookingPage } from './BookingPage'

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  resetMockApi()
  configureMockApi({ failureRate: 0, minDelayMs: 0, maxDelayMs: 0 })
  __setSlots([])
})

afterEach(() => {
  vi.useRealTimers()
})

function firstDateOption(): string {
  const select = screen.getByLabelText(/^date$/i)
  const first = within(select).getAllByRole('option')[0]
  if (!first) throw new Error('no date options')
  return (first as HTMLOptionElement).value
}

describe('the bookable date window follows the IST day', () => {
  it('offers today as the first date', async () => {
    render(<BookingPage />)
    await screen.findByLabelText(/^date$/i)

    expect(firstDateOption()).toBe(istDateKey(new Date()))
  })

  it('moves the window on when the IST day rolls over while the tab stays open', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const start = new Date()
    vi.setSystemTime(start)
    const dayOne = istDateKey(start)

    const view = render(<BookingPage />)
    await vi.waitFor(() => screen.getByLabelText(/^date$/i))
    expect(firstDateOption()).toBe(dayOne)

    vi.setSystemTime(new Date(start.getTime() + 24 * 60 * 60 * 1000))
    const dayTwo = addIstDays(dayOne, 1)
    view.rerender(<BookingPage />)

    expect(firstDateOption()).toBe(dayTwo)
    expect(screen.getByLabelText(/^date$/i)).toHaveTextContent(formatIstDateKey(dayTwo))
  })
})
