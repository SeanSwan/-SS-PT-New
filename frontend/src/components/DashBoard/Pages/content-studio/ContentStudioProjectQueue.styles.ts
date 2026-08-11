/**
 * Styles for the Content Studio project queue.
 */

import styled from 'styled-components';

export const ProjectQueuePanel = styled.section`
  display: grid;
  gap: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-card, #141419) 78%, transparent);
  padding: clamp(14px, 2vw, 18px);
`;

export const ProjectQueueHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

export const ProjectQueueTitle = styled.h3`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--text-heading, #E0ECF4);
  font: 800 0.98rem/1.2 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
`;

export const ProjectQueueCopy = styled.p`
  margin: 4px 0 0;
  max-width: 720px;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 66%, transparent);
  font: 500 0.76rem/1.45 var(--font-ui, 'Sora', sans-serif);
`;

export const ProjectCreateForm = styled.form`
  display: grid;
  grid-template-columns: minmax(min(100%, 220px), 1fr) auto;
  gap: 10px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const ProjectTitleInput = styled.input`
  min-height: 44px;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  border-radius: 8px;
  background: var(--bg-base, #030712);
  color: var(--text-primary, #E0ECF4);
  font: 600 0.86rem/1 var(--font-ui, 'Sora', sans-serif);
  padding: 0 12px;

  &::placeholder {
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 46%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const ProjectButton = styled.button`
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 32%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 16%, var(--bg-base, #030712));
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font: 800 0.78rem/1 var(--font-ui, 'Sora', sans-serif);
  padding: 0 14px;
  white-space: nowrap;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  &:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 36%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const ProjectStateLine = styled.div`
  display: flex;
  min-height: 44px;
  align-items: center;
  gap: 10px;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent);
  font: 600 0.78rem/1.4 var(--font-ui, 'Sora', sans-serif);
`;

export const ProjectList = styled.div`
  display: grid;
  gap: 10px;
`;

export const ProjectCard = styled.article`
  display: grid;
  gap: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 70%, transparent);
  padding: 12px;
`;

export const ProjectCardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
`;

export const ProjectTitle = styled.strong`
  color: var(--text-primary, #E0ECF4);
  font: 800 0.88rem/1.3 var(--font-ui, 'Sora', sans-serif);
`;

export const ProjectMetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const ProjectBadge = styled.span`
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  border-radius: 6px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  color: var(--accent-primary, #60C0F0);
  font: 800 0.68rem/1 var(--font-mono, 'Fira Code', monospace);
  padding: 0 9px;
  text-transform: uppercase;
`;