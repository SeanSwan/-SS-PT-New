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

export const AudioPlaybackPanel = styled.div`
  margin-top: 10px;
  padding: 9px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--color-midnight-sapphire, #002060) 34%, transparent),
      color-mix(in srgb, var(--bg-base, #030712) 58%, transparent)
    ),
    color-mix(in srgb, var(--bg-surface, #1A1A24) 84%, transparent);
  min-width: 0;
`;

export const AudioPlaybackHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  line-height: 1.3;
  text-transform: uppercase;

  svg {
    flex: 0 0 auto;
  }
`;
