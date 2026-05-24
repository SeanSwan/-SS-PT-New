/**
 * ┌─── COMPONENT: CompanionPetPanel ──────────────────────────────┐
 * │ PURPOSE: Displays companion pet in avatar home — species,     │
 * │   evolution stage, mood, health bar, interaction buttons.     │
 * │ CEO RULING: Deterministic state machine (Phase 2). LangGraph  │
 * │   pet AI deferred to Phase 3.                                 │
 * │ BACKEND: /api/gamification/users/:userId/pet (existing V2)    │
 * └───────────────────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  Heart, Zap, Smile, Frown, Star, Sparkles,
  Drumstick, Hand, Gamepad2, PawPrint, Egg,
} from 'lucide-react';
import apiService from '../../services/api.service';

// ── Animations ──
const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
`;
const wiggle = keyframes`
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-3deg); }
  75% { transform: rotate(3deg); }
`;
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`;

// ── Styled Components ──
const Panel = styled.div`
  padding: 20px;
  border-radius: 14px;
  background: var(--bg-elevated, #141419);
  border: 1px solid rgba(96, 192, 240, 0.15);
  max-width: 380px;
`;

const PetHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const PetName = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  display: flex;
  align-items: center;
  gap: 8px;
`;

const EvolutionBadge = styled.span<{ $stage: number }>`
  padding: 3px 10px;
  border-radius: 6px;
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  background: ${({ $stage }) =>
    $stage >= 5 ? 'rgba(198, 168, 75, 0.15)' :
    $stage >= 3 ? 'rgba(139, 92, 246, 0.15)' :
    'rgba(96, 192, 240, 0.1)'};
  color: ${({ $stage }) =>
    $stage >= 5 ? '#C6A84B' :
    $stage >= 3 ? '#8B5CF6' :
    'var(--accent-primary, #60C0F0)'};
  border: 1px solid ${({ $stage }) =>
    $stage >= 5 ? 'rgba(198, 168, 75, 0.3)' :
    $stage >= 3 ? 'rgba(139, 92, 246, 0.3)' :
    'rgba(96, 192, 240, 0.2)'};
`;

const PetAvatar = styled.div<{ $mood: string }>`
  width: 100%;
  aspect-ratio: 1;
  max-height: 180px;
  border-radius: 12px;
  background: linear-gradient(145deg, #0A0A0F, #002060);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  font-size: 64px;
  animation: ${({ $mood }) =>
    $mood === 'ecstatic' || $mood === 'happy' ? bounce :
    $mood === 'tired' || $mood === 'sad' ? pulse :
    wiggle} 2s ease-in-out infinite;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
`;

const StatCard = styled.div`
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(10, 10, 15, 0.6);
  border: 1px solid rgba(96, 192, 240, 0.08);
`;

const StatLabel = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const StatValue = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 15px;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
`;

const HealthBar = styled.div`
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: rgba(224, 236, 244, 0.08);
  overflow: hidden;
  margin-bottom: 16px;
`;

const HealthFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => Math.min(100, Math.max(0, $pct))}%;
  border-radius: 4px;
  background: ${({ $pct }) =>
    $pct > 70 ? 'linear-gradient(90deg, #60C0F0, #8B5CF6)' :
    $pct > 40 ? '#C6A84B' :
    '#EF4444'};
  transition: width 0.5s ease;
`;

const InteractionRow = styled.div`
  display: flex;
  gap: 8px;
`;

const InteractBtn = styled.button`
  flex: 1;
  min-height: 44px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(96, 192, 240, 0.2);
  background: rgba(96, 192, 240, 0.06);
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: all 0.15s;

  &:hover {
    background: rgba(96, 192, 240, 0.12);
    border-color: rgba(96, 192, 240, 0.4);
  }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const NoPetState = styled.div`
  text-align: center;
  padding: 32px 16px;
`;

const AdoptBtn = styled.button`
  min-height: 44px;
  padding: 12px 28px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #002060, #8B5CF6);
  color: #E0ECF4;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px auto 0;
  transition: opacity 0.15s;

  &:hover { opacity: 0.9; }
`;

// ── Species emoji map ──
const SPECIES_EMOJI: Record<string, string> = {
  crystal_dragon: '🐉',
  iron_wolf: '🐺',
  ember_phoenix: '🦅',
  frost_swan: '🦢',
  shadow_panther: '🐆',
};

const STAGE_NAMES = ['Egg', 'Hatchling', 'Juvenile', 'Adult', 'Elder', 'Mythic'];

const MOOD_ICONS: Record<string, React.ReactNode> = {
  ecstatic: <Sparkles size={14} />,
  happy: <Smile size={14} />,
  content: <Heart size={14} />,
  tired: <Frown size={14} />,
  sad: <Frown size={14} />,
  critical: <Zap size={14} />,
};

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
  userId: number;
  onAdoptClick: () => void;
}

const CompanionPetPanel: React.FC<CompanionPetPanelProps> = ({ userId, onAdoptClick }) => {
  const [petData, setPetData] = useState<PetData | null>(null);
  const [interacting, setInteracting] = useState(false);

  const fetchPet = useCallback(async () => {
    try {
      const res = await apiService.get<{ success: boolean; data: PetData }>(`/api/gamification/users/${userId}/pet`);
      const d = res.data;
      if (d.success) setPetData(d.data);
    } catch { /* best-effort */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => { fetchPet(); }, [fetchPet]);

  const handleInteract = async (type: 'pet' | 'feed' | 'play') => {
    setInteracting(true);
    try {
      await apiService.post(`/api/gamification/users/${userId}/pet/interact`, { interactionType: type });
      await fetchPet();
    } catch { /* best-effort */ }
    setInteracting(false);
  };

  if (!petData) {
    return (
      <Panel>
        <PetHeader><PetName><PawPrint size={18} /> Companion</PetName></PetHeader>
        <StatLabel style={{ justifyContent: 'center' }}>Loading...</StatLabel>
      </Panel>
    );
  }

  if (!petData.hasPet) {
    return (
      <Panel>
        <NoPetState>
          <Egg size={48} style={{ color: 'var(--accent-primary, #60C0F0)', marginBottom: 12 }} />
          <PetName style={{ justifyContent: 'center', marginBottom: 8 }}>
            No Companion Yet
          </PetName>
          <StatLabel style={{ justifyContent: 'center', marginBottom: 0 }}>
            Adopt a companion to join you in your home
          </StatLabel>
          <AdoptBtn onClick={onAdoptClick}>
            <Sparkles size={16} /> Adopt a Companion
          </AdoptBtn>
        </NoPetState>
      </Panel>
    );
  }

  const { pet } = petData;
  if (!pet) return null;
  const emoji = SPECIES_EMOJI[pet.species] || '🐾';
  const stageName = STAGE_NAMES[pet.evolution?.stage ?? 0];
  const moodLabel = pet.mood?.label || 'content';

  return (
    <Panel>
      <PetHeader>
        <PetName>
          <PawPrint size={16} /> {pet.name || 'Unnamed'}
        </PetName>
        <EvolutionBadge $stage={pet.evolution?.stage ?? 0}>
          {stageName}
        </EvolutionBadge>
      </PetHeader>

      <PetAvatar $mood={moodLabel}>
        {pet.evolution?.stage === 0 ? '🥚' : emoji}
      </PetAvatar>

      <HealthBar>
        <HealthFill $pct={pet.health ?? 50} />
      </HealthBar>

      <StatsGrid>
        <StatCard>
          <StatLabel><Heart size={12} /> Health</StatLabel>
          <StatValue>{Math.round(pet.health ?? 0)}%</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel><Smile size={12} /> Happiness</StatLabel>
          <StatValue>{Math.round(pet.happiness ?? 0)}%</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel>{MOOD_ICONS[moodLabel] || <Heart size={12} />} Mood</StatLabel>
          <StatValue style={{ fontSize: 13, textTransform: 'capitalize' }}>{moodLabel}</StatValue>
        </StatCard>
        <StatCard>
          <StatLabel><Star size={12} /> Species</StatLabel>
          <StatValue style={{ fontSize: 12 }}>
            {pet.species?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—'}
          </StatValue>
        </StatCard>
      </StatsGrid>

      <InteractionRow>
        <InteractBtn onClick={() => handleInteract('pet')} disabled={interacting}>
          <Hand size={18} /> Pet
        </InteractBtn>
        <InteractBtn onClick={() => handleInteract('feed')} disabled={interacting}>
          <Drumstick size={18} /> Feed
        </InteractBtn>
        <InteractBtn onClick={() => handleInteract('play')} disabled={interacting}>
          <Gamepad2 size={18} /> Play
        </InteractBtn>
      </InteractionRow>
    </Panel>
  );
};

export default CompanionPetPanel;
