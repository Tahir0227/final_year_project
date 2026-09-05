/**
 * encryptionService.js — AES-256-CBC encryption for sensitive credential fields.
 *
 * Fields encrypted before DB storage:
 *   github_token_enc, jira_api_token_enc, discord_bot_token_enc
 *
 * NEVER return or log decrypted values. Always mask for frontend:
 *   maskToken(plain) → "ghp_****...****"
 *
 * ENCRYPTION_KEY: 64 hex characters (32 bytes) — set in .env only.
 * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

'use strict';

const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // AES block size

function getKey() {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be set as a 64-character hex string in .env');
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypt plaintext → "ivHex:encryptedHex" string for DB storage.
 * Returns null if input is falsy.
 */
function encrypt(plainText) {
  if (!plainText) return null;
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(String(plainText), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt "ivHex:encryptedHex" back to plaintext.
 * Returns null if input is falsy.
 */
function decrypt(encryptedText) {
  if (!encryptedText) return null;
  const key = getKey();
  const parts = encryptedText.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted format — expected "iv:data"');
  }
  const [ivHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Mask a token for safe frontend display.
 * "ghp_ABCDEFG1234" → "ghp_****...1234"
 * Shows first 4 + last 4 chars only.
 */
function maskToken(token) {
  if (!token || token.length < 8) return '****';
  const head = token.slice(0, 4);
  const tail = token.slice(-4);
  return `${head}****...${tail}`;
}

module.exports = { encrypt, decrypt, maskToken };
