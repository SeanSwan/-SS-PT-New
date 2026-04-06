export { useE2EE } from './useE2EE';
export type { UseE2EEReturn } from './useE2EE';
export type { EncryptedPayload, E2EEKeyBundle, E2EEPreKey } from './e2eeCrypto';
export type { E2EEStatus, RemoteKeyBundle } from './e2eeApi';
export {
  encryptMessage,
  decryptMessage,
  hasLocalKeys,
  clearLocalKeys,
  getLocalIdentityPublicKey,
  generateKeyBundle,
} from './e2eeCrypto';
export {
  getEncryptionStatus,
  uploadKeyBundle,
  fetchUserKeyBundle,
  getSafetyNumber,
  deactivateE2EE,
} from './e2eeApi';
