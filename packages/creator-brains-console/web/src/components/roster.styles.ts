/*
 * roster.styles.ts — the styled-components for the Roster panel, extracted at the seam when
 * `Roster.tsx` crossed the 300-line cap (Rule 4).
 *
 * WHY THIS IS THE RIGHT SEAM AND NOT AN ARBITRARY CUT. These declarations are pure presentation:
 * they depend on nothing in the component and nothing in the component depends on their
 * internals. The interesting part of `Roster.tsx` is its three honesty rules — a null count is
 * not zero, the write is not the refresh, a refusal is the engine's own sentence — and those
 * read better with the CSS moved out of the way. Extracting at a seam the file already had beats
 * trimming the comment block that explains why each rule exists.
 *
 * The one non-obvious declaration is `Notice`, whose tone is a transient prop (`$tone`) so the
 * styled-components filter does not forward it to the DOM and produce a React warning. Its JSDoc
 * is kept here rather than in the component, because it is a property of the STYLE.
 */

import styled from 'styled-components';

export const Panel = styled.section`
  border: 1px solid var(--border-electric, rgba(96, 192, 240, 0.2));
  border-radius: var(--radius-card, 20px);
  background: var(--carbon, #141419);
  padding: var(--space-5, 24px);
`;

export const PanelHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3, 12px);
  margin-bottom: var(--space-4, 16px);
`;

export const PanelTitle = styled.h2`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.02em;
`;

export const Count = styled.span`
  font-family: var(--font-data, monospace);
  font-size: 12px;
  color: var(--text-faint, rgba(224, 236, 244, 0.38));
`;

export const AddForm = styled.form`
  display: flex;
  gap: var(--space-2, 8px);
  margin-bottom: var(--space-4, 16px);
`;

export const Input = styled.input`
  flex: 1;
  min-width: 0;
  padding: var(--space-2, 8px) var(--space-3, 12px);
  border-radius: var(--radius-control, 10px);
  border: 1px solid var(--border-electric, rgba(96, 192, 240, 0.2));
  background: var(--graphite, #1a1a24);
  color: var(--text-primary, #e0ecf4);
  font-family: var(--font-ui, system-ui, sans-serif);
  font-size: 14px;

  &:focus-visible {
    outline: 2px solid var(--wing-purple, #8b5cf6);
    outline-offset: 1px;
  }

  &:disabled {
    opacity: 0.55;
  }
`;

export const Button = styled.button`
  padding: var(--space-2, 8px) var(--space-4, 16px);
  border-radius: var(--radius-control, 10px);
  border: 1px solid transparent;
  background: var(--midnight-sapphire, #002060);
  color: var(--frost-white, #e0ecf4);
  font-family: var(--font-ui, system-ui, sans-serif);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--wing-purple, #8b5cf6);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: progress;
    opacity: 0.55;
  }
`;

export const Row = styled.li`
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: var(--space-3, 12px);
  padding: var(--space-3, 12px) 0;
  border-top: 1px solid var(--border-hairline, rgba(96, 192, 240, 0.12));
`;

export const RowTitle = styled.div`
  min-width: 0;
`;

export const Name = styled.div`
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const Channel = styled.div`
  font-family: var(--font-data, monospace);
  font-size: 11px;
  color: var(--text-faint, rgba(224, 236, 244, 0.38));
`;

/** An ABSENT count is an em dash, never a zero (S1-H9) — the style is what makes it read as absent. */
export const Stat = styled.span`
  font-family: var(--font-data, monospace);
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  white-space: nowrap;
`;

export const Notice = styled.p<{ $tone: 'error' | 'info' }>`
  margin: 0 0 var(--space-3, 12px);
  padding: var(--space-2, 8px) var(--space-3, 12px);
  border-radius: var(--radius-control, 10px);
  font-size: 13px;
  line-height: 1.45;
  ${(p) => (p.$tone === 'error'
    ? `border: 1px solid var(--danger, #e5484d);
       background: rgba(229, 72, 77, 0.10);
       color: var(--text-primary, #e0ecf4);`
    : `border: 1px solid var(--border-electric, rgba(96, 192, 240, 0.2));
       background: var(--success-tint, rgba(96, 192, 240, 0.12));
       color: var(--text-primary, #e0ecf4);`)}
`;

export const Empty = styled.p`
  margin: 0;
  padding: var(--space-4, 16px) 0;
  color: var(--text-faint, rgba(224, 236, 244, 0.38));
  font-size: 13px;
`;

export const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;
