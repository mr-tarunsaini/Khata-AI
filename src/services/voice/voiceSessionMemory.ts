/**
 * Short-Lived Ephemeral Voice Session Memory Service
 * 
 * Manages multi-turn conversation context for Indian Kirana shopkeepers.
 * Binds pronouns ("usne", "inka", "unka", "inhe") to the active customer
 * and preserves context for rapid corrections ("Nahi, 430").
 * 
 * Enforces a strict 90-second sliding expiration window.
 */

import { VoiceSessionMemory, VoiceIntent } from '@/types/ledger'

const SESSION_TTL_MS = 90 * 1000 // 90 seconds sliding TTL

class VoiceSessionMemoryService {
  private memory: VoiceSessionMemory | null = null

  /**
   * Check if current session memory is still fresh and valid
   */
  isValid(): boolean {
    if (!this.memory) return false
    const now = Date.now()
    return now - this.memory.lastUpdated < SESSION_TTL_MS
  }

  /**
   * Get current active session memory, or null if expired
   */
  getMemory(): VoiceSessionMemory | null {
    if (!this.isValid()) {
      this.memory = null
      return null
    }
    return this.memory
  }

  /**
   * Get remaining valid seconds in current session
   */
  getRemainingSeconds(): number {
    if (!this.memory || !this.isValid()) return 0
    const elapsed = Date.now() - this.memory.lastUpdated
    return Math.max(0, Math.ceil((SESSION_TTL_MS - elapsed) / 1000))
  }

  /**
   * Update session memory with new turn details
   */
  update(updates: {
    activeCustomerId?: string | null
    activeCustomerName?: string | null
    lastTransactionId?: string | null
    lastAmountPaise?: number | null
    lastIntent?: VoiceIntent | null
  }): void {
    const prev = this.getMemory()
    this.memory = {
      activeCustomerId: updates.activeCustomerId ?? prev?.activeCustomerId ?? null,
      activeCustomerName: updates.activeCustomerName ?? prev?.activeCustomerName ?? null,
      lastTransactionId: updates.lastTransactionId ?? prev?.lastTransactionId ?? null,
      lastAmountPaise: updates.lastAmountPaise ?? prev?.lastAmountPaise ?? null,
      lastIntent: updates.lastIntent ?? prev?.lastIntent ?? null,
      lastUpdated: Date.now()
    }
  }

  /**
   * Check if spoken transcript contains an anaphoric pronoun
   * referencing the active customer from previous turn.
   */
  detectPronounReference(transcript: string): boolean {
    const normalized = transcript.toLowerCase().trim()
    const pronounRegex = /\b(usne|uske|uska|uski|unka|unki|unke|unhone|inhe|inka|inke|inki|inhone|isne|wahi|same|he|she|him|his|her)\b/i
    return pronounRegex.test(normalized)
  }

  /**
   * Resolve customer details from pronoun reference if session memory is active
   */
  resolveCustomerFromContext(transcript: string): { customerId: string; customerName: string } | null {
    if (!this.isValid() || !this.memory?.activeCustomerId || !this.memory?.activeCustomerName) {
      return null
    }

    if (this.detectPronounReference(transcript)) {
      return {
        customerId: this.memory.activeCustomerId,
        customerName: this.memory.activeCustomerName
      }
    }

    return null
  }

  /**
   * Clear session memory manually (e.g. on Cancel, Logout, or Timeout)
   */
  clear(): void {
    this.memory = null
  }
}

export const sessionMemory = new VoiceSessionMemoryService()
