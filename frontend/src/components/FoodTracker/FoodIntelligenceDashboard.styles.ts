import styled, { keyframes } from 'styled-components';
import { AlertTriangle, Apple, Info, Loader2, Quote } from 'lucide-react';
import type { MacroTone, ResultVariant } from './FoodIntelligenceDashboard.logic';

export const intelligenceTheme = {
  accent: 'var(--accent-primary, #60C0F0)',
  accentSecondary: 'var(--accent-secondary, #8B5CF6)',
  dataAccent: 'var(--accent-data, #50A0F0)',
  gold: 'var(--accent-gold, #C6A84B)',
  success: 'var(--accent-success, #00E8B0)',
  danger: 'var(--accent-error, #C92A54)',
  text: 'var(--text-primary, #E0ECF4)',
  textSoft: 'var(--text-secondary, rgba(224, 236, 244, 0.7))',
  textMuted: 'var(--text-muted, rgba(224, 236, 244, 0.5))',
  inverse: 'var(--text-inverse, #0F172A)',
  panel: 'color-mix(in srgb, var(--bg-elevated, #141419) 72%, transparent)',
  input: 'color-mix(in srgb, var(--bg-elevated, #141419) 58%, transparent)',
  border: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent)',
  borderStrong: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent)',
  shadow: '0 8px 32px color-mix(in srgb, var(--bg-base, #0A0A0F) 70%, transparent)',
  focus: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent)',
} as const;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const toneColor = (tone: MacroTone): string => {
  if (tone === 'warning') return intelligenceTheme.gold;
  if (tone === 'secondary') return intelligenceTheme.accentSecondary;
  if (tone === 'text') return intelligenceTheme.text;
  if (tone === 'success') return intelligenceTheme.success;
  if (tone === 'danger') return intelligenceTheme.danger;
  return intelligenceTheme.accent;
};

const variantColor = (variant?: ResultVariant): string => {
  if (variant === 'alert') return intelligenceTheme.danger;
  if (variant === 'purple') return intelligenceTheme.accentSecondary;
  return intelligenceTheme.accent;
};

export const Dashboard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  animation: ${fadeIn} 0.4s ease-out;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

export const Header = styled.div`
  text-align: center;
  margin-bottom: 8px;
`;

export const Title = styled.h2`
  color: ${intelligenceTheme.text};
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px;
  background: linear-gradient(135deg, ${intelligenceTheme.accent}, ${intelligenceTheme.accentSecondary});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

export const Subtitle = styled.p`
  color: ${intelligenceTheme.textSoft};
  font-size: 14px;
  margin: 0;
`;

export const TabRow = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
  &::-webkit-scrollbar { height: 3px; }
  &::-webkit-scrollbar-thumb { background: ${intelligenceTheme.focus}; border-radius: 3px; }
`;

export const Tab = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  min-height: 44px;
  border: 1px solid ${({ $active }) => $active ? intelligenceTheme.borderStrong : intelligenceTheme.border};
  border-radius: 12px;
  background: ${({ $active }) => $active ? intelligenceTheme.focus : intelligenceTheme.input};
  color: ${({ $active }) => $active ? intelligenceTheme.accent : intelligenceTheme.textSoft};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
  flex-shrink: 0;
  &:hover { border-color: ${intelligenceTheme.borderStrong}; color: ${intelligenceTheme.text}; }
`;

export const GlassPanel = styled.div`
  background: ${intelligenceTheme.panel};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid ${intelligenceTheme.border};
  border-radius: 24px;
  box-shadow: ${intelligenceTheme.shadow};
  padding: 24px;
  animation: ${fadeIn} 0.3s ease-out;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

export const SearchBox = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  @media (max-width: 480px) { flex-direction: column; }
`;

export const SearchInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  min-height: 44px;
  background: ${intelligenceTheme.input};
  border: 1px solid ${intelligenceTheme.border};
  border-radius: 12px;
  color: ${intelligenceTheme.text};
  font-size: 15px;
  &::placeholder { color: ${intelligenceTheme.textMuted}; }
  &:focus {
    outline: none;
    border-color: ${intelligenceTheme.accent};
    box-shadow: 0 0 0 3px ${intelligenceTheme.focus};
  }
`;

export const SearchBtn = styled.button`
  padding: 12px 24px;
  min-height: 44px;
  background: linear-gradient(135deg, ${intelligenceTheme.accent}, ${intelligenceTheme.dataAccent});
  border: none;
  border-radius: 12px;
  color: ${intelligenceTheme.inverse};
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: box-shadow 0.2s, transform 0.2s;
  &:hover:not(:disabled) { box-shadow: 0 0 16px ${intelligenceTheme.focus}; transform: translateY(-1px); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
  @media (prefers-reduced-motion: reduce) { transition: box-shadow 0.2s; &:hover:not(:disabled) { transform: none; } }
`;

export const ResultGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;
  @media (min-width: 768px) { grid-template-columns: repeat(2, 1fr); }
  @media (min-width: 1280px) { grid-template-columns: repeat(3, 1fr); }
`;

export const ResultCard = styled.div<{ $variant?: ResultVariant }>`
  background: ${intelligenceTheme.input};
  border: 1px solid ${({ $variant }) => `color-mix(in srgb, ${variantColor($variant)} 25%, transparent)`};
  border-radius: 16px;
  padding: 16px;
  animation: ${fadeIn} 0.3s ease-out;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

export const CardTitle = styled.h4`
  color: ${intelligenceTheme.text};
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 8px;
`;

export const CardText = styled.p`
  color: ${intelligenceTheme.textSoft};
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
`;

export const MacroRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 12px;
`;

export const MacroPill = styled.span<{ $tone: MacroTone }>`
  padding: 4px 10px;
  border-radius: 8px;
  background: ${({ $tone }) => `color-mix(in srgb, ${toneColor($tone)} 15%, transparent)`};
  border: 1px solid ${({ $tone }) => `color-mix(in srgb, ${toneColor($tone)} 35%, transparent)`};
  color: ${({ $tone }) => toneColor($tone)};
  font-size: 12px;
  font-weight: 600;
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: ${intelligenceTheme.textMuted};
`;

export const Spinner = styled(Loader2)`
  animation: ${spin} 1s linear infinite;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

export const InlineAlertIcon = styled(AlertTriangle)`vertical-align: middle;`;
export const InlineInfoIcon = styled(Info)`vertical-align: middle; margin-right: 4px;`;
export const ServingText = styled(CardText)`margin-top: 8px;`;
export const EmptyAppleIcon = styled(Apple)`opacity: 0.3;`;
export const EmptyStatePrompt = styled.p`margin-top: 8px;`;
export const PanelHeadingRow = styled.div`display: flex; align-items: center; gap: 8px; margin-bottom: 16px;`;
export const PanelTitle = styled(CardTitle)`margin: 0; font-size: 18px;`;
export const PanelIntro = styled(CardText)`margin-bottom: 20px;`;
export const CardTopRow = styled.div`display: flex; justify-content: space-between; align-items: center;`;
export const TipText = styled(CardText)`margin-top: 8px;`;
export const RestaurantText = styled(CardText)`font-size: 12px; opacity: 0.75;`;
export const VerdictText = styled(CardText)`margin-top: 12px;`;
export const CenteredMotivation = styled.div`text-align: center; padding: 20px 0;`;
export const QuoteIcon = styled(Quote)`opacity: 0.4; margin-bottom: 16px;`;
export const QuoteText = styled(CardTitle)`font-size: 22px; line-height: 1.5; max-width: 600px; margin: 0 auto 12px;`;
export const QuoteAuthor = styled(CardText)`font-size: 15px; color: ${intelligenceTheme.accent};`;
export const InspiredButton = styled(SearchBtn)`
  margin: 24px auto 0;
  background: linear-gradient(135deg, ${intelligenceTheme.accentSecondary}, ${intelligenceTheme.accent});
`;
