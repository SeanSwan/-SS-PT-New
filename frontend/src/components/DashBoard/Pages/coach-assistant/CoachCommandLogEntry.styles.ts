import styled, { css } from 'styled-components';

import type { LogActor } from './CoachCommandLogEntry.types';

const actorStyles = {
  operator: css`
    align-self: flex-end;
    max-width: 88%;
    background: color-mix(in srgb, var(--coach-purple, #8b5cf6) 17%, transparent);
    border-color: color-mix(in srgb, var(--coach-purple, #8b5cf6) 34%, transparent);
  `,
  coach: css`
    align-self: flex-start;
    max-width: 92%;
    background: color-mix(in srgb, var(--coach-cyan, #60c0f0) 11%, transparent);
  `,
  system: css`
    align-self: center;
    max-width: 96%;
    background: color-mix(in srgb, var(--coach-surface-strong, #102044) 72%, transparent);
  `,
};

export const LogEntry = styled.article<{ $actor: LogActor }>`
  ${({ $actor }) => actorStyles[$actor]}
  border: 1px solid var(--coach-line, color-mix(in srgb, var(--coach-cyan, #60c0f0) 18%, transparent));
  border-radius: 16px;
  box-shadow: 0 16px 42px var(--coach-shadow-soft, color-mix(in srgb, var(--coach-deep, #030712) 58%, transparent));
  display: grid;
  gap: 10px;
  padding: clamp(12px, 1.6vw, 16px);
`;

export const LogMeta = styled.div`
  color: var(--coach-muted, #91a3bd);
  display: flex;
  flex-wrap: wrap;
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  gap: 8px;
  justify-content: space-between;
  text-transform: uppercase;
`;

export const LogBody = styled.div`
  color: var(--coach-text-soft, #dbeafe);
  display: grid;
  gap: 12px;
  font-size: clamp(0.98rem, 0.92rem + 0.2vw, 1.1rem);
  line-height: 1.58;
  overflow-wrap: anywhere;
  p { margin: 0; }
  strong { color: var(--coach-text, #e0ecf4); font-weight: 820; }
`;

export const StyleSwitch = styled.div`
  background: color-mix(in srgb, var(--coach-bg, #030712) 56%, transparent);
  border: 1px solid var(--coach-line, color-mix(in srgb, var(--coach-cyan, #60c0f0) 18%, transparent));
  border-radius: 14px;
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-self: start;
  max-width: 100%;
  padding: 5px;
  button {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 10px;
    color: var(--coach-muted, #91a3bd);
    font-size: 13px;
    font-weight: 780;
    flex: 1 1 120px;
    min-height: 44px;
    padding: 0 14px;
  }
  button[aria-pressed='true'] {
    background: color-mix(in srgb, var(--coach-cyan, #60c0f0) 16%, transparent);
    border-color: color-mix(in srgb, var(--coach-cyan, #60c0f0) 34%, transparent);
    color: var(--coach-text, #e0ecf4);
  }
`;

export const BulletList = styled.ul`
  display: grid;
  gap: 8px;
  list-style: none;
  margin: 0;
  padding: 0;
  li {
    background: color-mix(in srgb, var(--coach-text, #e0ecf4) 5%, transparent);
    border: 1px solid var(--coach-line, color-mix(in srgb, var(--coach-cyan, #60c0f0) 18%, transparent));
    border-radius: 12px;
    display: grid;
    gap: 4px;
    padding: 10px 12px;
  }
  .exercise-name {
    color: var(--coach-text, #e0ecf4);
    font-weight: 820;
  }
  .exercise-detail {
    color: var(--coach-text-soft, #dbeafe);
    line-height: 1.45;
  }
`;

export const WorkoutSectionList = styled.div`
  display: grid;
  gap: 10px;
  min-width: 0;
  section {
    background: color-mix(in srgb, var(--coach-soft, #102040) 58%, transparent);
    border: 1px solid var(--coach-line, color-mix(in srgb, var(--coach-cyan, #60c0f0) 18%, transparent));
    border-radius: 14px;
    display: grid;
    gap: 8px;
    padding: 10px;
  }
  h3 {
    color: var(--coach-text, #e0ecf4);
    font-family: 'Fira Code', monospace;
    font-size: 12px;
    letter-spacing: 0;
    margin: 0;
    text-transform: uppercase;
  }
`;

export const StepList = styled.ol`
  display: grid;
  gap: 10px;
  list-style: none;
  margin: 0;
  padding: 0;
  li {
    align-items: start;
    background: color-mix(in srgb, var(--coach-soft, #102040) 70%, transparent);
    border: 1px solid var(--coach-line, color-mix(in srgb, var(--coach-cyan, #60c0f0) 18%, transparent));
    border-radius: 14px;
    display: grid;
    gap: 10px;
    grid-template-columns: 32px minmax(0, 1fr);
    padding: 12px;
  }
  .step-number {
    align-items: center;
    background: color-mix(in srgb, var(--coach-cyan, #60c0f0) 16%, transparent);
    border: 1px solid color-mix(in srgb, var(--coach-cyan, #60c0f0) 28%, transparent);
    border-radius: 999px;
    color: var(--coach-text, #e0ecf4);
    display: inline-flex;
    font-family: 'Fira Code', monospace;
    font-size: 12px;
    height: 30px;
    justify-content: center;
    width: 30px;
  }
`;

export const AccessHandoffCard = styled.section`
  background: color-mix(in srgb, var(--coach-cyan, #60c0f0) 9%, var(--coach-deep, #030712) 82%);
  border: 1px solid color-mix(in srgb, var(--coach-cyan, #60c0f0) 26%, transparent);
  border-radius: 14px;
  display: grid;
  gap: 10px;
  min-width: 0;
  padding: 12px;
  p {
    color: var(--coach-text-soft, #dbeafe);
    font-size: 0.94rem;
    line-height: 1.45;
    margin: 0;
  }
`;

export const AccessHandoffHeader = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: space-between;
  strong {
    color: var(--coach-text, #e0ecf4);
  }
  span {
    border: 1px solid color-mix(in srgb, var(--coach-purple, #8b5cf6) 28%, transparent);
    border-radius: 999px;
    color: var(--coach-text-soft, #dbeafe);
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    padding: 4px 8px;
    text-transform: uppercase;
  }
`;

export const AccessHandoffToken = styled.div`
  align-items: center;
  background: color-mix(in srgb, var(--coach-surface-strong, #102044) 72%, transparent);
  border: 1px solid var(--coach-line, color-mix(in srgb, var(--coach-cyan, #60c0f0) 18%, transparent));
  border-radius: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: space-between;
  padding: 9px 10px;
  span {
    color: var(--coach-muted, #91a3bd);
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    text-transform: uppercase;
  }
  code {
    color: var(--coach-text, #e0ecf4);
    font-family: 'Fira Code', monospace;
    font-size: 0.94rem;
    overflow-wrap: anywhere;
  }
`;

export const AccessHandoffButton = styled.button`
  align-items: center;
  background: color-mix(in srgb, var(--coach-purple, #8b5cf6) 30%, var(--coach-deep, #030712) 70%);
  border: 1px solid color-mix(in srgb, var(--coach-cyan, #60c0f0) 32%, transparent);
  border-radius: 12px;
  color: var(--coach-text, #e0ecf4);
  cursor: pointer;
  display: inline-flex;
  font-weight: 820;
  gap: 8px;
  justify-content: center;
  justify-self: start;
  min-height: 44px;
  padding: 0 14px;
  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--coach-cyan, #60c0f0) 70%, transparent);
    outline-offset: 3px;
  }
`;
export const AccessHandoffLink = styled.a`
  align-items: center;
  background: color-mix(in srgb, var(--coach-purple, #8b5cf6) 30%, var(--coach-deep, #030712) 70%);
  border: 1px solid color-mix(in srgb, var(--coach-cyan, #60c0f0) 32%, transparent);
  border-radius: 12px;
  color: var(--coach-text, #e0ecf4);
  display: inline-flex;
  font-weight: 820;
  gap: 8px;
  justify-content: center;
  justify-self: start;
  min-height: 44px;
  padding: 0 14px;
  text-decoration: none;
  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--coach-cyan, #60c0f0) 70%, transparent);
    outline-offset: 3px;
  }
`;
export const PacketDetails = styled.details`
  border: 1px solid var(--coach-line, color-mix(in srgb, var(--coach-cyan, #60c0f0) 18%, transparent));
  border-radius: 14px;
  overflow: hidden;
  summary {
    align-items: center;
    color: var(--coach-text, #e0ecf4);
    cursor: pointer;
    display: flex;
    font-family: 'Fira Code', monospace;
    font-size: 12px;
    min-height: 44px;
    padding: 0 12px;
  }
  pre {
    background: var(--coach-deep, #030712);
    border-top: 1px solid var(--coach-line, color-mix(in srgb, var(--coach-cyan, #60c0f0) 18%, transparent));
    color: var(--coach-text-soft, #dbeafe);
    margin: 0;
    max-height: 260px;
    overflow: auto;
    padding: 12px;
    white-space: pre-wrap;
  }
`;

export const AttachmentRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-start;
  min-width: 0;
  .attachment {
    border: 1px solid var(--coach-line, color-mix(in srgb, var(--coach-cyan, #60c0f0) 18%, transparent));
    border-radius: 999px;
    color: var(--coach-text-soft, #dbeafe);
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    padding: 6px 9px;
  }
`;
