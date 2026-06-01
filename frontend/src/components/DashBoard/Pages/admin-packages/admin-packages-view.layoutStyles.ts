import styled from 'styled-components';

export const FlexRow = styled.div<{ $gap?: string; $align?: string; $justify?: string; $wrap?: boolean }>`
  display: flex;
  flex-direction: row;
  gap: ${p => p.$gap || '0.5rem'};
  align-items: ${p => p.$align || 'center'};
  justify-content: ${p => p.$justify || 'flex-start'};
  flex-wrap: ${p => p.$wrap ? 'wrap' : 'nowrap'};
`;

export const FlexCol = styled.div<{ $gap?: string }>`
  display: flex;
  flex-direction: column;
  gap: ${p => p.$gap || '0'};
`;

export const Heading5 = styled.span`
  font-weight: 300;
  font-size: 1.25rem;
  color: var(--text-primary, #E0ECF4);
`;

export const Heading6 = styled.span`
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--text-primary, #E0ECF4);
`;

export const BodyText = styled.span<{ $weight?: number; $color?: string; $size?: string; $block?: boolean; $top?: string; $bottom?: string }>`
  font-weight: ${p => p.$weight || 400};
  font-size: ${p => p.$size || '0.875rem'};
  color: ${p => p.$color || 'var(--text-primary, #E0ECF4)'};
  display: ${p => p.$block ? 'block' : 'inline'};
  margin-top: ${p => p.$top || 0};
  margin-bottom: ${p => p.$bottom || 0};
`;

export const CaptionText = styled.span<{ $color?: string; $block?: boolean; $maxWidth?: string; $truncate?: boolean; $top?: string }>`
  font-size: 0.75rem;
  color: ${p => p.$color || 'var(--text-secondary, rgba(224, 236, 244, 0.68))'};
  display: ${p => p.$block ? 'block' : 'inline'};
  max-width: ${p => p.$maxWidth || 'none'};
  margin-top: ${p => p.$top || 0};
  ${p => p.$truncate ? `
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  ` : ''}
`;

export const SubtitleText = styled.span`
  font-weight: 500;
  font-size: 1rem;
  color: var(--text-primary, #E0ECF4);
`;

export const SearchInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  min-width: 300px;

  @media (max-width: 600px) {
    min-width: 100%;
  }
`;

export const SearchIconSpan = styled.span`
  position: absolute;
  left: 0.75rem;
  display: flex;
  align-items: center;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
  pointer-events: none;
`;

export const SearchInput = styled.input`
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 76%, transparent);
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
  transition: all 0.3s ease;
  color: var(--text-primary, #E0ECF4);
  padding: 0.5rem 0.75rem 0.5rem 2.5rem;
  font-size: 0.95rem;
  outline: none;
  width: 100%;
  min-height: 44px;
  box-sizing: border-box;

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.55));
  }

  &:hover,
  &:focus {
    border-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 50%, transparent);
    box-shadow: 0 0 15px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent);
  }
`;

export const InfoPanel = styled.div<{ $borderColor?: string }>`
  padding: 1rem;
  margin-bottom: 1.25rem;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 46%, transparent);
  border: 1px solid ${p => p.$borderColor || 'color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent)'};
  border-radius: 8px;
`;

export const DialogHintText = styled.p`
  color: var(--text-secondary, rgba(224, 236, 244, 0.68));
  font-size: 0.9rem;
  margin: 0 0 1rem 0;
`;

export const OfferHeaderRow = styled(FlexRow)`
  margin-bottom: 0.5rem;
`;
