/**
 * CoachIntakeWorkspaceAudio.styles.ts
 * ===================================
 * Compact audio-puzzle status styles for the Swan Coach intake workspace.
 */
import styled from 'styled-components';

export const AudioPuzzleRow = styled.div`
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  min-height: 34px;
  padding: 7px 8px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 22%, transparent);
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 7%, transparent);
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 78%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  line-height: 1.25;

  svg {
    flex: 0 0 auto;
    color: var(--accent-secondary, #8B5CF6);
  }
`;

export const AudioPuzzleLabel = styled.strong`
  color: var(--text-primary, #E0ECF4);
  font-size: 11px;
`;
