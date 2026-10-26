import { useLanguage } from '../../i18n/context'
import type { BookingMessages } from '../../i18n/translations'
import type { Slot } from '../../types/booking'
import { formatIstTime, hasStarted } from '../../utils/datetime'

interface SlotListProps {
  slots: readonly Slot[]
  selectedSlotId: string | null
  onSelect: (slotId: string) => void
  now: Date
}

function unavailableReason(slot: Slot, now: Date, t: BookingMessages): string | null {
  if (hasStarted(slot.startsAt, now)) return t.slotStarted
  if (slot.remaining <= 0) return t.slotFull
  return null
}

export function SlotList({ slots, selectedSlotId, onSelect, now }: SlotListProps) {
  const { t, locale } = useLanguage()

  return (
    <fieldset className="mt-6 border-0 p-0">
      <legend className="text-base font-semibold text-slate-900">
        {t.booking.availableSlots}
      </legend>
      <ul className="mt-3 space-y-2">
        {slots.map((slot) => {
          const reason = unavailableReason(slot, now, t.booking)
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
                <span className="font-medium">{formatIstTime(slot.startsAt, locale)}</span>
                <span className="text-sm">
                  {t.booking.ticketsRemaining(slot.remaining, slot.capacity)}
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
