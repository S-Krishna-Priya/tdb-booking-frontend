import { useCallback, useEffect, useRef, useState } from 'react'
import { getSlots } from '../api/mockApi'
import type { Slot } from '../types/booking'
import { errorMessage } from '../utils/errors'

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string }

interface SettledSlots {
  /** The selection the stored result belongs to. */
  key: string
  result: { ok: true; data: Slot[] } | { ok: false; message: string }
}

export interface SlotsResource {
  state: AsyncState<Slot[]>
  reload: () => void
}

/**
 * Loads the slots for one temple and date, race-safely.
 *
 * A devotee can switch temple or date while a request is in flight, so a response that is no
 * longer wanted must never reach the screen. Three guards make that impossible:
 *
 * 1. a monotonic request id — only the most recently started request may store a result;
 * 2. the effect's cleanup flag — a response that arrives after unmount is dropped;
 * 3. the stored result carries the key it was loaded for, and a result whose key is not the
 *    current one is rendered as `loading`, never as data or as an error.
 */
export function useSlots(templeId: string, date: string): SlotsResource {
  const [settled, setSettled] = useState<SettledSlots | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const latestRequestIdRef = useRef(0)

  const key = `${templeId}|${date}|${reloadToken}`

  useEffect(() => {
    if (!templeId || !date) return undefined

    let active = true
    latestRequestIdRef.current += 1
    const requestId = latestRequestIdRef.current
    const isCurrent = () => active && requestId === latestRequestIdRef.current

    getSlots(templeId, date)
      .then((data) => {
        if (isCurrent()) setSettled({ key, result: { ok: true, data } })
      })
      .catch((error: unknown) => {
        if (isCurrent()) setSettled({ key, result: { ok: false, message: errorMessage(error) } })
      })

    return () => {
      active = false
    }
  }, [templeId, date, key])

  const reload = useCallback(() => {
    setReloadToken((value) => value + 1)
  }, [])

  if (!templeId || !date || settled === null || settled.key !== key) {
    return { state: { status: 'loading' }, reload }
  }

  return {
    state: settled.result.ok
      ? { status: 'success', data: settled.result.data }
      : { status: 'error', message: settled.result.message },
    reload,
  }
}
