import styled, { keyframes } from 'styled-components';
import { Loader2, Search } from 'lucide-react';
import { theme } from '../../theme/tokens';
import type { FoodSource, HealthRating } from './FoodSearchPanel.logic';

export const foodTheme = {
  panel: 'color-mix(in srgb, var(--bg-elevated, #141419) 72%, transparent)',
  panelDeep: 'color-mix(in srgb, var(--bg-base, #0A0A0F) 60%, transparent)',
  input: 'color-mix(in srgb, var(--bg-elevated, #141419) 58%, transparent)',
  border: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent)',
  borderSoft: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)',
  borderHover: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent)',
  accent: 'var(--accent-primary, #60C0F0)',
  accentSecondary: 'var(--accent-secondary, #8B5CF6)',
  gold: 'var(--accent-gold, #C6A84B)',
  danger: 'var(--accent-error, #C92A54)',
  text: 'var(--text-primary, #E0ECF4)',
  textSoft: 'var(--text-secondary, rgba(224, 236, 244, 0.7))',
  textMuted: 'var(--text-muted, rgba(224, 236, 244, 0.5))',
  textDisabled: 'var(--text-muted, rgba(224, 236, 244, 0.4))',
  inverse: 'var(--text-inverse, #0F172A)',
  focus: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 25%, transparent)',
  glow: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent)',
  shadow: '0 8px 32px color-mix(in srgb, var(--bg-base, #0A0A0F) 70%, transparent)',
} as const;

const healthBorderColor = (rating?: HealthRating): string => {
  if (rating === 'good') return foodTheme.accent;
  if (rating === 'okay') return foodTheme.gold;
  if (rating === 'bad') return foodTheme.danger;
  return 'transparent';
};

const spin = keyframes`from{transform:rotate(0deg)}to{transform:rotate(360deg)}`;
const fadeUp = keyframes`from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}`;

export const Wrap = styled.div`
  width: 100%; max-width: 1200px; margin: 0 auto; padding: ${theme.spacing.lg};
  @media (max-width: 430px) { padding: ${theme.spacing.md}; }
`;
export const SearchBar = styled.div`position: relative; margin-bottom: ${theme.spacing.lg};`;
export const SIcon = styled(Search)`
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  color: ${foodTheme.textSoft}; pointer-events: none;
`;
export const SInput = styled.input`
  width: 100%; height: 48px; padding: 0 ${theme.spacing.md} 0 44px;
  background: ${foodTheme.input}; border: 1px solid ${foodTheme.border};
  border-radius: 12px; color: ${foodTheme.text};
  font-family: 'Sora', sans-serif; font-size: ${theme.typography.scale.base}; outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  &::placeholder { color: ${foodTheme.textDisabled}; }
  &:focus { border-color: ${foodTheme.accentSecondary}; box-shadow: 0 0 0 3px ${foodTheme.focus}; }
`;
export const Filters = styled.div`
  display: flex; gap: ${theme.spacing.sm}; margin-bottom: ${theme.spacing.lg};
  overflow-x: auto; padding-bottom: 4px; -webkit-overflow-scrolling: touch;
  &::-webkit-scrollbar { height: 4px; }
  &::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent); border-radius: 2px; }
`;
export const Chip = styled.button<{ $on: boolean }>`
  min-height: 44px; padding: 0 ${theme.spacing.md}; border-radius: 22px;
  border: 1px solid ${({ $on }) => $on ? foodTheme.accentSecondary : foodTheme.border};
  background: ${({ $on }) => $on ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 25%, transparent)' : foodTheme.input};
  color: ${({ $on }) => $on ? foodTheme.text : foodTheme.textSoft};
  font: ${theme.typography.weight.medium} ${theme.typography.scale.sm} 'Sora', sans-serif;
  cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: background 0.2s, border-color 0.2s, color 0.2s;
  &:hover { border-color: ${foodTheme.accentSecondary}; }
`;
export const Grid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${theme.spacing.md};
  @media (max-width: 375px) { grid-template-columns: 1fr; }
`;
export const Card = styled.div<{ $healthRating?: HealthRating }>`
  background: ${foodTheme.panel}; backdrop-filter: blur(16px);
  border: 1px solid ${foodTheme.borderSoft}; border-radius: 16px;
  border-left: 3px solid ${({ $healthRating }) => healthBorderColor($healthRating)};
  box-shadow: ${foodTheme.shadow}; padding: ${theme.spacing.lg};
  animation: ${fadeUp} 0.3s ease-out both; transition: transform 0.2s, border-color 0.2s;
  will-change: transform;
  &:hover { transform: translateY(-2px); border-color: ${foodTheme.borderHover}; }
  @media (prefers-reduced-motion: reduce) { animation: none; transition: border-color 0.2s; &:hover { transform: none; } }
`;
export const Header = styled.div`
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: ${theme.spacing.sm}; margin-bottom: ${theme.spacing.md};
`;
export const Name = styled.h3`
  margin: 0; font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: ${theme.typography.scale.lg}; font-weight: ${theme.typography.weight.semibold};
  color: ${foodTheme.text}; line-height: 1.3;
`;
export const Meta = styled.span`
  font-size: ${theme.typography.scale.xs}; color: ${foodTheme.textSoft};
  font-family: 'Sora', sans-serif;
`;
export const SourceBadge = styled.span<{ $src: FoodSource }>`
  display: inline-flex; align-items: center; padding: 2px 8px;
  border-radius: 6px; font-size: 0.65rem; font-weight: ${theme.typography.weight.semibold};
  font-family: 'Fira Code', monospace; letter-spacing: 0.5px; flex-shrink: 0;
  background: ${({ $src }) => $src === 'USDA' ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent)' : 'color-mix(in srgb, var(--accent-gold, #C6A84B) 15%, transparent)'};
  color: ${({ $src }) => $src === 'USDA' ? foodTheme.accent : foodTheme.gold};
  border: 1px solid ${({ $src }) => $src === 'USDA' ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent)' : 'color-mix(in srgb, var(--accent-gold, #C6A84B) 30%, transparent)'};
`;
export const Kcal = styled.div`
  font-family: 'Fira Code', monospace; font-size: ${theme.typography.scale.xl};
  font-weight: ${theme.typography.weight.bold}; color: ${foodTheme.text};
  margin-bottom: ${theme.spacing.md};
  span { font-size: ${theme.typography.scale.sm}; color: ${foodTheme.textSoft}; }
`;
export const Macros = styled.div`display: flex; gap: ${theme.spacing.md}; margin-bottom: ${theme.spacing.md};`;
export const Macro = styled.div<{ $c: string }>`
  flex: 1; text-align: center; padding: ${theme.spacing.sm}; border-radius: 8px;
  background: ${foodTheme.panelDeep};
  .v { font: ${theme.typography.weight.semibold} ${theme.typography.scale.base} 'Fira Code', monospace; color: ${({ $c }) => $c}; }
  .l { font-size: ${theme.typography.scale.xs}; color: ${foodTheme.textSoft}; margin-top: 2px; }
`;
export const AddBtn = styled.button`
  width: 100%; min-height: 44px; display: flex; align-items: center; justify-content: center;
  gap: ${theme.spacing.sm}; background: linear-gradient(135deg, ${foodTheme.accentSecondary}, ${foodTheme.accent}); border: none; border-radius: 10px;
  color: ${foodTheme.inverse}; font: ${theme.typography.weight.semibold} ${theme.typography.scale.sm} 'Sora', sans-serif;
  cursor: pointer; transition: box-shadow 0.2s, transform 0.15s;
  &:hover:not(:disabled) { box-shadow: 0 0 16px ${foodTheme.glow}; transform: translateY(-1px); }
  &:active:not(:disabled) { transform: translateY(0); }
  &:disabled { opacity: 0.6; cursor: default; }
  @media (prefers-reduced-motion: reduce) { transition: box-shadow 0.2s; &:hover:not(:disabled) { transform: none; } }
`;
export const MealRow = styled.div`
  display: flex; align-items: center; gap: ${theme.spacing.sm}; margin-bottom: ${theme.spacing.md};
  label { color: ${foodTheme.textSoft}; font: ${theme.typography.weight.medium} ${theme.typography.scale.sm} 'Sora', sans-serif; }
`;
export const MealSelect = styled.select`
  min-height: 44px; padding: 0 ${theme.spacing.md}; border-radius: 10px;
  border: 1px solid ${foodTheme.border}; background: ${foodTheme.input}; color: ${foodTheme.text};
  font: ${theme.typography.weight.medium} ${theme.typography.scale.sm} 'Sora', sans-serif; cursor: pointer;
`;
export const Spin = styled(Loader2)`
  animation: ${spin} 0.8s linear infinite;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;
export const SafetyPill = styled.span<{ $color: string; $dim?: boolean }>`
  display: inline-flex; align-items: center;
  padding: 2px 6px; border-radius: 4px; margin-left: 4px;
  font-family: 'Sora', sans-serif; font-size: 10px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.05em;
  border: 1px solid ${({ $color }) => $color};
  color: ${({ $color }) => $color};
  background: ${({ $color, $dim }) => `color-mix(in srgb, ${$color} ${$dim ? '6%' : '10%'}, transparent)`};
`;
export const Empty = styled.div`
  text-align: center; padding: ${theme.spacing['2xl']} ${theme.spacing.lg};
  color: ${foodTheme.textSoft}; font-family: 'Sora', sans-serif;
`;
