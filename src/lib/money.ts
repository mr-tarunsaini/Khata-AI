/**
 * Money Utility for KhataAI
 * 
 * CORE FINANCIAL RULE:
 * All currency values are stored as integer paise (1 Rupee = 100 Paise).
 * Never use floating-point arithmetic for balances, aggregations, or ledgers.
 */

/**
 * Converts a rupee value (number or string) into exact integer paise.
 * Safely rounds to the nearest paise to avoid IEEE-754 precision bugs.
 */
export function rupeesToPaise(rupees: number | string): number {
  const numericRupees = typeof rupees === 'string' ? parseFloat(rupees.trim()) : rupees
  if (isNaN(numericRupees) || !isFinite(numericRupees)) {
    throw new Error(`Invalid rupee amount: ${rupees}`)
  }
  // Math.round handles any minor fractional edge cases (e.g. 19.99 * 100 = 1999)
  return Math.round(numericRupees * 100)
}

/**
 * Converts integer paise to floating rupees for display only.
 */
export function paiseToRupees(paise: number): number {
  if (!Number.isInteger(paise)) {
    throw new Error(`Paise must be an integer, got: ${paise}`)
  }
  return paise / 100
}

/**
 * Formats integer paise into standard Indian Rupee notation (e.g. ₹1,240 or ₹340.50).
 */
export function formatINR(paise: number, options: { showSymbol?: boolean; showZeroPaise?: boolean } = {}): string {
  const { showSymbol = true, showZeroPaise = false } = options
  const absPaise = Math.abs(paise)
  const isNegative = paise < 0

  const wholeRupees = Math.floor(absPaise / 100)
  const remainingPaise = absPaise % 100

  // Format with Indian numbering system (Lakhs and Crores)
  const formattedWhole = new Intl.NumberFormat('en-IN').format(wholeRupees)

  let formatted = formattedWhole
  if (remainingPaise > 0 || showZeroPaise) {
    formatted += `.${remainingPaise.toString().padStart(2, '0')}`
  }

  const symbol = showSymbol ? '₹' : ''
  return isNegative ? `-${symbol}${formatted}` : `${symbol}${formatted}`
}

/**
 * Formats integer paise into a spoken phrase in Hindi/Hinglish/English.
 * E.g. "340 rupaye", "1,240 rupaye"
 */
export function formatSpokenINR(paise: number, language: 'hi' | 'hi-en' | 'en' = 'hi'): string {
  const absPaise = Math.abs(paise)
  const wholeRupees = Math.floor(absPaise / 100)
  const remainingPaise = absPaise % 100

  const formattedNumber = new Intl.NumberFormat('en-IN').format(wholeRupees)

  if (language === 'en') {
    if (remainingPaise > 0) {
      return `${formattedNumber} rupees and ${remainingPaise} paise`
    }
    return `${formattedNumber} rupees`
  }

  // Hindi / Hinglish
  if (remainingPaise > 0) {
    return `${formattedNumber} rupaye ${remainingPaise} paise`
  }
  return `${formattedNumber} rupaye`
}

/**
 * Deterministically adds two paise amounts.
 */
export function addPaise(a: number, b: number): number {
  if (!Number.isInteger(a) || !Number.isInteger(b)) {
    throw new Error(`Both amounts must be integers: a=${a}, b=${b}`)
  }
  return a + b
}

/**
 * Deterministically subtracts b from a in paise.
 */
export function subtractPaise(a: number, b: number): number {
  if (!Number.isInteger(a) || !Number.isInteger(b)) {
    throw new Error(`Both amounts must be integers: a=${a}, b=${b}`)
  }
  return a - b
}
