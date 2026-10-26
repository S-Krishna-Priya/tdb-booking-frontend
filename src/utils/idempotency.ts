import type { IdempotencyKey } from '../types/booking'

let fallbackCounter = 0

/**
 * Mints the key that identifies one booking attempt. The caller keeps the key for as long as the
 * attempt is unresolved, so every retry of that attempt carries the same key, and mints a new one
 * once the attempt has succeeded or the devotee has moved on to a different booking.
 */
export function createIdempotencyKey(): IdempotencyKey {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  fallbackCounter += 1
  return `booking-${Date.now().toString(36)}-${String(fallbackCounter)}`
}
