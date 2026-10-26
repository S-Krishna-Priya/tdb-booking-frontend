export function validatePhone(value: string): string | null {
  const phone = value.trim()
  if (!phone) return 'Enter your phone number.'
  if (!/^[0-9]{10}$/.test(phone)) return 'Enter a valid 10-digit phone number.'
  return null
}
