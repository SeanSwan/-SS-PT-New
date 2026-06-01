import styled from 'styled-components';

export const NotesContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  background: color-mix(in srgb, var(--card-bg, #141419) 90%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-cyan, #60c0f0) 16%, transparent);
  border-radius: 8px;
`;

export const NotesHeader = styled.div`
  h3 {
    margin: 0;
    color: var(--text-primary, #e0ecf4);
    font-size: 16px;
  }
`;

export const NotesTextarea = styled.textarea`
  width: 100%;
  min-height: 148px;
  padding: 12px;
  color: var(--text-primary, #e0ecf4);
  background: color-mix(in srgb, var(--surface-elevated, #1a1a24) 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-cyan, #60c0f0) 20%, transparent);
  border-radius: 6px;
  font: inherit;
  resize: vertical;

  &::placeholder {
    color: var(--text-muted, #8b9bb4);
  }

  &:focus {
    outline: none;
    border-color: var(--accent-cyan, #60c0f0);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-cyan, #60c0f0) 20%, transparent);
  }
`;
