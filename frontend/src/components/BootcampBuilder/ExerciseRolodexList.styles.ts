import styled from 'styled-components';

export const ExerciseGrid = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 4px 6px;
`;

export const ExerciseCard = styled.div<{ $selected: boolean }>`
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid ${({ $selected }) =>
    $selected ? 'var(--accent-primary, #60C0F0)' : 'var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent))'};
  background: ${({ $selected }) =>
    $selected ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)' : 'var(--bg-base, #0A0A0F)'};
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
  min-height: 100px;
  overflow: hidden;

  &:hover,
  &:focus-visible {
    border-color: var(--accent-primary, #60C0F0);
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, transparent);
    outline: none;
  }
`;

export const MediaPreview = styled.div`
  position: relative;
  min-height: 28px;
  max-height: 28px;
  margin-bottom: 5px;
  border-radius: 5px;
  overflow: hidden;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
`;

export const MediaImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

export const MediaPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 7px;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 48%, transparent));
  font-family: 'Fira Code', monospace;
  font-size: 8px;
  text-transform: uppercase;
`;

export const MediaVideoBadge = styled.span`
  position: absolute;
  right: 4px;
  bottom: 4px;
  padding: 1px 5px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 82%, transparent);
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 8px;
  font-weight: 700;
`;

export const CardTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 4px;
  min-width: 0;
`;

export const ExName = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--text-primary, #E0ECF4);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

export const AddBtn = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 6px;
  border: 1px solid var(--accent-secondary, #8B5CF6);
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent);
  color: var(--accent-secondary, #8B5CF6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover,
  &:focus-visible {
    background: var(--accent-secondary, #8B5CF6);
    color: var(--text-primary, #E0ECF4);
    outline: none;
  }
`;

export const CardMeta = styled.div`
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
  margin-top: 3px;
  max-height: 26px;
  overflow: hidden;
`;

export const MetaTag = styled.span<{ $impact?: string }>`
  padding: 1px 4px;
  border-radius: 3px;
  font-family: 'Fira Code', monospace;
  font-size: 8px;
  font-weight: 600;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: ${({ $impact }) => {
    if ($impact === 'High Impact') return 'color-mix(in srgb, var(--danger, #C92A54) 12%, transparent)';
    if ($impact === 'Low Impact') return 'color-mix(in srgb, var(--success, #10B981) 12%, transparent)';
    if ($impact === 'Medium Impact') return 'color-mix(in srgb, var(--warning, #C6A84B) 12%, transparent)';
    return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)';
  }};
  color: ${({ $impact }) => {
    if ($impact === 'High Impact') return 'var(--danger, #C92A54)';
    if ($impact === 'Low Impact') return 'var(--success, #10B981)';
    if ($impact === 'Medium Impact') return 'var(--warning, #C6A84B)';
    return 'var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 48%, transparent))';
  }};
`;

export const EmptyMsg = styled.div`
  padding: 32px 16px;
  text-align: center;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 35%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  grid-column: 1 / -1;
`;

export const SkeletonBlock = styled.div`
  height: 52px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, transparent);
`;

export const VirtualRow = styled.div`
  display: flex;
  gap: 6px;
  padding: 3px 0;
`;
