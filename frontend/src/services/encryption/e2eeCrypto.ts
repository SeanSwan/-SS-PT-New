/**
 * ============================================================
 * BLUEPRINT: E2EE Crypto Service — Client-Side Encryption
 * ============================================================
 * Purpose:  Web Crypto API based encryption for E2EE messaging.
 *           Generates keypairs, encrypts/decrypts messages,
 *           manages keys in IndexedDB.
 * Scope:    Client-side only — private keys never leave device.
 * Owner:    Phase 11 — E2EE Encryption
 * Dependencies: Web Crypto API (built into all modern browsers)
 * ============================================================
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DB_NAME = 'swanstudios-e2ee';
const DB_VERSION = 1;
const IDENTITY_STORE = 'identityKeys';
const SESSION_STORE = 'sessions';
const PREKEY_STORE = 'preKeys';

const ECDH_CURVE = 'P-256'; // Web Crypto supported curve
const AES_ALGO = 'AES-GCM';
const AES_KEY_LENGTH = 256;
const IV_LENGTH = 12;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface E2EEKeyPair {
  publicKey: string;   // Base64-encoded SPKI
  privateKey: string;  // Base64-encoded PKCS8
}

export interface E2EEPreKey {
  preKeyId: number;
  publicKey: string;
}

export interface E2EEKeyBundle {
  deviceId: string;
  identityPublicKey: string;
  signedPreKeyId: number;
  signedPreKeyPublic: string;
  signedPreKeySignature: string;
  registrationId: number;
  oneTimePreKeys: E2EEPreKey[];
}

export interface EncryptedPayload {
  ciphertext: string;  // Base64
  iv: string;          // Base64
  ephemeralKey: string; // Base64 - sender's ephemeral public key
  protocol: 'swan-e2ee-v1';
}

// ---------------------------------------------------------------------------
// IndexedDB Key Store
// ---------------------------------------------------------------------------

function openKeyStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDENTITY_STORE)) {
        db.createObjectStore(IDENTITY_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SESSION_STORE)) {
        db.createObjectStore(SESSION_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PREKEY_STORE)) {
        db.createObjectStore(PREKEY_STORE, { keyPath: 'preKeyId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbPut(storeName: string, value: unknown): Promise<void> {
  const db = await openKeyStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function dbGet<T>(storeName: string, key: string | number): Promise<T | undefined> {
  const db = await openKeyStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const request = tx.objectStore(storeName).get(key);
    request.onsuccess = () => { db.close(); resolve(request.result as T); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}



// ---------------------------------------------------------------------------
// Utility — Base64 <-> ArrayBuffer
// ---------------------------------------------------------------------------

function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ---------------------------------------------------------------------------
// Key Generation
// ---------------------------------------------------------------------------

/** Generate a device ID (persisted in IndexedDB). */
export async function getOrCreateDeviceId(): Promise<string> {
  const stored = await dbGet<{ id: string; deviceId: string }>(IDENTITY_STORE, 'deviceId');
  if (stored) return stored.deviceId;

  const deviceId = crypto.randomUUID();
  await dbPut(IDENTITY_STORE, { id: 'deviceId', deviceId });
  return deviceId;
}

/** Generate a registration ID (random uint16). */
export async function getOrCreateRegistrationId(): Promise<number> {
  const stored = await dbGet<{ id: string; registrationId: number }>(IDENTITY_STORE, 'registrationId');
  if (stored) return stored.registrationId;

  const arr = new Uint16Array(1);
  crypto.getRandomValues(arr);
  const registrationId = arr[0];
  await dbPut(IDENTITY_STORE, { id: 'registrationId', registrationId });
  return registrationId;
}

/** Generate an ECDH keypair for identity. */
async function generateECDHKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: ECDH_CURVE },
    true, // extractable
    ['deriveKey', 'deriveBits']
  );
}

/** Export a CryptoKey to base64. */
async function exportPublicKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('spki', key);
  return bufferToBase64(raw);
}

async function exportPrivateKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('pkcs8', key);
  return bufferToBase64(raw);
}

/** Import a base64 public key. */
async function importPublicKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'spki',
    base64ToBuffer(b64),
    { name: 'ECDH', namedCurve: ECDH_CURVE },
    false,
    []
  );
}

/** Import a base64 private key. */
async function importPrivateKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'pkcs8',
    base64ToBuffer(b64),
    { name: 'ECDH', namedCurve: ECDH_CURVE },
    false,
    ['deriveKey', 'deriveBits']
  );
}

// ---------------------------------------------------------------------------
// Identity Key Management
// ---------------------------------------------------------------------------

/** Get or create the identity keypair (long-lived). */
export async function getOrCreateIdentityKey(): Promise<E2EEKeyPair> {
  const stored = await dbGet<{ id: string; publicKey: string; privateKey: string }>(
    IDENTITY_STORE, 'identityKey'
  );
  if (stored) return { publicKey: stored.publicKey, privateKey: stored.privateKey };

  const pair = await generateECDHKeyPair();
  const publicKey = await exportPublicKey(pair.publicKey);
  const privateKey = await exportPrivateKey(pair.privateKey);

  await dbPut(IDENTITY_STORE, { id: 'identityKey', publicKey, privateKey });
  return { publicKey, privateKey };
}

// ---------------------------------------------------------------------------
// Signed PreKey
// ---------------------------------------------------------------------------

/** Generate a signed prekey (signed by identity key via HMAC). */
export async function generateSignedPreKey(identityPrivateKeyB64: string): Promise<{
  signedPreKeyId: number;
  signedPreKeyPublic: string;
  signedPreKeySignature: string;
  signedPreKeyPrivate: string;
}> {
  const preKeyPair = await generateECDHKeyPair();
  const signedPreKeyPublic = await exportPublicKey(preKeyPair.publicKey);
  const signedPreKeyPrivate = await exportPrivateKey(preKeyPair.privateKey);

  // Sign the prekey public with identity key using HMAC
  const identityKeyRaw = base64ToBuffer(identityPrivateKeyB64);
  const hmacKey = await crypto.subtle.importKey(
    'raw',
    identityKeyRaw.slice(0, 32), // Use first 32 bytes for HMAC
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    hmacKey,
    new TextEncoder().encode(signedPreKeyPublic)
  );

  const signedPreKeyId = Math.floor(Math.random() * 0xFFFFFF);

  // Store signed prekey locally
  await dbPut(IDENTITY_STORE, {
    id: 'signedPreKey',
    signedPreKeyId,
    signedPreKeyPublic,
    signedPreKeyPrivate,
  });

  return {
    signedPreKeyId,
    signedPreKeyPublic,
    signedPreKeySignature: bufferToBase64(signature),
    signedPreKeyPrivate,
  };
}

// ---------------------------------------------------------------------------
// One-Time PreKeys
// ---------------------------------------------------------------------------

/** Generate a batch of one-time prekeys. */
export async function generateOneTimePreKeys(count: number, startId: number = 0): Promise<{
  preKeys: E2EEPreKey[];
}> {
  const preKeys: E2EEPreKey[] = [];

  for (let i = 0; i < count; i++) {
    const pair = await generateECDHKeyPair();
    const publicKey = await exportPublicKey(pair.publicKey);
    const privateKey = await exportPrivateKey(pair.privateKey);
    const preKeyId = startId + i;

    // Store private key locally
    await dbPut(PREKEY_STORE, { preKeyId, privateKey });

    preKeys.push({ preKeyId, publicKey });
  }

  return { preKeys };
}

// ---------------------------------------------------------------------------
// Full Key Bundle Generation
// ---------------------------------------------------------------------------

/** Generate and return a complete key bundle for server upload. */
export async function generateKeyBundle(preKeyCount: number = 20): Promise<E2EEKeyBundle> {
  const deviceId = await getOrCreateDeviceId();
  const registrationId = await getOrCreateRegistrationId();
  const identity = await getOrCreateIdentityKey();
  const signedPreKey = await generateSignedPreKey(identity.privateKey);
  const { preKeys } = await generateOneTimePreKeys(preKeyCount);

  return {
    deviceId,
    identityPublicKey: identity.publicKey,
    signedPreKeyId: signedPreKey.signedPreKeyId,
    signedPreKeyPublic: signedPreKey.signedPreKeyPublic,
    signedPreKeySignature: signedPreKey.signedPreKeySignature,
    registrationId,
    oneTimePreKeys: preKeys,
  };
}

// ---------------------------------------------------------------------------
// ECDH Key Agreement + AES-GCM Encryption
// ---------------------------------------------------------------------------

/** Derive a shared AES key from ECDH key agreement. */
async function deriveSharedKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    { name: AES_ALGO, length: AES_KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/** Encrypt a message for a recipient using their public key. */
export async function encryptMessage(
  plaintext: string,
  recipientPublicKeyB64: string
): Promise<EncryptedPayload> {
  // Generate ephemeral keypair for this message
  const ephemeralPair = await generateECDHKeyPair();
  const ephemeralPublicB64 = await exportPublicKey(ephemeralPair.publicKey);

  // Import recipient's public key
  const recipientPublicKey = await importPublicKey(recipientPublicKeyB64);

  // Derive shared AES key
  const sharedKey = await deriveSharedKey(ephemeralPair.privateKey, recipientPublicKey);

  // Encrypt with AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: AES_ALGO, iv },
    sharedKey,
    encoded
  );

  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    iv: bufferToBase64(iv.buffer),
    ephemeralKey: ephemeralPublicB64,
    protocol: 'swan-e2ee-v1',
  };
}

/** Decrypt a message using our private key and sender's ephemeral public key. */
export async function decryptMessage(
  payload: EncryptedPayload,
  privateKeyB64: string
): Promise<string> {
  // Import our private key
  const privateKey = await importPrivateKey(privateKeyB64);

  // Import sender's ephemeral public key
  const ephemeralPublicKey = await importPublicKey(payload.ephemeralKey);

  // Derive shared AES key
  const sharedKey = await deriveSharedKey(privateKey, ephemeralPublicKey);

  // Decrypt
  const iv = base64ToBuffer(payload.iv);
  const ciphertext = base64ToBuffer(payload.ciphertext);
  const decrypted = await crypto.subtle.decrypt(
    { name: AES_ALGO, iv },
    sharedKey,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

// ---------------------------------------------------------------------------
// E2EE Status
// ---------------------------------------------------------------------------

/** Check if E2EE keys exist locally. */
export async function hasLocalKeys(): Promise<boolean> {
  try {
    const identity = await dbGet(IDENTITY_STORE, 'identityKey');
    return !!identity;
  } catch {
    return false;
  }
}

/** Clear all local E2EE keys (for opt-out or device reset). */
export async function clearLocalKeys(): Promise<void> {
  const db = await openKeyStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      [IDENTITY_STORE, SESSION_STORE, PREKEY_STORE],
      'readwrite'
    );
    tx.objectStore(IDENTITY_STORE).clear();
    tx.objectStore(SESSION_STORE).clear();
    tx.objectStore(PREKEY_STORE).clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Get the local identity public key (for display/verification). */
export async function getLocalIdentityPublicKey(): Promise<string | null> {
  try {
    const stored = await dbGet<{ id: string; publicKey: string }>(
      IDENTITY_STORE, 'identityKey'
    );
    return stored?.publicKey ?? null;
  } catch {
    return null;
  }
}

/** Get the local signed prekey private key (for decryption). */
export async function getSignedPreKeyPrivate(): Promise<string | null> {
  try {
    const stored = await dbGet<{ id: string; signedPreKeyPrivate: string }>(
      IDENTITY_STORE, 'signedPreKey'
    );
    return stored?.signedPreKeyPrivate ?? null;
  } catch {
    return null;
  }
}
