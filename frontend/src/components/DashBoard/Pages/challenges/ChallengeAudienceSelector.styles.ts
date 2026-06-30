/**
 * Audience selector styles for the challenge command workspace.
 */

import styled from 'styled-components';

export const AudienceShell = styled.section`
  display: grid;
  gap: 16px;
`;

export const AudienceHeader = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: start;
  padding: 18px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  background: linear-gradient(135deg, color-mix(in srgb, var(--surface-primary, #002060) 64%, var(--bg-surface, #141419) 36%), color-mix(in srgb, var(--bg-surface, #141419) 92%, transparent));
  @media (max-width: 760px) { grid-template-columns: 1fr; }
`;

export const HeaderText = styled.div`
  display: grid;
  gap: 6px;
`;

export const Kicker = styled.span`
  color: var(--accent-gold, #C6A84B);
  font-size: 0.76rem;
  font-weight: 900;
  text-transform: uppercase;
`;

export const Title = styled.h2`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: clamp(1.25rem, 2vw, 1.65rem);
  line-height: 1.2;
`;

export const Copy = styled.p`
  margin: 0;
  color: var(--text-secondary, #B8C7D9);
  line-height: 1.55;
`;

export const StatusPill = styled.span`
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 34%, transparent);
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 12%, transparent);
  font-size: 0.8rem;
  font-weight: 900;
`;

export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr));
  gap: 10px;
`;

export const SummaryTile = styled.div`
  min-height: 88px;
  display: grid;
  gap: 4px;
  align-content: center;
  padding: 14px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 22%, transparent);
  background: color-mix(in srgb, var(--bg-surface, #141419) 84%, var(--surface-primary, #002060) 16%);
  span { color: var(--text-muted, #9FB2C8); font-size: 0.72rem; font-weight: 900; text-transform: uppercase; }
  strong { color: var(--text-primary, #E0ECF4); font-size: 1.1rem; line-height: 1.1; }
`;

export const ControlRow = styled.div`
  display: grid;
  grid-template-columns: minmax(220px, 0.85fr) minmax(220px, 1fr);
  gap: 10px;
  align-items: center;
  @media (max-width: 760px) { grid-template-columns: 1fr; }
`;

export const CampaignSelect = styled.select`
  min-height: 44px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
  background: color-mix(in srgb, var(--bg-surface, #141419) 88%, transparent);
  color: var(--text-primary, #E0ECF4);
  font: inherit;
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const SearchInput = styled.input`
  min-height: 44px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
  background: color-mix(in srgb, var(--bg-surface, #141419) 88%, transparent);
  color: var(--text-primary, #E0ECF4);
  font: inherit;
  &::placeholder { color: var(--text-muted, #9FB2C8); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  @media (max-width: 760px) { justify-content: stretch; > button { flex: 1 1 150px; } }
`;

export const ScopeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr));
  gap: 10px;
`;

export const ScopeButton = styled.button<{ $active: boolean }>`
  min-height: 64px;
  display: grid;
  gap: 3px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)'};
  background: ${({ $active }) => $active ? 'color-mix(in srgb, var(--surface-secondary, #003080) 70%, var(--accent-secondary, #8B5CF6) 30%)' : 'color-mix(in srgb, var(--bg-surface, #141419) 88%, transparent)'};
  color: var(--text-primary, #E0ECF4);
  text-align: left;
  cursor: pointer;
  strong { font-size: 0.94rem; }
  span { color: var(--text-secondary, #B8C7D9); font-size: 0.78rem; line-height: 1.35; }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const ClientGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: 10px;
`;

export const ClientOption = styled.label`
  min-height: 96px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  padding: 14px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  background: color-mix(in srgb, var(--bg-surface, #141419) 86%, var(--surface-primary, #002060) 14%);
  cursor: pointer;
  &:focus-within { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const Checkbox = styled.input`
  width: 24px;
  height: 24px;
  accent-color: var(--accent-primary, #60C0F0);
`;

export const ClientText = styled.span`
  display: grid;
  gap: 4px;
  min-width: 0;
`;

export const ClientName = styled.strong`
  color: var(--text-primary, #E0ECF4);
  font-size: 0.96rem;
  line-height: 1.25;
`;

export const ClientMeta = styled.span`
  color: var(--text-muted, #9FB2C8);
  font-size: 0.78rem;
  line-height: 1.35;
`;

export const EmptyPanel = styled.div`
  min-height: 180px;
  display: grid;
  place-items: center;
  padding: 22px;
  border-radius: 8px;
  border: 1px dashed color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  color: var(--text-secondary, #B8C7D9);
  text-align: center;
  background: color-mix(in srgb, var(--bg-surface, #141419) 82%, transparent);
`;
