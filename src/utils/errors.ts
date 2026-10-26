/** Turn an unknown rejection value into a message that can be shown to a devotee. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}
