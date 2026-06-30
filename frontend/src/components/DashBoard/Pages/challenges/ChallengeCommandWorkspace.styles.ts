/**
 * Challenge command workspace styles.
 * Dark-first, token-backed layout for the Admin/Trainer challenge workspace.
 */

import styled from 'styled-components';

export const PageShell = styled.main`
  min-height: 100dvh;
  padding: clamp(16px, 2vw, 28px);
  color: var(--text-primary, #E0ECF4);
  background: linear-gradient(145deg, color-mix(in srgb, var(--bg-base, #0A0A0F) 92%, var(--accent-primary, #60C0F0) 8%), var(--bg-base, #0A0A0F));
  font-family: 'Plus Jakarta Sans', 'Sora', system-ui, sans-serif;
  @media (max-width: 430px) { padding: 12px; }
`;

export const HeroBand = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 20px;
  align-items: end;
  padding: clamp(20px, 3vw, 34px);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  border-radius: 8px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--surface-primary, #002060) 84%, transparent), color-mix(in srgb, var(--bg-surface, #141419) 92%, transparent));
  box-shadow: 0 22px 70px color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  @media (max-width: 760px) { grid-template-columns: 1fr; align-items: start; }
  @media (max-width: 430px) { padding: 18px; }
`;

export const HeroContent = styled.div`
  display: grid;
  gap: 10px;
  max-width: 780px;
`;

export const HeroKicker = styled.span`
  width: fit-content;
  padding: 6px 10px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 40%, transparent);
  border-radius: 999px;
  color: var(--accent-gold, #C6A84B);
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
`;

export const HeroTitle = styled.h1`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: clamp(1.9rem, 4vw, 3.4rem);
  line-height: 1.02;
  font-weight: 900;
`;

export const HeroCopy = styled.p`
  margin: 0;
  color: var(--text-secondary, #B8C7D9);
  font-size: clamp(0.98rem, 1.4vw, 1.08rem);
  line-height: 1.65;
`;

export const HeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
  @media (max-width: 760px) { justify-content: flex-start; }
`;

export const IconButton = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent);
  background: color-mix(in srgb, var(--surface-secondary, #003080) 64%, var(--bg-base, #0A0A0F) 36%);
  color: var(--text-primary, #E0ECF4);
  font-weight: 800;
  cursor: pointer;
  transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
  &:hover:not(:disabled), &:focus-visible { transform: translateY(-1px); border-color: var(--accent-primary, #60C0F0); outline: 2px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 60%, transparent); outline-offset: 2px; }
  &[aria-pressed='true'] { border-color: var(--accent-gold, #C6A84B); background: color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, var(--surface-secondary, #003080) 76%); }
  &:disabled { cursor: wait; opacity: 0.7; }
  @media (prefers-reduced-motion: reduce) { transition: none; }
  @media (max-width: 430px) { width: 100%; }
`;

export const StatsGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
  gap: 12px;
  margin: 18px 0;
`;

export const StatTile = styled.div`
  min-height: 88px;
  display: grid;
  gap: 6px;
  align-content: center;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 22%, transparent);
  background: color-mix(in srgb, var(--bg-surface, #141419) 84%, var(--surface-primary, #002060) 16%);
  span { color: var(--text-muted, #9FB2C8); font-size: 0.76rem; font-weight: 800; text-transform: uppercase; }
  strong { color: var(--text-primary, #E0ECF4); font-size: 1.45rem; line-height: 1; }
`;

export const TabBar = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 8px 0 14px;
  scrollbar-width: thin;
  @media (max-width: 430px) { flex-direction: column; }
`;

export const TabButton = styled.button<{ $active: boolean }>`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)'};
  background: ${({ $active }) => $active ? 'color-mix(in srgb, var(--surface-secondary, #003080) 72%, var(--accent-secondary, #8B5CF6) 28%)' : 'color-mix(in srgb, var(--bg-surface, #141419) 88%, transparent)'};
  color: var(--text-primary, #E0ECF4);
  font-weight: 800;
  white-space: nowrap;
  cursor: pointer;
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { transition: none; }
  @media (max-width: 430px) { width: 100%; }
`;

export const ContentPanel = styled.section`
  padding: clamp(16px, 2vw, 24px) 0 8px;
`;

export const TemplateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  gap: 14px;
`;

export const TemplateCardShell = styled.article`
  min-height: 320px;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 14px;
  padding: 18px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
  background: linear-gradient(160deg, color-mix(in srgb, var(--surface-primary, #002060) 72%, var(--bg-surface, #141419) 28%), color-mix(in srgb, var(--bg-surface, #141419) 92%, transparent));
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 12%, transparent);
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`;

export const TemplateIcon = styled.div`
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 8px;
  color: var(--accent-primary, #60C0F0);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
`;

export const CardTitleGroup = styled.div`
  display: grid;
  gap: 4px;
`;

export const CardTitle = styled.h2`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: 1.08rem;
  line-height: 1.25;
`;

export const CardMeta = styled.span`
  color: var(--accent-gold, #C6A84B);
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
`;

export const CardDescription = styled.p`
  margin: 0 0 12px;
  color: var(--text-secondary, #B8C7D9);
  font-size: 0.92rem;
  line-height: 1.55;
`;

export const CardRuleNote = styled.p`
  margin: 0 0 12px;
  padding: 9px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 34%, transparent);
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 10%, var(--bg-surface, #141419) 90%);
  font-size: 0.82rem;
  font-weight: 800;
  line-height: 1.4;
`;
export const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const Badge = styled.span`
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  padding: 4px 9px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent);
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--surface-secondary, #003080) 42%, transparent);
  font-size: 0.76rem;
  font-weight: 800;
`;

export const MetricRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
`;

export const MetricPill = styled.span`
  display: inline-grid;
  gap: 2px;
  min-width: 88px;
  small { color: var(--text-muted, #9FB2C8); font-size: 0.72rem; font-weight: 800; text-transform: uppercase; }
  strong { color: var(--text-primary, #E0ECF4); font-size: 0.92rem; }
`;

export const StatusPanel = styled.div`
  min-height: 260px;
  display: grid;
  place-items: center;
  padding: 28px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  background: color-mix(in srgb, var(--bg-surface, #141419) 86%, var(--surface-primary, #002060) 14%);
  text-align: center;
`;

export const StatusStack = styled.div`
  display: grid;
  gap: 12px;
  max-width: 660px;
`;

export const StatusTitle = styled.h2`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: 1.25rem;
`;

export const StatusCopy = styled.p`
  margin: 0;
  color: var(--text-secondary, #B8C7D9);
  line-height: 1.6;
`;

export const PolicyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: 12px;
`;

export const PolicyTile = styled.div`
  min-height: 108px;
  display: grid;
  gap: 8px;
  align-content: center;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 24%, transparent);
  background: color-mix(in srgb, var(--bg-surface, #141419) 84%, var(--accent-gold, #C6A84B) 8%);
  span { color: var(--text-muted, #9FB2C8); font-size: 0.74rem; font-weight: 900; text-transform: uppercase; }
  strong { color: var(--text-primary, #E0ECF4); font-size: 1rem; line-height: 1.35; }
`;

export { ChallengeList, ChallengeInlineAlert, ChallengeInlineNotice, ChallengeItem, ChallengeItemHeader, ChallengeTitleGroup, ChallengeStatusBadge, ChallengeFactGrid, ChallengeFact } from './ChallengeList.styles';
