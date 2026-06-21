/**
 * COMPONENT: CompanionPetPanel
 * PURPOSE: Displays the user's companion pet inside Avatar Home.
 * PARENT: AvatarHomePage
 * DATA: /api/gamification/users/:userId/pet
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Drumstick,
  Egg,
  Frown,
  Gamepad2,
  Hand,
  Heart,
  PawPrint,
  Smile,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';
import apiService from '../../services/api.service';
import {
  AdoptBtn,
  CenteredPetName,
  CenteredStatLabel,
  EvolutionBadge,
  HealthBar,
  HealthFill,
  InteractBtn,
  InteractionRow,
  MoodStatValue,
  NoPetIcon,
  NoPetState,
  Panel,
  PetAvatar,
  PetHeader,
  PetName,
  StatCard,
  StatLabel,
  StatsGrid,
  StatValue,
  SpeciesStatValue,
} from './CompanionPetPanel.styles';

const SPECIES_EMOJI: Record<string, string> = {
  crystal_dragon: '\u{1F409}',
  iron_wolf: '\u{1F43A}',
  ember_phoenix: '\u{1F985}',
  frost_swan: '\u{1F9A2}',
  shadow_panther: '\u{1F406}',
};

const STAGE_NAMES = ['Egg', 'Hatchling', 'Juvenile', 'Adult', 'Elder', 'Mythic'];
const COMPANION_LOAD_ERROR = 'Companion data is unavailable. Please try again later.';

const MOOD_ICONS: Record<string, React.ReactNode> = {
  ecstatic: <Sparkles size={14} />,
  happy: <Smile size={14} />,
  content: <Heart size={14} />,
  tired: <Frown size={14} />,
  sad: <Frown size={14} />,
  critical: <Zap size={14} />,
};

const clampPercent = (value: number | undefined): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value ?? 0)));
};

const clampStage = (value: number | undefined): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(STAGE_NAMES.length - 1, Math.max(0, Math.floor(value ?? 0)));
};

const safeText = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim() ? value : fallback;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asFiniteNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

interface PetData {
  hasPet: boolean;
  pet?: {
    species: string;
    name: string;
    evolution: { stage: number; label: string };
    health: number;
    happiness: number;
    mood: { label: string; animation: string };
    appearance: Record<string, string>;
    birthDate?: string;
  };
}

interface CompanionPetPanelProps {
  userIdSegment: string;
  onAdoptClick: () => void;
}

const normalizeAppearance = (value: unknown): Record<string, string> => {
  if (!isRecord(value)) return {};
  return Object.entries(value).reduce<Record<string, string>>((safe, [key, item]) => {
    if (key.trim() && typeof item === 'string' && item.trim()) safe[key] = item;
    return safe;
  }, {});
};

const normalizePetData = (value: unknown): PetData => {
  if (!isRecord(value) || value.hasPet !== true || !isRecord(value.pet)) {
    return { hasPet: false };
  }

  const pet = value.pet;
  const evolution = isRecord(pet.evolution) ? pet.evolution : {};
  const mood = isRecord(pet.mood) ? pet.mood : {};

  return {
    hasPet: true,
    pet: {
      species: safeText(pet.species, ''),
      name: safeText(pet.name, ''),
      evolution: {
        stage: asFiniteNumber(evolution.stage),
        label: safeText(evolution.label, ''),
      },
      health: asFiniteNumber(pet.health),
      happiness: asFiniteNumber(pet.happiness),
      mood: {
        label: safeText(mood.label, 'content'),
        animation: safeText(mood.animation, ''),
      },
      appearance: normalizeAppearance(pet.appearance),
      birthDate: typeof pet.birthDate === 'string' ? pet.birthDate : undefined,
    },
  };
};

const CompanionPetPanel: React.FC<CompanionPetPanelProps> = ({
  userIdSegment,
  onAdoptClick,
}) => {
  const [petData, setPetData] = useState<PetData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [interacting, setInteracting] = useState(false);
  const interactingRef = useRef(false);

  const fetchPet = useCallback(async () => {
    try {
      const res = await apiService.get<{ success: boolean; data: unknown }>(
        `/api/gamification/users/${userIdSegment}/pet`
      );
      const d = res.data;
      if (d.success) {
        setLoadError(null);
        setPetData(normalizePetData(d.data));
      } else {
        setPetData(null);
        setLoadError(COMPANION_LOAD_ERROR);
      }
    } catch {
      setPetData(null);
      setLoadError(COMPANION_LOAD_ERROR);
    }
  }, [userIdSegment]);

  useEffect(() => { fetchPet(); }, [fetchPet]);

  const handleInteract = async (type: 'pet' | 'feed' | 'play') => {
    if (interactingRef.current) return;
    interactingRef.current = true;
    setInteracting(true);
    try {
      await apiService.post(`/api/gamification/users/${userIdSegment}/pet/interact`, {
        interactionType: type,
      });
      await fetchPet();
    } catch {
      /* best-effort */
    } finally {
      interactingRef.current = false;
      setInteracting(false);
    }
  };

  if (loadError) {
    return (
      <Panel>
        <PetHeader><PetName><PawPrint size={18} /> Companion</PetName></PetHeader>
        <CenteredStatLabel role="status" aria-live="polite">
          {loadError}
        </CenteredStatLabel>
      </Panel>
    );
  }

  if (!petData) {
    return (
      <Panel>
        <PetHeader><PetName><PawPrint size={18} /> Companion</PetName></PetHeader>
        <CenteredStatLabel>Loading...</CenteredStatLabel>
      </Panel>
    );
  }

  if (!petData.hasPet) {
    return (
      <Panel>
        <NoPetState>
          <NoPetIcon aria-hidden="true">
            <Egg size={48} />
          </NoPetIcon>
          <CenteredPetName>
            No Companion Yet
          </CenteredPetName>
          <CenteredStatLabel $flush>
            Adopt a companion to join you in your home
          </CenteredStatLabel>
          <AdoptBtn type="button" onClick={onAdoptClick}>
            <Sparkles size={16} /> Adopt a Companion
          </AdoptBtn>
        </NoPetState>
      </Panel>
    );
  }

  const { pet } = petData;
  if (!pet) return null;

  const speciesKey = safeText(pet.species, '');
  const petName = safeText(pet.name, 'Unnamed');
  const moodLabel = safeText(pet.mood?.label, 'content');
  const emoji = SPECIES_EMOJI[speciesKey] || '\u{1F43E}';
  const stage = clampStage(pet.evolution?.stage);
  const stageName = STAGE_NAMES[stage];
  const health = clampPercent(pet.health);
  const happiness = clampPercent(pet.happiness);
  const speciesLabel = speciesKey
    ? speciesKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : '-';

  return (
    <Panel>
      <PetHeader>
        <PetName>
          <PawPrint size={16} /> {petName}
        </PetName>
        <EvolutionBadge $stage={stage}>{stageName}</EvolutionBadge>
      </PetHeader>

      <PetAvatar $mood={moodLabel}>
        {stage === 0 ? '\u{1F95A}' : emoji}
      </PetAvatar>

      <HealthBar>
        <HealthFill $pct={health} />
      </HealthBar>

      <StatsGrid>
        <StatCard>
          <StatLabel><Heart size={12} /> Health</StatLabel>
          <StatValue>{health}%</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel><Smile size={12} /> Happiness</StatLabel>
          <StatValue>{happiness}%</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>{MOOD_ICONS[moodLabel] || <Heart size={12} />} Mood</StatLabel>
          <MoodStatValue>{moodLabel}</MoodStatValue>
        </StatCard>
        <StatCard>
          <StatLabel><Star size={12} /> Species</StatLabel>
          <SpeciesStatValue>{speciesLabel}</SpeciesStatValue>
        </StatCard>
      </StatsGrid>

      <InteractionRow aria-busy={interacting}>
        <InteractBtn type="button" onClick={() => handleInteract('pet')} disabled={interacting}>
          <Hand size={18} /> Pet
        </InteractBtn>
        <InteractBtn type="button" onClick={() => handleInteract('feed')} disabled={interacting}>
          <Drumstick size={18} /> Feed
        </InteractBtn>
        <InteractBtn type="button" onClick={() => handleInteract('play')} disabled={interacting}>
          <Gamepad2 size={18} /> Play
        </InteractBtn>
      </InteractionRow>
    </Panel>
  );
};

export default CompanionPetPanel;
