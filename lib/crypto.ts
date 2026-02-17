import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Get encryption key from environment.
 * In dev mode, auto-generates a deterministic key if APP_ENCRYPTION_KEY is not set.
 */
const DEV_KEY = 'volition-dev-key-do-not-use-in-production-0000';

function getEncryptionKey(): Buffer {
  let secret = process.env.APP_ENCRYPTION_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('APP_ENCRYPTION_KEY environment variable is required in production');
    }
    console.warn('[crypto] APP_ENCRYPTION_KEY not set — using auto-generated dev key. Do NOT use in production.');
    secret = DEV_KEY;
  }

  // Derive a key from the secret
  const salt = Buffer.from('volition-salt'); // Fixed salt for deterministic key
  return scryptSync(secret, salt, KEY_LENGTH);
}

/**
 * Encrypt sensitive data (tool configurations)
 */
export function encrypt(plaintext: string): string {
  try {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Format: iv:authTag:ciphertext
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 */
export function decrypt(ciphertext: string): string {
  try {
    const key = getEncryptionKey();
    const parts = ciphertext.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypt tool configuration data
 */
export function encryptToolConfig(config: Record<string, any>): string {
  const json = JSON.stringify(config);
  return encrypt(json);
}

/**
 * Decrypt tool configuration data
 */
export function decryptToolConfig(encrypted: string): Record<string, any> {
  const json = decrypt(encrypted);
  return JSON.parse(json);
}

/**
 * Mask sensitive values for display (e.g., API keys)
 */
export function maskSecret(value: string, visibleChars: number = 4): string {
  if (!value || value.length <= visibleChars * 2) {
    return '***';
  }
  
  const start = value.slice(0, visibleChars);
  const end = value.slice(-visibleChars);
  const masked = '*'.repeat(Math.min(20, value.length - visibleChars * 2));
  
  return `${start}${masked}${end}`;
}

