/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: CompanionPet                                      ║
 * ║  PURPOSE: Tamagotchi companion — adopt, interact, evolve      ║
 * ║  OWNER: Claude Opus 4.6 | LAST VALIDATED: 2026-03-28         ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │        [SVG Pet Sprite with animations]                     │
 * │             ████████░░░░ Health: 72                         │
 * │            Frosty the Crystal Dragon                        │
 * │         ✨ Happy · Adult · Lv 18                            │
 * │      [🤝 Pet]  [🍖 Feed]  [⚡ Play]                        │
 * └────────────────────────────────────────────────────────────┘
 *
 * ADOPTION FLOW (if no pet):
 * ┌────────────────────────────────────────────────────────────┐
 * │           Adopt Your Companion                              │
 * │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │
 * │  │Dragon│ │ Wolf │ │Phoenx│ │ Swan │ │Panthr│           │
 * │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘           │
 * │           [Name your pet...]                               │
 * │              [✨ Adopt]                                     │
 * └────────────────────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  { userId, size?, showControls?, compact? }
 * Hook:      useCompanionPet → GET/POST /api/gamification/users/:id/pet/*
 * Children:  PetSprite (SVG), AdoptionFlow (inline)
 *
 * GAMIFICATION HOOKS:
 * - Pet health derived from Aegis HUD needs (no separate decay)
 * - Activity recording feeds pet evolution + appearance mods
 * - Pet/Feed/Play interactions boost pet happiness
 */
import React, { useState, useCallback } from 'react';
import PetSprite from './PetSprite';
import { useCompanionPet } from './useCompanionPet';
import type { CompanionPetProps, PetSpeciesId } from './CompanionPetTypes';
import {
  PetContainer, PetSpriteWrapper, HealthBar, HealthFill,
  PetName, PetInfo, InteractionBar, InteractionButton,
  AdoptionContainer, AdoptionTitle, AdoptionSubtitle,
  SpeciesGrid, SpeciesCard, SpeciesName, SpeciesElement,
  NameInput, AdoptButton,
} from './CompanionPetStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Species Catalog (matches backend)
// ─────────────────────────────────────────────────────────────

const SPECIES_CATALOG: Array<{ id: PetSpeciesId; name: string; element: string; color: string; icon: string }> = [
  { id: 'crystal_dragon', name: 'Crystal Dragon', element: 'ice',    color: '#60C0F0', icon: '🐉' },
  { id: 'iron_wolf',      name: 'Iron Wolf',      element: 'steel',  color: '#C0C0C0', icon: '🐺' },
  { id: 'ember_phoenix',  name: 'Ember Phoenix',  element: 'fire',   color: '#F59E0B', icon: '🔥' },
  { id: 'frost_swan',     name: 'Frost Swan',     element: 'frost',  color: '#E0ECF4', icon: '🦢' },
  { id: 'shadow_panther', name: 'Shadow Panther',  element: 'shadow', color: '#8B5CF6', icon: '🐆' },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Adoption Flow Sub-Component
// ─────────────────────────────────────────────────────────────

const AdoptionFlow: React.FC<{
  onAdopt: (species: PetSpeciesId, name: string) => void;
  loading: boolean;
}> = ({ onAdopt, loading }) => {
  const [selected, setSelected] = useState<PetSpeciesId | null>(null);
  const [petName, setPetName] = useState('');

  const handleAdopt = useCallback(() => {
    if (!selected) return;
    onAdopt(selected, petName.trim() || SPECIES_CATALOG.find(s => s.id === selected)?.name || 'Pet');
  }, [selected, petName, onAdopt]);

  return (
    <AdoptionContainer>
      <AdoptionTitle>Adopt Your Companion</AdoptionTitle>
      <AdoptionSubtitle>
        Choose a companion that will grow alongside you. They thrive when you train,
        and fade when you rest too long.
      </AdoptionSubtitle>

      <SpeciesGrid>
        {SPECIES_CATALOG.map(sp => (
          <SpeciesCard
            key={sp.id}
            $selected={selected === sp.id}
            $color={sp.color}
            onClick={() => setSelected(sp.id)}
            aria-pressed={selected === sp.id}
          >
            <span style={{ fontSize: '2rem' }}>{sp.icon}</span>
            <SpeciesName>{sp.name}</SpeciesName>
            <SpeciesElement>{sp.element}</SpeciesElement>
          </SpeciesCard>
        ))}
      </SpeciesGrid>

      {selected && (
        <>
          <NameInput
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            placeholder="Name your companion..."
            maxLength={50}
            aria-label="Pet name"
          />
          <AdoptButton onClick={handleAdopt} disabled={loading}>
            {loading ? 'Hatching...' : 'Adopt Companion'}
          </AdoptButton>
        </>
      )}
    </AdoptionContainer>
  );
};

// ─────────────────────────────────────────────────────────────
// SECTION: Main Component
// ─────────────────────────────────────────────────────────────

const CompanionPet: React.FC<CompanionPetProps> = ({
  userId,
  size = 180,
  showControls = true,
  compact = false,
}) => {
  const { pet, hasPet, loading, interacting, adoptPet, interact } = useCompanionPet(userId);

  // Loading state
  if (loading) {
    return (
      <PetContainer style={{ minHeight: compact ? 100 : 200, justifyContent: 'center' }}>
        <PetInfo>Loading companion...</PetInfo>
      </PetContainer>
    );
  }

  // No pet — show adoption flow
  if (!hasPet || !pet) {
    return <AdoptionFlow onAdopt={adoptPet} loading={interacting} />;
  }

  // Health bar color based on health
  const healthColor = pet.health >= 70 ? '#4CAF50' : pet.health >= 40 ? '#F59E0B' : '#EF4444';

  return (
    <PetContainer>
      <PetSpriteWrapper>
        <PetSprite pet={pet} size={compact ? 120 : size} />
      </PetSpriteWrapper>

      <HealthBar>
        <HealthFill $percent={pet.health} $color={healthColor} />
      </HealthBar>

      {!compact && (
        <>
          <PetName>{pet.name}</PetName>
          <PetInfo>
            <span>{pet.mood.emoji} {pet.mood.description}</span>
            <span>·</span>
            <span>{pet.evolution.name}</span>
            <span>·</span>
            <span>Lv {pet.level}</span>
          </PetInfo>
        </>
      )}

      {showControls && (
        <InteractionBar>
          <InteractionButton onClick={() => interact('pet')} disabled={interacting}>
            🤝 Pet
          </InteractionButton>
          <InteractionButton onClick={() => interact('feed')} disabled={interacting}>
            🍖 Feed
          </InteractionButton>
          <InteractionButton onClick={() => interact('play')} disabled={interacting}>
            ⚡ Play
          </InteractionButton>
        </InteractionBar>
      )}
    </PetContainer>
  );
};

export default CompanionPet;
