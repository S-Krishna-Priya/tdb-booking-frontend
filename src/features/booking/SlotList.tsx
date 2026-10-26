import type { Slot } from '../../types/booking'
import { formatIstTime, hasStarted } from '../../utils/datetime'

interface SlotListProps {
  slots: readonly Slot[]
  selectedSlotId: string | null
  onSelect: (slotId: string) => void
  now?: Date
}

function unavailableReason(slot: Slot, now: Date): string | null {
  if (hasStarted(slot.startsAt, now)) return 'Already started'
  if (slot.remaining <= 0) return 'Full'
  return null
}

export function SlotList({ slots, selectedSlotId, onSelect, now = new Date() }: SlotListProps) {
  return (
    <fieldset className="mt-6 border-0 p-0">
      <legend className="text-base font-semibold text-slate-900">Available slots</legend>
      <ul className="mt-3 space-y-2">
        {slots.map((slot) => {
          const reason = unavailableReason(slot, now)
          const disabled = reason !== null
          const inputId = `slot-${slot.id}`
          const describedBy = disabled ? `${inputId}-reason` : undefined

          return (
            <li key={slot.id}>
              <label
                htmlFor={inputId}
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  disabled
                    ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500'
                    : 'cursor-pointer border-slate-300 bg-white hover:border-amber-400'
                }`}
              >
                <input
                  type="radio"
                  id={inputId}
                  name="slot"
                  value={slot.id}
                  checked={selectedSlotId === slot.id}
                  disabled={disabled}
                  onChange={() => onSelect(slot.id)}
                  aria-describedby={describedBy}
                  className="h-4 w-4 accent-amber-600 focus-visible:ring-2 focus-visible:ring-amber-500"
                />
                <span className="font-medium">{formatIstTime(slot.startsAt)}</span>
                <span className="text-sm">
                  {slot.remaining} of {slot.capacity} tickets remaining
                </span>
                {reason ? (
                  <span
                    id={`${inputId}-reason`}
                    className="ml-auto rounded bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700"
                  >
                    {reason}
                  </span>
                ) : null}
              </label>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}
