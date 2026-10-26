import { useCallback, useEffect, useState } from 'react'
import { parseSelection, sameSelection, selectionSearch, type Selection } from '../utils/selection'

type HistoryMode = 'push' | 'replace'

interface SelectionState {
  selection: Selection
  /** How the next URL write should reach the history stack. */
  mode: HistoryMode
}

export interface UrlSelection {
  selection: Selection
  /** Record a devotee-initiated change. Pushes a history entry so Back returns to the previous one. */
  select: (change: Partial<Selection>) => void
  /** Swap an unknown temple id for a known one, without adding a history entry. */
  adoptKnownTemple: (knownTempleIds: readonly string[]) => void
}

function urlWith(search: string): string {
  return `${window.location.pathname}${search}${window.location.hash}`
}

/**
 * Keeps the selected temple and date in the query string.
 *
 * The URL is the shareable record of the selection: it is written on every change, read back on
 * first load (so a refresh or a shared link restores the same view) and re-read on `popstate`
 * (so Back and Forward move between selections).
 */
export function useUrlSelection(dates: readonly string[]): UrlSelection {
  const [state, setState] = useState<SelectionState>(() => ({
    selection: parseSelection(window.location.search, dates),
    mode: 'replace',
  }))

  useEffect(() => {
    // Wait until the temple is known, so the first entry written is already shareable.
    if (!state.selection.templeId) return
    const search = selectionSearch(state.selection)
    if (search === window.location.search) return
    if (state.mode === 'push') window.history.pushState(null, '', urlWith(search))
    else window.history.replaceState(null, '', urlWith(search))
  }, [state])

  useEffect(() => {
    function handlePopState() {
      setState({ selection: parseSelection(window.location.search, dates), mode: 'replace' })
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [dates])

  const select = useCallback((change: Partial<Selection>) => {
    setState((current) => {
      const next = { ...current.selection, ...change }
      if (sameSelection(next, current.selection)) return current
      return { selection: next, mode: 'push' }
    })
  }, [])

  const adoptKnownTemple = useCallback((knownTempleIds: readonly string[]) => {
    setState((current) => {
      if (knownTempleIds.includes(current.selection.templeId)) return current
      const fallback = knownTempleIds[0]
      if (fallback === undefined || fallback === current.selection.templeId) return current
      return { selection: { ...current.selection, templeId: fallback }, mode: 'replace' }
    })
  }, [])

  return { selection: state.selection, select, adoptKnownTemple }
}
