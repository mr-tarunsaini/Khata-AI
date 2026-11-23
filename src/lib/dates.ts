/**
 * Date Utility for KhataAI
 * 
 * All relative dates ("aaj", "kal", "parso", "yesterday") must be evaluated
 * within the shop's local timezone (default: Asia/Kolkata).
 */

export const DEFAULT_TIMEZONE = 'Asia/Kolkata'

/**
 * Gets the current date string (YYYY-MM-DD) in Asia/Kolkata timezone.
 */
export function getTodayDateString(timeZone: string = DEFAULT_TIMEZONE): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  return formatter.format(new Date())
}

/**
 * Gets the relative date string given an offset in days in the specified timezone.
 * offset: 0 = today, -1 = yesterday, -2 = day before yesterday, +1 = tomorrow
 */
export function getRelativeDateString(daysOffset: number, timeZone: string = DEFAULT_TIMEZONE): string {
  const now = new Date()
  // Add offset in milliseconds (86,400,000 ms per day)
  const targetDate = new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  return formatter.format(targetDate)
}

/**
 * Parses relative spoken date phrases into YYYY-MM-DD.
 * Supports:
 * - "aaj" / "today" -> 0
 * - "kal" / "yesterday" (in past context) -> -1
 * - "parso" / "day before yesterday" -> -2
 * - "tarso" -> -3
 */
export function parseRelativeDatePhrase(phrase: string, timeZone: string = DEFAULT_TIMEZONE): { date: string; offsetDays: number; normalizedPhrase: string } | null {
  const clean = phrase.toLowerCase().trim()

  if (['aaj', 'today', 'aj'].includes(clean)) {
    return {
      date: getRelativeDateString(0, timeZone),
      offsetDays: 0,
      normalizedPhrase: 'aaj'
    }
  }

  if (['kal', 'yesterday', 'beeta kal', 'beete kal'].includes(clean)) {
    return {
      date: getRelativeDateString(-1, timeZone),
      offsetDays: -1,
      normalizedPhrase: 'kal'
    }
  }

  if (['parso', 'day before yesterday', 'parson'].includes(clean)) {
    return {
      date: getRelativeDateString(-2, timeZone),
      offsetDays: -2,
      normalizedPhrase: 'parso'
    }
  }

  if (['tarso', 'tarson'].includes(clean)) {
    return {
      date: getRelativeDateString(-3, timeZone),
      offsetDays: -3,
      normalizedPhrase: 'tarso'
    }
  }

  return null
}

/**
 * Formats a YYYY-MM-DD date into friendly readable label (e.g. "Aaj, 17 Nov", "Kal, 16 Nov", or "15 Nov 2026")
 */
export function formatFriendlyDate(dateStr?: string | null, language: 'hi' | 'hi-en' | 'en' = 'hi', timeZone: string = DEFAULT_TIMEZONE): string {
  if (!dateStr || typeof dateStr !== 'string') {
    return language === 'hi' ? 'आज (Today)' : language === 'hi-en' ? 'Aaj (Today)' : 'Today'
  }

  const today = getTodayDateString(timeZone)
  const yesterday = getRelativeDateString(-1, timeZone)
  const dayBefore = getRelativeDateString(-2, timeZone)

  if (dateStr === today) {
    return language === 'hi' ? 'आज (Today)' : language === 'hi-en' ? 'Aaj (Today)' : 'Today'
  }
  if (dateStr === yesterday) {
    return language === 'hi' ? 'कल (Yesterday)' : language === 'hi-en' ? 'Kal (Yesterday)' : 'Yesterday'
  }
  if (dateStr === dayBefore) {
    return language === 'hi' ? 'परसों (2 days ago)' : language === 'hi-en' ? 'Parso (2 days ago)' : '2 days ago'
  }

  try {
    // Format standard date
    const parts = dateStr.split('-').map(Number)
    if (parts.length < 3 || parts.some(isNaN)) {
      return dateStr
    }
    const [year, month, day] = parts
    const d = new Date(Date.UTC(year, month - 1, day))
    if (isNaN(d.getTime())) return dateStr

    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(d)
  } catch {
    return dateStr
  }
}

/**
 * Returns formatted current time (e.g. "04:30 PM") in Asia/Kolkata
 */
export function formatTime(isoString?: string | null, timeZone: string = DEFAULT_TIMEZONE): string {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return ''
    return new Intl.DateTimeFormat('en-IN', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(d)
  } catch {
    return ''
  }
}
