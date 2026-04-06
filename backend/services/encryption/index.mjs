export {
  encrypt,
  decrypt,
  encryptFields,
  decryptFields,
  encryptJSON,
  decryptJSON,
  isEncryptionEnabled,
  isEncrypted,
  generateMasterKey,
} from './encryptionService.mjs';

export {
  initE2EEModels,
  uploadKeyBundle,
  fetchKeyBundle,
  getPreKeyCount,
  deactivateE2EE,
  isE2EEEnabled,
  generateSafetyNumber,
  syncE2EETables,
} from './keyStoreService.mjs';

export {
  registerEncryptionHooks,
  registerAllHealthEncryptionHooks,
} from './healthDataEncryption.mjs';
