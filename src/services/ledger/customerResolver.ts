import { Customer } from '@/types/ledger'

export type MatchResult =
  | { type: 'EXACT'; customer: Customer }
  | { type: 'AMBIGUOUS'; candidates: Customer[] }
  | { type: 'NOT_FOUND'; query: string }

// Mapping common Devanagari names / terms to normalized Latin phonetics
const DEVANAGARI_NAME_MAP: Record<string, string> = {
  'रमेश': 'ramesh',
  'सुरेश': 'suresh',
  'अमित': 'amit',
  'प्रिया': 'priya',
  'शर्मा': 'sharma',
  'गुप्ता': 'gupta',
  'वर्मा': 'verma',
  'कुमार': 'kumar',
  'सिंह': 'singh',
  'राजेश': 'rajesh',
  'मोहन': 'mohan',
  'रोहन': 'rohan',
  'विकास': 'vikas',
  'दीपक': 'deepak',
  'संजय': 'sanjay',
  'अनिल': 'anil',
  'सुनील': 'sunil',
  'विजय': 'vijay',
  'अजय': 'ajay',
  'मनोज': 'manoj',
  'सोनू': 'sonu',
  'मोनू': 'monu'
}

// Common Indic honorifics to strip during normalization
const HONORIFICS = ['ji', 'bhai', 'bhiya', 'bhaiya', 'sahab', 'saheb', 'uncle', 'jiya', 'ji', 'जी', 'भाई', 'भैया', 'साहब']

/**
 * Normalizes customer name for robust searching.
 * Handles case, accents, Devanagari transliteration, and honorific removal.
 */
export function normalizeCustomerName(rawName: string): string {
  if (!rawName) return ''

  let name = rawName.trim().toLowerCase()

  // Replace Devanagari words if present
  for (const [devanagari, latin] of Object.entries(DEVANAGARI_NAME_MAP)) {
    if (name.includes(devanagari)) {
      name = name.replaceAll(devanagari, latin)
    }
  }

  // Remove punctuation
  name = name.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')

  // Split words and filter out honorifics
  const words = name.split(/\s+/).filter((word) => !HONORIFICS.includes(word) && word.length > 0)

  return words.join(' ')
}

/**
 * Resolves a spoken customer name against the shop's customer list.
 */
export function resolveCustomer(spokenName: string, customers: Customer[]): MatchResult {
  const normalizedQuery = normalizeCustomerName(spokenName)
  if (!normalizedQuery) {
    return { type: 'NOT_FOUND', query: spokenName }
  }

  const activeCustomers = customers.filter((c) => !c.archived_at)

  // 1. Direct exact match on normalized name or display name
  const exactMatches = activeCustomers.filter(
    (c) =>
      c.normalized_name === normalizedQuery ||
      normalizeCustomerName(c.display_name) === normalizedQuery
  )

  if (exactMatches.length === 1) {
    return { type: 'EXACT', customer: exactMatches[0] }
  }

  if (exactMatches.length > 1) {
    return { type: 'AMBIGUOUS', candidates: exactMatches }
  }

  // 2. Token / word match (e.g. query "Ramesh" against "Ramesh Sharma" and "Ramesh Gupta")
  const queryTokens = normalizedQuery.split(' ')

  const tokenMatches = activeCustomers.filter((c) => {
    const customerNorm = c.normalized_name
    const customerTokens = customerNorm.split(' ')

    // If query is a single first name, check if customer's first name matches
    if (queryTokens.length === 1) {
      return customerTokens[0] === queryTokens[0] || customerNorm.includes(queryTokens[0])
    }

    // If query has multiple tokens, all must match customer tokens
    return queryTokens.every((qt) => customerNorm.includes(qt))
  })

  if (tokenMatches.length === 1) {
    return { type: 'EXACT', customer: tokenMatches[0] }
  }

  if (tokenMatches.length > 1) {
    return { type: 'AMBIGUOUS', candidates: tokenMatches }
  }

  return { type: 'NOT_FOUND', query: spokenName }
}

/**
 * Helper to generate spoken clarification prompt for duplicate customer names.
 * E.g. "Is naam ke do customer hain. Ramesh Sharma ya Ramesh Gupta?"
 */
export function buildDuplicateClarificationPrompt(
  candidates: Customer[],
  language: 'hi' | 'hi-en' | 'en' = 'hi'
): string {
  const names = candidates.map((c) => c.display_name).join(' ya ')

  if (language === 'en') {
    return `There are ${candidates.length} customers with this name: ${candidates.map((c) => c.display_name).join(' or ')}?`
  }

  return `Is naam ke ${candidates.length} customer hain. ${names}?`
}
