/** VideoOptimizerPanel.styles.ts — Crystalline Swan styled-components (tokens+fallbacks rule 6, 44px rule 2, dark-first, reduced-motion safe). */
import styled from 'styled-components';

export const Wrap = styled.div`
  display: grid;
  gap: 14px;
  padding: 20px 24px 32px;
  max-width: 720px;
`;

export const Intro = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const IntroIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 16%, transparent);
  color: var(--accent-secondary, #8B5CF6);
`;

export const Title = styled.h2`
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
`;

export const Sub = styled.p`
  margin: 2px 0 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.82rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
`;

export const SafeNote = styled.p`
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.74rem;
  color: var(--accent-primary, #60C0F0);
`;

export const Dropzone = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 88px;
  padding: 18px;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 55%, transparent);
  border: 1.5px dashed ${({ $active }) => ($active
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 55%, transparent)'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent)')};
  transition: border-color 0.2s ease, background 0.2s ease;

  &:hover { border-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 55%, transparent); }
  &:focus-within { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

/** Visually hidden but still in the tab order (file input must stay keyboard-focusable). */
export const HiddenInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
`;

export const DropHint = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
`;

export const FileName = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.82rem;
  color: var(--text-primary, #E0ECF4);
  word-break: break-all;
`;

export const Muted = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
  font-size: 0.92em;
`;

export const WarnLine = styled.p`
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.76rem;
  color: var(--color-gilded-fern, #C6A84B);
`;

export const PresetGroup = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
  gap: 10px;
`;

export const PresetButton = styled.button<{ $active: boolean }>`
  all: unset;
  box-sizing: border-box;
  display: grid;
  gap: 4px;
  min-height: 44px;
  padding: 12px 14px;
  border-radius: 10px;
  cursor: pointer;
  background: ${({ $active }) => ($active
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent)'
    : 'color-mix(in srgb, var(--bg-elevated, #141419) 70%, transparent)')};
  border: 1px solid ${({ $active }) => ($active
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 55%, transparent)'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent)')};
  transition: border-color 0.15s ease, background 0.15s ease;

  &[aria-disabled='true'], &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:hover:not(:disabled) { border-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 50%, transparent); }
  &:focus-visible { outline: 2px solid var(--color-wing-purple, #8B5CF6); outline-offset: 2px; }
`;

export const PresetLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

export const Rec = styled.span`
  font-weight: 600;
  font-size: 0.74rem;
  color: var(--accent-primary, #60C0F0);
`;

export const PresetBlurb = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
`;

export const Estimate = styled.p`
  margin: 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.8));

  strong { color: var(--text-primary, #E0ECF4); font-family: 'Fira Code', monospace; }
`;

export const PrimaryButton = styled.button`
  min-height: 48px;
  padding: 0 22px;
  border: 1px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  color: #06121f;
  background: linear-gradient(135deg, var(--chart-primary, #50A0F0), var(--accent-primary, #60C0F0));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent);
  transition: filter 0.15s ease, box-shadow 0.15s ease;

  &:hover:not(:disabled) {
    filter: brightness(1.08);
    box-shadow: 0 0 18px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent);
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:focus-visible { outline: 2px solid var(--color-wing-purple, #8B5CF6); outline-offset: 2px; }
`;

export const ProgressTrack = styled.div`
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
`;

export const ProgressFill = styled.div`
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--chart-primary, #50A0F0), var(--accent-secondary, #8B5CF6));
  transition: width 0.2s ease;

  @media (prefers-reduced-motion: reduce) { transition: none; }
`;

export const ErrorLine = styled.p`
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  color: var(--danger-text, #f87171);
`;

export const Result = styled.div`
  display: grid;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-elevated, #141419) 75%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
`;

export const ResultSummary = styled.p`
  margin: 0;
  font-family: 'Fira Code', monospace;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
`;

export const Preview = styled.video`
  width: 100%;
  max-height: 320px;
  border-radius: 10px;
  background: #000;
`;

export const ResultActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

export const DownloadLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 10px;
  text-decoration: none;
  font-family: 'Sora', sans-serif;
  font-size: 0.84rem;
  font-weight: 700;
  color: #06121f;
  background: linear-gradient(135deg, var(--chart-primary, #50A0F0), var(--accent-primary, #60C0F0));

  &:hover { filter: brightness(1.08); }
  &:focus-visible { outline: 2px solid var(--color-wing-purple, #8B5CF6); outline-offset: 2px; }
`;

export const GhostButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 10px;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);

  &:hover { border-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 55%, transparent); }
  &:focus-visible { outline: 2px solid var(--color-wing-purple, #8B5CF6); outline-offset: 2px; }
`;

export const Notice = styled.p`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 14px 16px;
  border-radius: 10px;
  font-family: 'Sora', sans-serif;
  font-size: 0.84rem;
  color: var(--color-gilded-fern, #C6A84B);
  background: color-mix(in srgb, var(--color-gilded-fern, #C6A84B) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-gilded-fern, #C6A84B) 28%, transparent);
`;
