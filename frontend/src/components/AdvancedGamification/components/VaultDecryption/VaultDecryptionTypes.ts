/**
 * ============================================================================
 * FILE: VaultDecryptionTypes.ts
 * PURPOSE: Type definitions for the Vault Decryption loot system
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-03-28
 * ============================================================================
 */

export type LootRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'pearlescent';

export type LootItemType = 'title' | 'avatar_frame' | 'emote' | 'profile_banner' | 'xp_boost' | 'streak_freeze' | 'badge';

export interface LootItem {
  id: string;
  type: LootItemType;
  name: string;
  description: string;
  rarity: LootRarity;
  duration?: number;
}

export interface VaultDrop {
  id: string;
  userId: number;
  rarity: LootRarity;
  rarityLabel: string;
  rarityColor: string;
  glowColor: string;
  decryptionTime: number;
  xpBonus: number;
  item: LootItem;
  trigger: string;
  actionType: string;
  timestamp: string;
}

export interface VaultDropResult {
  dropped: boolean;
  drop?: VaultDrop;
  message?: string;
}

export interface VaultDecryptionAnimationProps {
  drop: VaultDrop;
  isVisible: boolean;
  onComplete: () => void;
  onClose: () => void;
}

export interface VaultInventoryProps {
  userId: number;
  compact?: boolean;
}
