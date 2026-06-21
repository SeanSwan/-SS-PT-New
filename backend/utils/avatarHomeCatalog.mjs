export const FURNITURE_TIERS = {
  bedroom: {
    bed: ['starter_bed', 'comfort_bed', 'premium_bed', 'luxury_bed'],
    decor: ['basic_poster', 'framed_art', 'trophy_wall', 'crystalline_display'],
  },
  kitchen: {
    fridge: ['starter_fridge', 'mid_fridge', 'smart_fridge', 'luxury_fridge'],
    table: ['basic_table', 'dining_table', 'premium_table', 'crystalline_table'],
  },
  training_room: {
    equipment: ['starter_rack', 'mid_rack', 'full_gym', 'elite_gym'],
    mat: ['basic_mat', 'premium_mat', 'pro_mat', 'crystalline_mat'],
  },
};

export const HOME_TIER_LEVELS = { starter: 10, mid: 25, premium: 50, luxury: 100 };

export const MARKETPLACE_CATALOG = [
  { id: 'crystal_bed', type: 'furniture', name: 'Crystalline Bed', room: 'bedroom', slot: 'bed', price: 500, rarity: 'epic' },
  { id: 'aurora_poster', type: 'furniture', name: 'Aurora Borealis Wall', room: 'bedroom', slot: 'decor', price: 300, rarity: 'rare' },
  { id: 'smart_kitchen', type: 'furniture', name: 'Smart Kitchen Island', room: 'kitchen', slot: 'table', price: 400, rarity: 'rare' },
  { id: 'holographic_rack', type: 'furniture', name: 'Holographic Training Rack', room: 'training_room', slot: 'equipment', price: 800, rarity: 'legendary' },
  { id: 'golden_dragon', type: 'pet_skin', name: 'Golden Dragon Skin', species: 'dragon', price: 600, rarity: 'epic' },
  { id: 'arctic_wolf', type: 'pet_skin', name: 'Arctic Wolf Skin', species: 'wolf', price: 400, rarity: 'rare' },
  { id: 'ember_phoenix', type: 'pet_skin', name: 'Ember Phoenix Skin', species: 'phoenix', price: 500, rarity: 'epic' },
  { id: 'shadow_panther', type: 'pet_skin', name: 'Midnight Panther Skin', species: 'panther', price: 350, rarity: 'rare' },
  { id: 'crystal_swan', type: 'pet_skin', name: 'Crystal Swan Skin', species: 'swan', price: 700, rarity: 'legendary' },
  { id: 'crystalline_suit', type: 'outfit', name: 'Crystalline Training Suit', price: 450, rarity: 'epic' },
  { id: 'obsidian_armor', type: 'outfit', name: 'Obsidian Battle Armor', price: 600, rarity: 'epic' },
  { id: 'golden_tracksuit', type: 'outfit', name: 'Gilded Fern Tracksuit', price: 350, rarity: 'rare' },
  { id: 'legendary_wings', type: 'outfit', name: 'Swan Wing Cape', price: 1000, rarity: 'legendary' },
  { id: 'starter_casual', type: 'outfit', name: 'Casual Workout Tee', price: 100, rarity: 'common' },
];
