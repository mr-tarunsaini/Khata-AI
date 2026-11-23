import { describe, it, expect } from 'vitest'
import { parseSpokenAmountPaise } from '@/lib/numberParser'
import { parseIntentFromTranscript } from '@/services/parser/intentParser'

describe('Spoken Number Parser (Hindi, English, Hinglish)', () => {
  it('parses numeric digits', () => {
    expect(parseSpokenAmountPaise('340')).toBe(34000)
    expect(parseSpokenAmountPaise('200 rupaye')).toBe(20000)
    expect(parseSpokenAmountPaise('1240')).toBe(124000)
  })

  it('parses Hindi number words: teen sau chaalis, paanch sau, ek hazaar', () => {
    expect(parseSpokenAmountPaise('teen sau chaalis')).toBe(34000)
    expect(parseSpokenAmountPaise('paanch sau')).toBe(50000)
    expect(parseSpokenAmountPaise('ek hazaar')).toBe(100000)
    expect(parseSpokenAmountPaise('do hazaar paanch sau')).toBe(250000)
  })

  it('parses colloquial fractional terms: dedh sau, dhaai sau', () => {
    expect(parseSpokenAmountPaise('dedh sau')).toBe(15000)
    expect(parseSpokenAmountPaise('dhaai sau')).toBe(25000)
    expect(parseSpokenAmountPaise('dedh hazaar')).toBe(150000)
  })

  it('parses English number words: three hundred forty, two hundred', () => {
    expect(parseSpokenAmountPaise('three hundred forty')).toBe(34000)
    expect(parseSpokenAmountPaise('two hundred')).toBe(20000)
  })

  it('parses Indian English colloquial shorthand: three-forty, two-fifty', () => {
    expect(parseSpokenAmountPaise('3-40')).toBe(34000)
    expect(parseSpokenAmountPaise('three-forty')).toBe(34000)
  })
})

describe('Intent Parser Engine', () => {
  it('parses: "Ramesh ka 340 udhaar" -> ADD_CREDIT', () => {
    const res = parseIntentFromTranscript('Ramesh ka 340 udhaar')
    expect(res.intent).toBe('ADD_CREDIT')
    expect(res.customer_name).toBe('Ramesh')
    expect(res.amount_paise).toBe(34000)
    expect(res.currency).toBe('INR')
  })

  it('parses: "Suresh ne 200 rupaye diye" -> RECORD_PAYMENT', () => {
    const res = parseIntentFromTranscript('Suresh ne 200 rupaye diye')
    expect(res.intent).toBe('RECORD_PAYMENT')
    expect(res.customer_name).toBe('Suresh')
    expect(res.amount_paise).toBe(20000)
  })

  it('parses: "Ramesh ka total kitna hai?" -> QUERY_CUSTOMER_BALANCE', () => {
    const res = parseIntentFromTranscript('Ramesh ka total kitna hai?')
    expect(res.intent).toBe('QUERY_CUSTOMER_BALANCE')
    expect(res.customer_name).toBe('Ramesh')
    expect(res.amount_paise).toBeNull()
  })

  it('parses: "Aaj kitna udhaar gaya?" -> QUERY_DAILY_CREDIT', () => {
    const res = parseIntentFromTranscript('Aaj kitna udhaar gaya?')
    expect(res.intent).toBe('QUERY_DAILY_CREDIT')
  })

  it('parses: "Nahi, 430" -> CORRECT_PENDING_TRANSACTION', () => {
    const res = parseIntentFromTranscript('Nahi, 430', true)
    expect(res.intent).toBe('CORRECT_PENDING_TRANSACTION')
    expect(res.amount_paise).toBe(43000)
  })

  it('parses relative date: "Kal Ramesh ne 500 diye"', () => {
    const res = parseIntentFromTranscript('Kal Ramesh ne 500 diye')
    expect(res.intent).toBe('RECORD_PAYMENT')
    expect(res.relative_date_phrase).toBe('kal')
    expect(res.amount_paise).toBe(50000)
  })

  it('parses: "Tarun ka naya khata jodo" -> CREATE_CUSTOMER', () => {
    const res = parseIntentFromTranscript('Tarun ka naya khata jodo')
    expect(res.intent).toBe('CREATE_CUSTOMER')
    expect(res.customer_name).toBe('Tarun')
  })

  it('parses: "Manoj ka naya khata khole" -> CREATE_CUSTOMER', () => {
    const res = parseIntentFromTranscript('Manoj ka naya khata khole')
    expect(res.intent).toBe('CREATE_CUSTOMER')
    expect(res.customer_name).toBe('Manoj')
  })

  it('parses: "Is naam ka naya khata jode" -> CREATE_CUSTOMER', () => {
    const res = parseIntentFromTranscript('Is naam ka naya khata jode')
    expect(res.intent).toBe('CREATE_CUSTOMER')
  })

  it('parses unknown customer in transaction: "Tarun ka 500 udhaar" -> ADD_CREDIT with name Tarun', () => {
    const res = parseIntentFromTranscript('Tarun ka 500 udhaar')
    expect(res.intent).toBe('ADD_CREDIT')
    expect(res.customer_name).toBe('Tarun')
    expect(res.amount_paise).toBe(50000)
  })

  it('parses Devanagari Hindi transaction: "तरुण का 500 उधार"', () => {
    const res = parseIntentFromTranscript('तरुण का 500 उधार')
    expect(res.intent).toBe('ADD_CREDIT')
    expect(res.customer_name).toBe('तरुण')
    expect(res.amount_paise).toBe(50000)
  })
})
