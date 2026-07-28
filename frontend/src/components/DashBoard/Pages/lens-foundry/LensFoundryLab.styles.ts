import styled from 'styled-components';
type Tone = 'pass' | 'watch' | 'queued';
const toneColor = (tone: Tone) => {
  if (tone === 'pass') return 'var(--accent-primary, #60C0F0)';
  if (tone === 'watch') return 'var(--accent-secondary, #8B5CF6)';
  return 'var(--accent-tertiary, #C6A84B)';
};
export const PageShell = styled.div`
  min-height: 100dvh;
  padding: 24px;
  color: var(--text-primary, #E0ECF4);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--bg-primary, #002060) 35%, transparent), color-mix(in srgb, var(--bg-base, #0A0A0F) 92%, transparent)),
    var(--bg-base, #0A0A0F);
  font-family: 'Plus Jakarta Sans', 'Sora', system-ui, sans-serif;
  @media (max-width: 768px) {
    padding: 12px;
  }
`;
export const HeroBand = styled.header`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 20px;
  align-items: end;
  padding: 24px 0 18px;
  border-bottom: 1px solid var(--border-soft, color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent));
  @media (max-width: 860px) {
    grid-template-columns: 1fr;
    align-items: start;
  }
`;
export const Eyebrow = styled.p`
  margin: 0 0 8px;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
`;
export const Title = styled.h1`
  margin: 0;
  max-width: 820px;
  color: var(--text-primary, #E0ECF4);
  font-size: 32px;
  line-height: 1.08;
  font-weight: 800;
  @media (max-width: 768px) {
    font-size: 26px;
  }
`;
export const Subtitle = styled.p`
  max-width: 760px;
  margin: 12px 0 0;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 82%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  line-height: 1.65;
`;
export const HeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  @media (max-width: 860px) {
    justify-content: flex-start;
  }
`;
export const ActionLink = styled.a<{ $disabled?: boolean }>`
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid ${({ $disabled }) => $disabled
    ? 'var(--border-soft, color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent))'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 42%, transparent)'};
  border-radius: 8px;
  color: ${({ $disabled }) => $disabled
    ? 'var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 52%, transparent))'
    : 'var(--text-primary, #E0ECF4)'};
  background: ${({ $disabled }) => $disabled
    ? 'color-mix(in srgb, var(--bg-surface, #141419) 68%, transparent)'
    : 'linear-gradient(135deg, var(--bg-primary, #002060), color-mix(in srgb, var(--accent-muted, #4070C0) 22%, transparent))'};
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  pointer-events: ${({ $disabled }) => ($disabled ? 'none' : 'auto')};
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
  &:hover {
    transform: ${({ $disabled }) => ($disabled ? 'none' : 'translateY(-1px)')};
    box-shadow: ${({ $disabled }) => $disabled ? 'none' : '0 0 20px color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)'};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;
export const StatusPill = styled.span`
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  border: 1px solid color-mix(in srgb, var(--accent-tertiary, #C6A84B) 38%, transparent);
  border-radius: 8px;
  color: var(--accent-tertiary, #C6A84B);
  background: color-mix(in srgb, var(--accent-tertiary, #C6A84B) 10%, transparent);
  font-family: 'Fira Code', monospace;
  font-size: 12px;
`;
export const TabBar = styled.div`
  display: flex;
  gap: 8px;
  margin: 22px 0;
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;
export const TabButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  padding: 8px 14px;
  border: 1px solid ${({ $active }) => $active
    ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 55%, transparent)'
    : 'var(--border-soft, color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent))'};
  border-radius: 8px;
  color: ${({ $active }) => $active ? 'var(--text-primary, #E0ECF4)' : 'var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 78%, transparent))'};
  background: ${({ $active }) => $active
    ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, color-mix(in srgb, var(--bg-surface, #141419) 88%, transparent))'
    : 'color-mix(in srgb, var(--bg-surface, #141419) 58%, transparent)'};
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
`;
export const Section = styled.section`
  display: grid;
  gap: 18px;
`;
export const SectionHeading = styled.div`
  display: grid;
  gap: 6px;
`;
export const SectionTitle = styled.h2`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: 22px;
  line-height: 1.18;
`;
export const SectionSummary = styled.p`
  max-width: 780px;
  margin: 0;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 78%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  line-height: 1.6;
`;
export const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  @media (max-width: 1180px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;
export const MetricTile = styled.article<{ $tone: Tone }>`
  min-height: 148px;
  padding: 16px;
  border: 1px solid color-mix(in srgb, ${({ $tone }) => toneColor($tone)} 34%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-surface, #141419) 78%, transparent);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 6%, transparent);
`;
export const MetricLabel = styled.h3`
  margin: 0 0 10px;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 78%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
`;
export const MetricValue = styled.p<{ $tone: Tone }>`
  margin: 0 0 8px;
  color: ${({ $tone }) => toneColor($tone)};
  font-family: 'Fira Code', monospace;
  font-size: 24px;
  font-weight: 800;
`;
export const MetricDetail = styled.p`
  margin: 0;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 78%, transparent));
  font-size: 13px;
  line-height: 1.55;
`;
export const WorkGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;
export const WorkTile = styled.article`
  min-height: 156px;
  padding: 16px;
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent));
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-primary, #002060) 24%, transparent);
`;
export const WorkEyebrow = styled.span`
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
`;
export const WorkTitle = styled.h3`
  margin: 8px 0;
  color: var(--text-primary, #E0ECF4);
  font-size: 17px;
`;
export const WorkDetail = styled.p`
  margin: 0;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 78%, transparent));
  font-size: 13px;
  line-height: 1.55;
`;
export const FlowList = styled.ol`
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
`;
export const FlowItem = styled.li`
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr) minmax(160px, 220px);
  gap: 14px;
  align-items: center;
  padding: 14px;
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent));
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-surface, #141419) 72%, transparent);
  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;
export const StepBadge = styled.span`
  display: inline-flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--accent-primary, #60C0F0);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  font-family: 'Fira Code', monospace;
  font-weight: 800;
`;
export const GatePill = styled.span`
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 38%, transparent);
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 700;
`;
