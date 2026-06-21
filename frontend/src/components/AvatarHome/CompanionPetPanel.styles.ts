import styled, { keyframes } from 'styled-components';

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

export const Panel = styled.div`
  padding: 20px;
  border-radius: 8px;
  background: var(--bg-elevated, #141419);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
  max-width: 380px;
`;

export const PetHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

export const PetName = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const EvolutionBadge = styled.span<{ $stage: number }>`
  padding: 3px 10px;
  border-radius: 6px;
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  background: ${({ $stage }) =>
    $stage >= 5 ? 'color-mix(in srgb, var(--accent-warning, #C6A84B) 15%, transparent)' :
    $stage >= 3 ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent)' :
    'color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent)'};
  color: ${({ $stage }) =>
    $stage >= 5 ? 'var(--accent-warning, #C6A84B)' :
    $stage >= 3 ? 'var(--accent-secondary, #8B5CF6)' :
    'var(--accent-primary, #60C0F0)'};
  border: 1px solid ${({ $stage }) =>
    $stage >= 5 ? 'color-mix(in srgb, var(--accent-warning, #C6A84B) 30%, transparent)' :
    $stage >= 3 ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent)' :
    'color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)'};
`;

export const PetAvatar = styled.div<{ $mood: string }>`
  width: 100%;
  aspect-ratio: 1;
  max-height: 180px;
  border-radius: 8px;
  background: linear-gradient(145deg, var(--bg-base, #0A0A0F), var(--surface-primary, #002060));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  font-size: 64px;
  animation: ${({ $mood }) =>
    $mood === 'ecstatic' || $mood === 'happy' ? bounce :
    $mood === 'tired' || $mood === 'sad' ? pulse :
    wiggle} 2s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
`;

export const StatCard = styled.div`
  padding: 10px 12px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 60%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
`;

export const StatLabel = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary, #A8B7C7);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const CenteredStatLabel = styled(StatLabel)<{ $flush?: boolean }>`
  justify-content: center;
  margin-bottom: ${({ $flush }) => ($flush ? 0 : '4px')};
`;

export const StatValue = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 15px;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
`;

export const MoodStatValue = styled(StatValue)`
  font-size: 13px;
  text-transform: capitalize;
`;

export const SpeciesStatValue = styled(StatValue)`
  font-size: 12px;
`;

export const HealthBar = styled.div`
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent);
  overflow: hidden;
  margin-bottom: 16px;
`;

export const HealthFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => Math.min(100, Math.max(0, $pct))}%;
  border-radius: 4px;
  background: ${({ $pct }) =>
    $pct > 70 ? 'linear-gradient(90deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6))' :
    $pct > 40 ? 'var(--accent-warning, #C6A84B)' :
    'var(--status-danger, #EF4444)'};
  transition: width 0.5s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const InteractionRow = styled.div`
  display: flex;
  gap: 8px;
`;

export const InteractBtn = styled.button`
  flex: 1;
  min-height: 44px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent);
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    opacity 0.15s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
  }
  &:disabled { opacity: 0.4; cursor: not-allowed; }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const NoPetState = styled.div`
  text-align: center;
  padding: 32px 16px;
`;

export const NoPetIcon = styled.div`
  color: var(--accent-primary, #60C0F0);
  margin-bottom: 12px;
`;

export const CenteredPetName = styled(PetName)`
  justify-content: center;
  margin-bottom: 8px;
`;

export const AdoptBtn = styled.button`
  min-height: 44px;
  padding: 12px 28px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, var(--surface-primary, #002060), var(--accent-secondary, #8B5CF6));
  color: var(--text-primary, #E0ECF4);
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

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
