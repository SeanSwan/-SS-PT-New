/**
 * Species choices displayed by the Avatar Home companion adoption modal.
 */
export interface PetSpeciesOption {
  id: string;
  emoji: string;
  name: string;
  affinity: string;
  desc: string;
}

export const SPECIES_DATA: PetSpeciesOption[] = [
  { id: 'crystal_dragon', emoji: '\u{1F409}', name: 'Crystal Dragon', affinity: 'Athletic Power', desc: 'Ice-colored, grows fastest from workouts' },
  { id: 'iron_wolf', emoji: '\u{1F43A}', name: 'Iron Wolf', affinity: 'Discipline', desc: 'Gray-toned, rewards consistency and routine' },
  { id: 'ember_phoenix', emoji: '\u{1F985}', name: 'Ember Phoenix', affinity: 'Vitality', desc: 'Fire-colored, thrives on self-care' },
  { id: 'frost_swan', emoji: '\u{1F9A2}', name: 'Frost Swan', affinity: 'Recovery', desc: 'White-feathered, grows from rest and stretching' },
  { id: 'shadow_panther', emoji: '\u{1F406}', name: 'Shadow Panther', affinity: 'Social Energy', desc: 'Purple-gold, community-powered growth' },
];
