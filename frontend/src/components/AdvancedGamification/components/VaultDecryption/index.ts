/**
 * ============================================================================
 * FILE: index.ts
 * PURPOSE: Barrel export for Vault Decryption components
 * ============================================================================
 */

export { default as VaultDecryptionAnimation } from './VaultDecryptionAnimation';
export { useVaultDecryption } from './useVaultDecryption';
export type {
  VaultDrop,
  VaultDropResult,
  LootRarity,
  LootItem,
  VaultDecryptionAnimationProps,
} from './VaultDecryptionTypes';
