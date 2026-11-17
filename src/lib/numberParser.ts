/**
 * Deterministic Number Parser for Indian Kirana Speech
 * 
 * Supports:
 * - Digits: "340", "200", "1500"
 * - Hindi number words: "teen sau chaalis" (340), "paanch sau" (500), "ek hazaar" (1000), "do hazaar paanch sau" (2500)
 * - Colloquial terms: "dedh sau" (150), "dhaai sau" (250), "dedh hazaar" (1500), "dhaai hazaar" (2500)
 * - English phrases: "three hundred forty" (340), "two hundred fifty" (250), "three-forty" (340), "two-fifty" (250)
 * - Converts correctly to integer paise!
 */

const HINDI_UNITS: Record<string, number> = {
  'ek': 1, 'ik': 1, 'one': 1, '1': 1,
  'do': 2, 'two': 2, '2': 2,
  'teen': 3, 'tin': 3, 'three': 3, '3': 3,
  'chaar': 4, 'char': 4, 'four': 4, '4': 4,
  'paanch': 5, 'panch': 5, 'five': 5, '5': 5,
  'chheh': 6, 'che': 6, 'chhe': 6, 'six': 6, '6': 6,
  'saat': 7, 'sat': 7, 'seven': 7, '7': 7,
  'aath': 8, 'ath': 8, 'eight': 8, '8': 8,
  'nau': 9, 'no': 9, 'nine': 9, '9': 9,
  'das': 10, 'dus': 10, 'ten': 10, '10': 10,
  'gyaarah': 11, 'gyara': 11, 'eleven': 11, '11': 11,
  'baarah': 12, 'bara': 12, 'twelve': 12, '12': 12,
  'terah': 13, 'tera': 13, 'thirteen': 13, '13': 13,
  'chaudah': 14, 'chauda': 14, 'fourteen': 14, '14': 14,
  'pandrah': 15, 'pandra': 15, 'fifteen': 15, '15': 15,
  'solah': 16, 'sola': 16, 'sixteen': 16, '16': 16,
  'satrah': 17, 'satra': 17, 'seventeen': 17, '17': 17,
  'athaarah': 18, 'athara': 18, 'eighteen': 18, '18': 18,
  'unnis': 19, 'unnees': 19, 'nineteen': 19, '19': 19,
  'bees': 20, 'twenty': 20, '20': 20,
  'ikkis': 21, 'twenty-one': 21,
  'baais': 22, 'twenty-two': 22,
  'teis': 23, 'twenty-three': 23,
  'chaubis': 24, 'twenty-four': 24,
  'pachchis': 25, 'pachis': 25, 'twenty-five': 25,
  'chhabis': 26, 'twenty-six': 26,
  'sattais': 27, 'twenty-seven': 27,
  'atthais': 28, 'twenty-eight': 28,
  'unattis': 29, 'twenty-nine': 29,
  'tees': 30, 'thirty': 30, '30': 30,
  'ikattis': 31,
  'battis': 32,
  'tentis': 33,
  'chauntis': 34,
  'paintis': 35, 'thirty-five': 35,
  'chhattis': 36,
  'saintis': 37,
  'adhtis': 38,
  'untaalis': 39,
  'chaalis': 40, 'chalis': 40, 'forty': 40, 'fourty': 40, '40': 40,
  'paitalis': 45, 'forty-five': 45,
  'pachaas': 50, 'pachas': 50, 'fifty': 50, '50': 50,
  'pachpan': 55, 'fifty-five': 55,
  'saath': 60, 'sath': 60, 'sixty': 60, '60': 60,
  'paansath': 65, 'sixty-five': 65,
  'sattar': 70, 'seventy': 70, '70': 70,
  'pachattar': 75, 'seventy-five': 75,
  'assi': 80, 'eighty': 80, '80': 80,
  'pachaasi': 85, 'eighty-five': 85,
  'nabbe': 90, 'nabbey': 90, 'ninety': 90, '90': 90,
  'pachaanve': 95, 'ninety-five': 95
}

// Special fractional multipliers
const FRACTION_WORDS: Record<string, { multiplier: number; base: number }> = {
  'dedh': { multiplier: 1.5, base: 100 }, // dedh sau = 150
  'dhaai': { multiplier: 2.5, base: 100 }, // dhaai sau = 250
  'dhai': { multiplier: 2.5, base: 100 }
}

const SCALE_WORDS: Record<string, number> = {
  'sau': 100,
  'so': 100,
  'hundred': 100,
  'hazaar': 1000,
  'hazar': 1000,
  'thousand': 1000,
  'k': 1000,
  'lakh': 100000,
  'laakh': 100000,
  'crore': 10000000,
  'karod': 10000000
}

/**
 * Attempts to extract an amount in rupees from a transcript phrase.
 * Returns the amount in integer paise, or null if no valid amount found.
 */
export function parseSpokenAmountPaise(transcript: string): number | null {
  if (!transcript) return null

  const cleaned = transcript
    .toLowerCase()
    .replace(/[₹,]/g, ' ')
    .replace(/(\w+)\s*[-]\s*(\w+)/g, '$1 $2') // e.g. "3-40" -> "3 40", "three-forty" -> "three forty"
    .replace(/\b(rupaye|rupay|rupees|rupee|rs|rp|paise|ka|ki|ke|ne|ko)\b/g, ' ')
    .trim()

  // 1. Check for direct numerical digit patterns (e.g. "340", "340.50")
  const digitRegex = /\b(\d+(?:\.\d{1,2})?)\b/g
  const directMatches: number[] = []
  let match: RegExpExecArray | null

  while ((match = digitRegex.exec(cleaned)) !== null) {
    const val = parseFloat(match[1])
    if (!isNaN(val) && val > 0) {
      directMatches.push(val)
    }
  }

  // Handle colloquial "three-forty" / "3 40" -> 340, "4 30" -> 430
  if (directMatches.length === 2 && directMatches[0] < 10 && directMatches[1] >= 10 && directMatches[1] <= 99) {
    return Math.round((directMatches[0] * 100 + directMatches[1]) * 100)
  }

  // If a single clear digit is found and no scale words follow it
  const tokens = cleaned.split(/\s+/).filter(Boolean)
  let foundScale = false
  for (const token of tokens) {
    if (SCALE_WORDS[token]) {
      foundScale = true
      break
    }
  }

  if (directMatches.length === 1 && !foundScale) {
    return Math.round(directMatches[0] * 100)
  }

  // 2. Parse mixed words & scales (e.g. "three forty", "teen sau chaalis", "paanch sau", "1 hazaar 200", "dedh sau")
  // First check colloquial word shorthand: "three forty" (digit 1-9 followed by tens word 10-90)
  if (tokens.length === 2 && !foundScale) {
    const firstVal = HINDI_UNITS[tokens[0]]
    const secondVal = HINDI_UNITS[tokens[1]]
    if (firstVal && secondVal && firstVal < 10 && secondVal >= 10 && secondVal <= 90) {
      return Math.round((firstVal * 100 + secondVal) * 100)
    }
  }

  let currentTotal = 0
  let currentSegment = 0
  let parsedAny = false

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    // Check fraction word (e.g. "dedh", "dhaai")
    if (FRACTION_WORDS[token]) {
      const frac = FRACTION_WORDS[token]
      const nextToken = tokens[i + 1]
      if (nextToken && SCALE_WORDS[nextToken]) {
        currentTotal += frac.multiplier * SCALE_WORDS[nextToken]
        i++ // consume scale word
        parsedAny = true
        continue
      }
    }

    // Direct number token (e.g. "500", "2")
    if (/^\d+(\.\d+)?$/.test(token)) {
      const num = parseFloat(token)
      currentSegment += num
      parsedAny = true
      continue
    }

    // Hindi/English unit/tens word (e.g. "teen", "chaalis", "fifty")
    if (HINDI_UNITS[token] !== undefined) {
      currentSegment += HINDI_UNITS[token]
      parsedAny = true
      continue
    }

    // Scale word (e.g. "sau", "hazaar", "hundred", "thousand")
    if (SCALE_WORDS[token] !== undefined) {
      const scale = SCALE_WORDS[token]
      if (currentSegment === 0) {
        currentSegment = 1
      }
      currentTotal += currentSegment * scale
      currentSegment = 0
      parsedAny = true
      continue
    }
  }

  currentTotal += currentSegment

  if (parsedAny && currentTotal > 0) {
    return Math.round(currentTotal * 100)
  }

  return null
}
