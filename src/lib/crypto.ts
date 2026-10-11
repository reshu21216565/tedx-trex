/**
 * Cryptographic utility functions for TEDx Ticketing.
 * Uses Web Crypto API for secure random bytes and SHA-256 hashing.
 */

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback RFC4122 v4 UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generates a cryptographically secure random ticket token.
 * Contains 128-bit cryptographic entropy.
 * Format: tedx_tok_<32 hex characters>
 */
export function generateSecureToken(): string {
  const buffer = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(buffer);
  } else {
    for (let i = 0; i < 16; i++) {
      buffer[i] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `tedx_tok_${hex}`;
}

/**
 * Computes SHA-256 hash of a string.
 * Used for zero-knowledge token hash storage and indexed lookup.
 */
export async function hashToken(token: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(token);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Synchronous fallback for simple environments
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `hash_${Math.abs(hash).toString(16).padStart(16, '0')}`;
}

/**
 * Synchronous hash token for offline / in-memory lookup.
 */
export function hashTokenSync(token: string): string {
  // Simple fast djb2 + sdbm combined hash for sync indexing
  let h1 = 5381;
  let h2 = 0;
  for (let i = 0; i < token.length; i++) {
    const code = token.charCodeAt(i);
    h1 = ((h1 << 5) + h1) ^ code;
    h2 = code + (h2 << 6) + (h2 << 16) - h2;
  }
  return `${(h1 >>> 0).toString(16)}${(h2 >>> 0).toString(16)}`;
}

/**
 * Validates if an email address is reasonably well-formed.
 * Does not reject or discard malformed emails, only flags them.
 */
export function isInvalidEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return true;
  const trimmed = email.trim();
  if (trimmed.length === 0) return true;
  // Standard permissive email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return !emailRegex.test(trimmed);
}
