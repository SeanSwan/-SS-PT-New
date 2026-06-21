import styled, { css, keyframes } from 'styled-components';

const accentAlpha = (percent: number) =>
  `color-mix(in srgb, var(--accent-primary, #60C0F0) ${percent}%, transparent)`;

const selectedGlow = keyframes`
  0%, 100% { box-shadow: 0 0 12px var(--class-color); }
  50% { box-shadow: 0 0 24px var(--class-color); }
`;

interface ClassColorProps {
  $color: string;
}

export const Container = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, ${accentAlpha(12)});
  border-radius: 16px;
  padding: 20px 24px;
`;

export const Header = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
`;

export const SectionTitle = styled.h3`
  align-items: center;
  color: var(--text-secondary, #94a3b8);
  display: flex;
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  gap: 8px;
  letter-spacing: 1.5px;
  margin: 0;
  text-transform: uppercase;

  svg { color: var(--accent-secondary, #8B5CF6); }
`;

export const CurrentBadge = styled.span<ClassColorProps>`
  background: color-mix(in srgb, ${({ $color }) => $color} 12%, transparent);
  border: 1px solid color-mix(in srgb, ${({ $color }) => $color} 25%, transparent);
  border-radius: 999px;
  color: ${({ $color }) => $color};
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
`;

export const ClassGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
`;

export const ClassCard = styled.button<ClassColorProps & { $active: boolean; $selected: boolean }>`
  --class-color: ${({ $color }) => `color-mix(in srgb, ${$color} 30%, transparent)`};
  align-items: center;
  background: ${({ $selected, $color }) => ($selected
    ? `color-mix(in srgb, ${$color} 15%, var(--bg-base, #0A0A0F))`
    : 'var(--bg-base, #0A0A0F)')};
  border: 1.5px solid ${({ $selected, $active, $color }) => (
    $active ? $color : $selected ? `color-mix(in srgb, ${$color} 50%, transparent)` : 'transparent'
  )};
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  max-width: 72px;
  min-height: 44px;
  min-width: 56px;
  padding: 10px 4px;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s ease;

  ${({ $active }) => $active && css`animation: ${selectedGlow} 2s ease-in-out infinite;`}

  &:hover {
    background: color-mix(in srgb, ${({ $color }) => $color} 10%, var(--bg-base, #0A0A0F));
    transform: translateY(-2px);
  }

  &:active { transform: scale(0.96); }

  .class-name {
    color: ${({ $selected, $color }) => ($selected ? $color : 'var(--text-muted, #64748b)')};
    font-family: 'Sora', sans-serif;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
  }
`;

export const ClassIcon = styled.span<ClassColorProps>`
  color: ${({ $color }) => $color};
  display: inline-flex;
`;

export const DescriptionCard = styled.div<ClassColorProps>`
  background: var(--bg-base, #0A0A0F);
  border: 1px solid color-mix(in srgb, ${({ $color }) => $color} 20%, transparent);
  border-radius: 12px;
  padding: 16px;
`;

export const ClassName = styled.h4<ClassColorProps>`
  color: ${({ $color }) => $color};
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 4px;
`;

export const ClassSubtitle = styled.p`
  color: var(--text-muted, #64748b);
  font-family: 'Cormorant Garamond', serif;
  font-size: 14px;
  font-style: italic;
  margin: 0 0 12px;
`;

export const ClassDesc = styled.p`
  color: var(--text-secondary, #94a3b8);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  line-height: 1.6;
  margin: 0 0 12px;
`;

export const BonusTag = styled.div<ClassColorProps>`
  align-items: center;
  background: color-mix(in srgb, ${({ $color }) => $color} 10%, transparent);
  border-radius: 8px;
  color: ${({ $color }) => $color};
  display: inline-flex;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  font-weight: 500;
  gap: 6px;
  margin-bottom: 8px;
  padding: 6px 12px;
`;

export const FocusText = styled.p`
  color: var(--text-muted, #64748b);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  margin: 0;
`;

export const SelectBtn = styled.button<ClassColorProps>`
  background: ${({ $color }) => $color};
  border: none;
  border-radius: 10px;
  color: var(--obsidian-black, #0A0A0F);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  margin-top: 16px;
  min-height: 48px;
  padding: 12px;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
  width: 100%;

  &:hover {
    box-shadow: 0 4px 16px color-mix(in srgb, ${({ $color }) => $color} 40%, transparent);
    transform: translateY(-1px);
  }

  &:active { transform: scale(0.98); }
  &:disabled { box-shadow: none; cursor: default; opacity: 0.5; transform: none; }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
