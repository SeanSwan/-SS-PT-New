export type RPGFeatureStatus = 'active' | 'planned';

export interface RPGFeature {
  id: string;
  name: string;
  description: string;
  inspiration: string;
  status: RPGFeatureStatus;
  psychology: string;
}

export const RPG_FEATURES: RPGFeature[] = [
  {
    id: 'aegis-hud',
    name: 'Aegis HUD',
    description: 'Sims-style needs bars (Athletic, Recovery, Social, Discipline, Vitality) with moodlet system and daily decay.',
    inspiration: 'The Sims 3',
    status: 'active',
    psychology: 'Nurturing Effect - daily retention through digital caretaking',
  },
  {
    id: 'vault-decryption',
    name: 'Vault Decryption',
    description: 'Post-workout loot drops with rarity tiers (Common to Pearlescent). Cryptographic decryption animation.',
    inspiration: 'Borderlands 4',
    status: 'active',
    psychology: 'Variable Ratio Reinforcement - randomized rewards after real workout completion',
  },
  {
    id: 'ghost-mode',
    name: 'Ghost Mode',
    description: 'Race against your previous best workout. Per-exercise and total volume comparison with bonus XP.',
    inspiration: 'Gran Turismo / Forza',
    status: 'active',
    psychology: 'Self-Competition - intrinsic motivation through personal records',
  },
  {
    id: 'streak-fortress',
    name: 'Streak Fortress',
    description: 'Visual fortress that grows with streak count. 6 tiers from Ruins to Crystalline Citadel.',
    inspiration: 'Minecraft / Tower Defense',
    status: 'active',
    psychology: 'Loss Aversion - visible progress encourages recovery-friendly consistency',
  },
  {
    id: 'job-classes',
    name: 'Job Classes',
    description: 'FFXIV-style fitness classes: Paladin, Monk, Ranger, White Mage, Dark Knight. Each with +15% XP bonus.',
    inspiration: 'Final Fantasy XIV',
    status: 'active',
    psychology: 'Meaningful Progression - identity investment through class selection',
  },
  {
    id: 'companion-pet',
    name: 'Companion Pet',
    description: '5 species with 6 evolution stages. Activity-based appearance mods (armor, speed, glow, accessories).',
    inspiration: 'Tamagotchi x The Sims',
    status: 'active',
    psychology: 'Nurturing Effect - emotional attachment to a health-linked companion',
  },
  {
    id: 'factions',
    name: 'Faction Warfare',
    description: 'The Vanguard (strength), The Syndicate (agility), Apex (power). Global leaderboard competition.',
    inspiration: 'Overwatch Seasons',
    status: 'planned',
    psychology: 'Social Obligation - team identity drives attendance',
  },
  {
    id: 'my-space',
    name: 'MY SPACE Rooms',
    description: 'Virtual rooms users customize with SwanCoins. Friends can visit. Room reflects achievement level.',
    inspiration: 'The Sims Build/Buy',
    status: 'planned',
    psychology: 'Investment Loop - customization reflects earned progress',
  },
];
