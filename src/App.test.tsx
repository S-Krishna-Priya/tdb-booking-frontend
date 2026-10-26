import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { configureMockApi, resetMockApi } from './api/mockApi'

beforeEach(() => {
  resetMockApi()
  configureMockApi({ failureRate: 0, minDelayMs: 0, maxDelayMs: 0 })
})

describe('App', () => {
  it('opens on the booking page and reaches my bookings from the navigation', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(
      await screen.findByRole('heading', { level: 1, name: /temple darshan booking/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'My bookings' }))

    expect(screen.getByRole('heading', { level: 1, name: 'My bookings' })).toBeInTheDocument()
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'My bookings' })).toHaveAttribute(
      'aria-current',
      'page',
    )

    await user.click(screen.getByRole('button', { name: 'Book a darshan' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: /temple darshan booking/i }),
    ).toBeInTheDocument()
  })
})
