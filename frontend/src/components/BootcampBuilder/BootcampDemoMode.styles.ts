import styled from 'styled-components';

export const DemoShell = styled.section`
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  border-radius: 8px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent), transparent 38%),
    var(--bg-elevated, #141419);
  margin-bottom: 14px;
  padding: 14px;

  @media (min-width: 2200px) {
    padding: 20px;
  }
`;

export const DemoHeader = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;

  @media (max-width: 720px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

export const DemoTitle = styled.h3`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 18px;
  font-weight: 800;

  @media (min-width: 2200px) {
    font-size: 24px;
  }
`;

export const DemoSubline = styled.span`
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 70%, transparent));
  font-family: 'Fira Code', monospace;
  font-size: 11px;

  @media (min-width: 2200px) {
    font-size: 13px;
  }
`;

export const StationDemoGrid = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }

  @media (min-width: 2200px) {
    grid-template-columns: repeat(auto-fit, minmax(430px, 1fr));
  }
`;

export const StationDemoCard = styled.article<{ $active?: boolean }>`
  min-width: 0;
  border: 1px solid ${({ $active }) => (
    $active
      ? 'var(--accent-primary, #60C0F0)'
      : 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent)'
  )};
  border-radius: 8px;
  background: ${({ $active }) => (
    $active
      ? 'linear-gradient(145deg, color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent), color-mix(in srgb, var(--bg-base, #0A0A0F) 78%, transparent))'
      : 'color-mix(in srgb, var(--bg-base, #0A0A0F) 70%, transparent)'
  )};
  overflow: hidden;
`;

export const StationDemoHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
`;

export const StationDemoName = styled.strong`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  line-height: 1.25;

  @media (min-width: 2200px) {
    font-size: 18px;
  }
`;

export const StationDemoCount = styled.span`
  flex-shrink: 0;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 11px;

  @media (min-width: 2200px) {
    font-size: 13px;
  }
`;

export const DemoExerciseList = styled.div`
  display: grid;
  gap: 8px;
  padding: 10px;
`;

export const DemoExerciseTile = styled.article`
  width: 100%;
  min-height: 44px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  border-radius: 7px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 86%, transparent);
  color: var(--text-primary, #E0ECF4);
  display: grid;
  gap: 8px;
  padding: 8px;
  text-align: left;

  &:focus-within {
    border-color: var(--accent-primary, #60C0F0);
  }
`;

export const DemoExerciseSelectButton = styled.button`
  width: 100%;
  min-height: 44px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  display: grid;
  gap: 8px;
  padding: 0;
  text-align: left;

  &:hover,
  &:focus-visible {
    outline: none;
  }

  &:focus-visible {
    border-radius: 6px;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent);
  }
`;

export const DemoMediaStage = styled.div`
  position: relative;
  aspect-ratio: 16 / 9;
  min-height: 118px;
  border-radius: 6px;
  overflow: hidden;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 7%, var(--bg-base, #0A0A0F));

  @media (max-width: 720px) {
    min-height: 164px;
  }

  @media (min-width: 2200px) {
    min-height: 210px;
  }
`;

export const DemoVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

export const DemoImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

export const DemoPlaceholder = styled.div`
  height: 100%;
  display: grid;
  place-items: center;
  padding: 14px;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 55%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  line-height: 1.35;
  text-align: center;
`;

export const DemoMediaPill = styled.span`
  position: absolute;
  left: 8px;
  bottom: 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 82%, transparent);
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
`;

export const DemoExerciseName = styled.span`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.25;

  @media (min-width: 2200px) {
    font-size: 18px;
  }
`;

export const DemoExerciseMeta = styled.span`
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 70%, transparent));
  font-family: 'Fira Code', monospace;
  font-size: 11px;

  @media (min-width: 2200px) {
    font-size: 13px;
  }
`;

export const DemoVideoLink = styled.a`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 7px;
  color: var(--accent-gold, #C6A84B);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;

  &:focus-visible {
    outline: 2px solid var(--accent-gold, #C6A84B);
    outline-offset: 2px;
  }
`;
