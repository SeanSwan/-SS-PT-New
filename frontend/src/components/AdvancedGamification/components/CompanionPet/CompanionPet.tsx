/**
 * COMPONENT: CompanionPet
 * PURPOSE: Mounted companion preview, adoption flow, and interaction controls.
 * DATA: Uses /api/gamification pet endpoints through useCompanionPet.
 */
import React, { useState, useCallback } from 'react';
import {
  Bird,
  Flame,
  Gamepad2,
  HeartHandshake,
  PawPrint,
  Shield,
  Sparkles,
  Utensils,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import PetSprite from './PetSprite';
import { normalizePetPercent } from './companionPetNumbers';
import { useCompanionPet } from './useCompanionPet';
import type { CompanionPetProps, PetSpeciesId } from './CompanionPetTypes';
import {
  PetContainer, PetSpriteWrapper, HealthBar, HealthFill,
  PetName, PetInfo, InteractionBar, InteractionButton,
  AdoptionContainer, AdoptionTitle, AdoptionSubtitle,
  SpeciesGrid, SpeciesCard, SpeciesName, SpeciesElement,
  NameInput, AdoptButton, SpeciesIcon, LoadingPetContainer,
} from './CompanionPetStyles';

type SpeciesOption = {
  id: PetSpeciesId;
  name: string;
  element: string;
  color: string;
  Icon: LucideIcon;
};

const SPECIES_CATALOG: SpeciesOption[] = [
  { id: 'crystal_dragon', name: 'Crystal Dragon', element: 'ice', color: 'var(--accent-primary, #60C0F0)', Icon: Sparkles },
  { id: 'iron_wolf', name: 'Iron Wolf', element: 'steel', color: 'var(--text-secondary, #94a3b8)', Icon: Shield },
  { id: 'ember_phoenix', name: 'Ember Phoenix', element: 'fire', color: 'var(--accent-gold, #C6A84B)', Icon: Flame },
  { id: 'frost_swan', name: 'Frost Swan', element: 'frost', color: 'var(--text-primary, #E0ECF4)', Icon: Bird },
  { id: 'shadow_panther', name: 'Shadow Panther', element: 'shadow', color: 'var(--accent-secondary, #8B5CF6)', Icon: PawPrint },
];

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
        {SPECIES_CATALOG.map(sp => {
          const Icon = sp.Icon;
          return (
            <SpeciesCard
            key={sp.id}
            type="button"
            $selected={selected === sp.id}
            $color={sp.color}
            onClick={() => setSelected(sp.id)}
            aria-pressed={selected === sp.id}
            >
              <SpeciesIcon><Icon size={24} aria-hidden /></SpeciesIcon>
              <SpeciesName>{sp.name}</SpeciesName>
              <SpeciesElement>{sp.element}</SpeciesElement>
            </SpeciesCard>
          );
        })}
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
          <AdoptButton type="button" onClick={handleAdopt} disabled={loading}>
            {loading ? 'Hatching...' : 'Adopt Companion'}
          </AdoptButton>
        </>
      )}
    </AdoptionContainer>
  );
};

const CompanionPet: React.FC<CompanionPetProps> = ({
  userId,
  size = 180,
  showControls = true,
  compact = false,
}) => {
  const { pet, hasPet, loading, error, interacting, adoptPet, interact, refetch } = useCompanionPet(userId);

  if (loading) {
    return (
      <LoadingPetContainer $compact={compact}>
        <PetInfo>Loading companion...</PetInfo>
      </LoadingPetContainer>
    );
  }

  if (error) {
    return (
      <LoadingPetContainer $compact={compact} role="alert" aria-live="polite">
        <PetInfo>Companion data is temporarily unavailable.</PetInfo>
        <InteractionButton type="button" onClick={refetch} disabled={interacting}>
          Retry
        </InteractionButton>
      </LoadingPetContainer>
    );
  }

  if (!hasPet || !pet) {
    return <AdoptionFlow onAdopt={adoptPet} loading={interacting} />;
  }

  const health = normalizePetPercent(pet.health);
  const healthTone = health >= 70 ? 'strong' : health >= 40 ? 'caution' : 'critical';

  return (
    <PetContainer>
      <PetSpriteWrapper>
        <PetSprite pet={pet} size={compact ? 120 : size} />
      </PetSpriteWrapper>

      <HealthBar>
        <HealthFill $percent={health} $tone={healthTone} />
      </HealthBar>

      {!compact && (
        <>
          <PetName>{pet.name}</PetName>
          <PetInfo>
            <span>{pet.mood.emoji} {pet.mood.description}</span>
            <span>|</span>
            <span>{pet.evolution.name}</span>
            <span>|</span>
            <span>Lv {pet.level}</span>
          </PetInfo>
        </>
      )}

      {showControls && (
        <InteractionBar>
          <InteractionButton type="button" onClick={() => interact('pet')} disabled={interacting}>
            <HeartHandshake size={14} aria-hidden /> Pet
          </InteractionButton>
          <InteractionButton type="button" onClick={() => interact('feed')} disabled={interacting}>
            <Utensils size={14} aria-hidden /> Feed
          </InteractionButton>
          <InteractionButton type="button" onClick={() => interact('play')} disabled={interacting}>
            <Gamepad2 size={14} aria-hidden /> Play
          </InteractionButton>
        </InteractionBar>
      )}
    </PetContainer>
  );
};

export default CompanionPet;
