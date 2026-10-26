import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as mockApi from '../../api/mockApi'
import { ApiError, type Slot } from '../../types/booking'
import { addIstDays, istDateKey, istSlotInstant } from '../../utils/datetime'
import { BookingPage } from './BookingPage'

const TODAY = istDateKey(new Date())
const TOMORROW = addIstDays(TODAY, 1)

function slot(id: string, templeId: string, date: string, capacity: number, remaining: number) {
  return { id, templeId, date, startsAt: istSlotInstant(date, 23), capacity, remaining }
}

// Each slot's "<remaining> of <capacity> tickets remaining" is unique, so the accessible name of
// a radio says exactly which selection the list on screen belongs to.
const SABARIMALA_TODAY = slot('sabarimala-today', 'sabarimala', TODAY, 30, 10)
const GURUVAYUR_TODAY = slot('guruvayur-today', 'guruvayur', TODAY, 40, 4)
const SABARIMALA_TOMORROW = slot('sabarimala-tomorrow', 'sabarimala', TOMORROW, 50, 6)
const GURUVAYUR_TOMORROW = slot('guruvayur-tomorrow', 'guruvayur', TOMORROW, 60, 5)

const SABARIMALA_TODAY_SLOT = /10 of 30 tickets remaining/
const GURUVAYUR_TODAY_SLOT = /4 of 40 tickets remaining/
const SABARIMALA_TOMORROW_SLOT = /6 of 50 tickets remaining/
const GURUVAYUR_TOMORROW_SLOT = /5 of 60 tickets remaining/

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
}

/** A promise this test settles by hand, so response ordering never depends on a timer. */
function deferred<T>(): Deferred<T> {
  const handlers: { resolve?: (value: T) => void; reject?: (reason: unknown) => void } = {}
  const promise = new Promise<T>((resolve, reject) => {
    handlers.resolve = resolve
    handlers.reject = reject
  })
  return {
    promise,
    resolve: (value) => {
      if (!handlers.resolve) throw new Error('deferred was never initialised')
      handlers.resolve(value)
    },
    reject: (reason) => {
      if (!handlers.reject) throw new Error('deferred was never initialised')
      handlers.reject(reason)
    },
  }
}

function openLink(url: string) {
  window.history.replaceState(null, '', url)
  return render(<BookingPage />)
}

function templeSelect() {
  return screen.getByRole('combobox', { name: /^temple$/i })
}

function dateSelect() {
  return screen.getByRole('combobox', { name: /^date$/i })
}

async function usableTempleSelect() {
  const select = await screen.findByRole('combobox', { name: /^temple$/i })
  await waitFor(() => {
    expect(select).toBeEnabled()
  })
  return select
}

/** Replaces getSlots with hand-controlled promises, keyed by the selection they were asked for. */
function captureSlotRequests() {
  const requests = new Map<string, Deferred<Slot[]>>()
  vi.spyOn(mockApi, 'getSlots').mockImplementation((templeId: string, date: string) => {
    const request = deferred<Slot[]>()
    requests.set(`${templeId}|${date}`, request)
    return request.promise
  })

  return async function requestFor(templeId: string, date: string): Promise<Deferred<Slot[]>> {
    const key = `${templeId}|${date}`
    await waitFor(() => {
      expect(requests.has(key)).toBe(true)
    })
    const request = requests.get(key)
    if (!request) throw new Error(`no slot request was made for ${key}`)
    return request
  }
}

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  mockApi.resetMockApi()
  mockApi.configureMockApi({ failureRate: 0, minDelayMs: 0, maxDelayMs: 0 })
  mockApi.__setSlots([
    SABARIMALA_TODAY,
    GURUVAYUR_TODAY,
    SABARIMALA_TOMORROW,
    GURUVAYUR_TOMORROW,
  ])
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('BookingPage selection in the URL', () => {
  it('opens a shared link on the same temple and date', async () => {
    openLink(`/?temple=guruvayur&date=${TOMORROW}`)

    expect(await screen.findByRole('radio', { name: GURUVAYUR_TOMORROW_SLOT })).toBeInTheDocument()
    expect(templeSelect()).toHaveValue('guruvayur')
    expect(dateSelect()).toHaveValue(TOMORROW)
  })

  it('falls back to the first temple and today when the link is not usable', async () => {
    openLink('/?temple=not-a-temple&date=31-12-2026')

    expect(await screen.findByRole('radio', { name: SABARIMALA_TODAY_SLOT })).toBeInTheDocument()
    expect(templeSelect()).toHaveValue('sabarimala')
    expect(dateSelect()).toHaveValue(TODAY)
    await waitFor(() => {
      expect(window.location.search).toBe(`?temple=sabarimala&date=${TODAY}`)
    })
  })

  it('keeps the selected temple and date in the URL, so a refresh restores them', async () => {
    const user = userEvent.setup()
    const view = openLink('/')
    await usableTempleSelect()

    await user.selectOptions(templeSelect(), 'guruvayur')
    await user.selectOptions(dateSelect(), TOMORROW)

    await waitFor(() => {
      expect(window.location.search).toBe(`?temple=guruvayur&date=${TOMORROW}`)
    })
    expect(await screen.findByRole('radio', { name: GURUVAYUR_TOMORROW_SLOT })).toBeInTheDocument()

    // A refresh: the page is torn down and rebuilt from nothing but the URL.
    view.unmount()
    render(<BookingPage />)

    expect(await screen.findByRole('radio', { name: GURUVAYUR_TOMORROW_SLOT })).toBeInTheDocument()
    expect(templeSelect()).toHaveValue('guruvayur')
    expect(dateSelect()).toHaveValue(TOMORROW)
  })

  it('returns to the previous temple when the browser goes back', async () => {
    const user = userEvent.setup()
    openLink(`/?temple=sabarimala&date=${TODAY}`)
    await usableTempleSelect()
    expect(await screen.findByRole('radio', { name: SABARIMALA_TODAY_SLOT })).toBeInTheDocument()

    await user.selectOptions(templeSelect(), 'guruvayur')
    expect(await screen.findByRole('radio', { name: GURUVAYUR_TODAY_SLOT })).toBeInTheDocument()

    window.history.back()

    expect(await screen.findByRole('radio', { name: SABARIMALA_TODAY_SLOT })).toBeInTheDocument()
    expect(templeSelect()).toHaveValue('sabarimala')
    expect(window.location.search).toBe(`?temple=sabarimala&date=${TODAY}`)
  })

  it('returns to the date that was left when the browser goes forward', async () => {
    const user = userEvent.setup()
    openLink(`/?temple=sabarimala&date=${TODAY}`)
    await usableTempleSelect()
    expect(await screen.findByRole('radio', { name: SABARIMALA_TODAY_SLOT })).toBeInTheDocument()

    await user.selectOptions(dateSelect(), TOMORROW)
    expect(await screen.findByRole('radio', { name: SABARIMALA_TOMORROW_SLOT })).toBeInTheDocument()

    window.history.back()
    expect(await screen.findByRole('radio', { name: SABARIMALA_TODAY_SLOT })).toBeInTheDocument()
    expect(dateSelect()).toHaveValue(TODAY)

    window.history.forward()
    expect(await screen.findByRole('radio', { name: SABARIMALA_TOMORROW_SLOT })).toBeInTheDocument()
    expect(dateSelect()).toHaveValue(TOMORROW)
  })
})

describe('BookingPage slot loading races', () => {
  it('does not let a slow response for an earlier temple overwrite the current one', async () => {
    const user = userEvent.setup()
    const requestFor = captureSlotRequests()
    openLink(`/?temple=sabarimala&date=${TODAY}`)
    await usableTempleSelect()

    // The devotee's first selection is still in flight...
    const slow = await requestFor('sabarimala', TODAY)
    expect(screen.getByRole('status')).toHaveTextContent(/loading slots/i)

    // ...when they switch temples, which starts a second request.
    await user.selectOptions(templeSelect(), 'guruvayur')
    const fast = await requestFor('guruvayur', TODAY)

    // The newer selection answers first and is shown.
    await act(async () => {
      fast.resolve([GURUVAYUR_TODAY])
      await fast.promise
    })
    expect(await screen.findByRole('radio', { name: GURUVAYUR_TODAY_SLOT })).toBeInTheDocument()

    // The earlier, slower selection answers last. It must never reach the screen.
    await act(async () => {
      slow.resolve([SABARIMALA_TODAY])
      await slow.promise
    })

    expect(screen.queryByRole('radio', { name: SABARIMALA_TODAY_SLOT })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: GURUVAYUR_TODAY_SLOT })).toBeInTheDocument()
    expect(templeSelect()).toHaveValue('guruvayur')
    expect(window.location.search).toBe(`?temple=guruvayur&date=${TODAY}`)
  })

  it('does not let a slow response for an earlier date overwrite the current one', async () => {
    const user = userEvent.setup()
    const requestFor = captureSlotRequests()
    openLink(`/?temple=sabarimala&date=${TODAY}`)
    await usableTempleSelect()

    const slow = await requestFor('sabarimala', TODAY)
    await user.selectOptions(dateSelect(), TOMORROW)
    const fast = await requestFor('sabarimala', TOMORROW)

    await act(async () => {
      fast.resolve([SABARIMALA_TOMORROW])
      await fast.promise
    })
    expect(await screen.findByRole('radio', { name: SABARIMALA_TOMORROW_SLOT })).toBeInTheDocument()

    await act(async () => {
      slow.resolve([SABARIMALA_TODAY])
      await slow.promise
    })

    expect(screen.queryByRole('radio', { name: SABARIMALA_TODAY_SLOT })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: SABARIMALA_TOMORROW_SLOT })).toBeInTheDocument()
    expect(dateSelect()).toHaveValue(TOMORROW)
  })

  it('does not show an error when an earlier selection fails after the current one succeeded', async () => {
    const user = userEvent.setup()
    const requestFor = captureSlotRequests()
    openLink(`/?temple=sabarimala&date=${TODAY}`)
    await usableTempleSelect()

    const slow = await requestFor('sabarimala', TODAY)
    await user.selectOptions(templeSelect(), 'guruvayur')
    const fast = await requestFor('guruvayur', TODAY)

    await act(async () => {
      fast.resolve([GURUVAYUR_TODAY])
      await fast.promise
    })
    expect(await screen.findByRole('radio', { name: GURUVAYUR_TODAY_SLOT })).toBeInTheDocument()

    await act(async () => {
      slow.reject(new ApiError('network', 'The network request failed. Please try again.'))
      await slow.promise.catch(() => undefined)
    })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: GURUVAYUR_TODAY_SLOT })).toBeInTheDocument()
  })
})
