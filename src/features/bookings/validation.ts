import type { ValidationMessages } from '../../i18n/translations'

export function validatePhone(value: string, messages: ValidationMessages): string | null {
  const phone = value.trim()
  if (!phone) return messages.lookupPhoneRequired
  if (!/^[0-9]{10}$/.test(phone)) return messages.phoneInvalid
  return null
}
