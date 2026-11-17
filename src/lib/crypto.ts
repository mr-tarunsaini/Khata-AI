/**
 * Web Crypto API AES-GCM Authenticated Encryption for Local Storage & Cache
 * 
 * Complies with Section 8 & Section 9 of KhataAI Security Requirements:
 * - AES-GCM with 256-bit key length
 * - PBKDF2 key derivation (100,000 iterations, SHA-256)
 * - Unique initialization vector (IV, 96 bits) per encryption
 * - Raw keys are never stored in localStorage or IndexedDB
 * - Decrypted keys reside purely in volatile memory and are cleared on lock/logout
 */

export interface EncryptedPayload {
  ciphertext: string // Base64
  iv: string // Base64
  salt: string // Base64
  version: number
  timestamp: number
}

// In-memory active CryptoKey (cleared on logout or window close)
let sessionCryptoKey: CryptoKey | null = null

// Helper to convert ArrayBuffer to Base64
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Helper to convert Base64 to ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Derives an AES-GCM 256-bit key from a user PIN/passphrase using PBKDF2.
 */
export async function deriveKeyFromPassphrase(passphrase: string, saltBuffer?: Uint8Array): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is not supported in this browser environment')
  }

  const enc = new TextEncoder()
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )

  const salt = saltBuffer || window.crypto.getRandomValues(new Uint8Array(16))

  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )

  return { key, salt }
}

/**
 * Sets the active session crypto key.
 */
export function setSessionKey(key: CryptoKey | null): void {
  sessionCryptoKey = key
}

/**
 * Checks whether an active encryption session is unlocked.
 */
export function isSessionUnlocked(): boolean {
  return sessionCryptoKey !== null
}

/**
 * Encrypts arbitrary JavaScript data into an EncryptedPayload.
 */
export async function encryptData(data: unknown, customKey?: CryptoKey): Promise<EncryptedPayload> {
  const key = customKey || sessionCryptoKey
  if (!key) {
    throw new Error('Encryption key not unlocked. Call deriveKeyFromPassphrase first.')
  }

  const jsonString = JSON.stringify(data)
  const enc = new TextEncoder()
  const encoded = enc.encode(jsonString)

  // 12-byte IV for AES-GCM
  const iv = window.crypto.getRandomValues(new Uint8Array(12))

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv.buffer as ArrayBuffer
    },
    key,
    encoded.buffer as ArrayBuffer
  )

  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv.buffer as ArrayBuffer),
    salt: '',
    version: 1,
    timestamp: Date.now()
  }
}

/**
 * Decrypts an EncryptedPayload back into original JavaScript data.
 */
export async function decryptData<T = unknown>(payload: EncryptedPayload, customKey?: CryptoKey): Promise<T> {
  const key = customKey || sessionCryptoKey
  if (!key) {
    throw new Error('Encryption key not unlocked.')
  }

  const ivBuffer = base64ToBuffer(payload.iv)
  const ciphertextBuffer = base64ToBuffer(payload.ciphertext)

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBuffer
    },
    key,
    ciphertextBuffer
  )

  const dec = new TextDecoder()
  const jsonString = dec.decode(decryptedBuffer)
  return JSON.parse(jsonString) as T
}

/**
 * Clears the in-memory session encryption key (Locks the cache).
 */
export function lockSession(): void {
  sessionCryptoKey = null
}
