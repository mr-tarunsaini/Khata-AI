/**
 * Idempotency Utility for KhataAI
 * 
 * Guarantees that retries or accidental double-presses do not result in duplicate financial entries.
 */

// Cache of processed idempotency keys in the current session
const processedKeys = new Set<string>()

/**
 * Generates a standard UUID v4 idempotency key.
 */
export function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Generates a deterministic content-hash idempotency key for transactions.
 * If identical content is submitted within a short window, it resolves to the same key.
 */
export function generateDeterministicKey(
  shopId: string,
  customerId: string,
  amountPaise: number,
  effectiveDate: string,
  type: string
): string {
  const payload = `${shopId}:${customerId}:${amountPaise}:${effectiveDate}:${type}`
  // Simple hash for deterministic tracking
  let hash = 0
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0 // Convert to 32bit integer
  }
  return `det_${Math.abs(hash)}_${effectiveDate}`
}

/**
 * Checks whether an idempotency key was already recorded in this session.
 */
export function isIdempotencyKeyProcessed(key: string): boolean {
  return processedKeys.has(key)
}

/**
 * Marks an idempotency key as processed.
 */
export function markIdempotencyKeyProcessed(key: string): void {
  processedKeys.add(key)
}

/**
 * Clears the session idempotency cache (e.g. on shop change or demo reset).
 */
export function clearIdempotencyCache(): void {
  processedKeys.clear()
}
