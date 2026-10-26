import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { __setSlots, configureMockApi, resetMockApi } from '../api/mockApi'
import { formatIstDateKey, istDateKey, istSlotInstant } from '../utils/datetime'
import { LANGUAGE_STORAGE_KEY } from './storage'

const TODAY = istDateKey(new Date())

/**
 * Pinned to 22:30 IST. Nothing here depends on the hour, and pinning keeps it that way: the
 * bookable window these assertions format is read from the clock, so an unpinned run that crossed
 * IST midnight mid-test would compare two different days.
 */
const PINNED_NOW = new Date(istSlotInstant(TODAY, 22, 30))

const ENGLISH_TITLE = 'Temple Darshan Booking'
const MALAYALAM_TITLE = 'ക്ഷേത്ര ദർശന ബുക്കിംഗ്'

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  window.localStorage.clear()
  document.documentElement.lang = ''
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(PINNED_NOW)
  resetMockApi(PINNED_NOW)
  configureMockApi({ failureRate: 0, minDelayMs: 0, maxDelayMs: 0 })
  __setSlots([])
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

type User = ReturnType<typeof userEvent.setup>

async function chooseMalayalam(user: User) {
  // Found by its accessible name, which is the language's own name. The keyboard route onto the
  // same control is covered by the last describe block in this file.
  await user.click(screen.getByRole('radio', { name: 'മലയാളം' }))
}

function dateOptions(name: string): string[] {
  const select = screen.getByRole('combobox', { name })
  return within(select)
    .getAllByRole('option')
    .map((option) => option.textContent ?? '')
}

describe('the English and Malayalam switch', () => {
  it('changes the headings, labels and buttons to Malayalam', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { level: 1, name: ENGLISH_TITLE })

    await chooseMalayalam(user)

    expect(screen.getByRole('heading', { level: 1, name: MALAYALAM_TITLE })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'ക്ഷേത്രം' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'തീയതി' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ദർശനം ബുക്ക് ചെയ്യുക' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'എന്റെ ബുക്കിംഗുകൾ' })).toBeInTheDocument()

    expect(screen.queryByRole('heading', { name: ENGLISH_TITLE })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Temple' })).not.toBeInTheDocument()
  })

  it('formats the bookable dates in Malayalam while keeping them in IST', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('combobox', { name: 'Date' })

    const inEnglish = formatIstDateKey(TODAY, 'en-IN')
    const inMalayalam = formatIstDateKey(TODAY, 'ml-IN')
    // Guards the assertions below: a locale that formatted identically would prove nothing.
    expect(inMalayalam).not.toBe(inEnglish)
    expect(dateOptions('Date')[0]).toBe(inEnglish)

    await chooseMalayalam(user)

    // Same IST day, Malayalam formatting: the language changes the rendering, not the timezone.
    expect(dateOptions('തീയതി')[0]).toBe(inMalayalam)
    expect(screen.getByRole('combobox', { name: 'തീയതി' })).toHaveValue(TODAY)
  })

  it('translates the bookings page as well as the booking page', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { level: 1, name: ENGLISH_TITLE })

    await chooseMalayalam(user)
    await user.click(screen.getByRole('button', { name: 'എന്റെ ബുക്കിംഗുകൾ' }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'എന്റെ ബുക്കിംഗുകൾ' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'ഫോൺ നമ്പർ' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'എന്റെ ബുക്കിംഗുകൾ കണ്ടെത്തുക' }),
    ).toBeInTheDocument()
  })

  it('puts the chosen language on the document so a screen reader pronounces it', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { level: 1, name: ENGLISH_TITLE })
    expect(document.documentElement).toHaveAttribute('lang', 'en')

    await chooseMalayalam(user)

    expect(document.documentElement).toHaveAttribute('lang', 'ml')
  })

  it('remembers the choice, so a remount opens in Malayalam', async () => {
    const user = userEvent.setup()
    const view = render(<App />)
    await screen.findByRole('heading', { level: 1, name: ENGLISH_TITLE })

    await chooseMalayalam(user)
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ml')

    // A refresh: the tree is torn down and rebuilt from nothing but what was stored.
    view.unmount()
    render(<App />)

    expect(
      await screen.findByRole('heading', { level: 1, name: MALAYALAM_TITLE }),
    ).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'മലയാളം' })).toBeChecked()
    expect(dateOptions('തീയതി')[0]).toBe(formatIstDateKey(TODAY, 'ml-IN'))
  })

  it('switches back to English, and remembers that too', async () => {
    const user = userEvent.setup()
    const view = render(<App />)
    await screen.findByRole('heading', { level: 1, name: ENGLISH_TITLE })

    await chooseMalayalam(user)
    await user.click(screen.getByRole('radio', { name: 'English' }))

    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en')

    view.unmount()
    render(<App />)

    expect(
      await screen.findByRole('heading', { level: 1, name: ENGLISH_TITLE }),
    ).toBeInTheDocument()
  })

  it('opens in English when the stored value is not a language it knows', async () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'fr')
    render(<App />)

    expect(
      await screen.findByRole('heading', { level: 1, name: ENGLISH_TITLE }),
    ).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'English' })).toBeChecked()
  })

  it('still renders when storage refuses to be read, as it does in private mode', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('The operation is insecure.')
    })

    render(<App />)

    expect(
      await screen.findByRole('heading', { level: 1, name: ENGLISH_TITLE }),
    ).toBeInTheDocument()
  })

  it('still switches when storage refuses to be written, as it does in private mode', async () => {
    const user = userEvent.setup()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('The quota has been exceeded.')
    })

    render(<App />)
    await screen.findByRole('heading', { level: 1, name: ENGLISH_TITLE })

    await chooseMalayalam(user)

    expect(screen.getByRole('heading', { level: 1, name: MALAYALAM_TITLE })).toBeInTheDocument()
  })
})

describe('the language switch from the keyboard', () => {
  it('moves onto the group with Tab and changes language with an arrow key', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { level: 1, name: ENGLISH_TITLE })

    await user.tab()
    await user.tab()
    await user.tab()
    expect(screen.getByRole('radio', { name: 'English' })).toHaveFocus()

    await user.keyboard('{ArrowDown}')

    expect(screen.getByRole('radio', { name: 'മലയാളം' })).toBeChecked()
    expect(screen.getByRole('heading', { level: 1, name: MALAYALAM_TITLE })).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('lang', 'ml')
  })
})
