import styled from 'styled-components';

export const QuickPromptBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: 10px;
  padding: 12px 14px 0;
`;

export const QuickPromptButton = styled.button`
  min-height: 64px;
  border: 1px solid var(--ai-terminal-quick-border, #60c0f059);
  border-radius: 12px;
  background: var(--ai-terminal-quick-bg, #0020608c);
  color: var(--ai-terminal-quick-text, #e0ecf4);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 4px;
  padding: 14px 16px;
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;

  strong {
    font-size: 14px;
    line-height: 1.2;
  }

  &:hover,
  &:focus-visible {
    border-color: var(--ai-terminal-quick-border-hover, #60c0f0);
    background: var(--ai-terminal-quick-bg-hover, #00308080);
  }

  &:focus-visible {
    outline: 2px solid var(--ai-terminal-focus-ring, #8b5cf6);
    outline-offset: 2px;
  }

  &:active {
    transform: translateY(1px);
  }
`;

export const QuickPromptDescription = styled.span`
  color: var(--ai-terminal-quick-muted, #d7e4ee);
  font-size: 12px;
  line-height: 1.35;
`;
