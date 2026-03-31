/**
 * ============================================================================
 * FILE: CoachMarkdownStyles.ts
 * PURPOSE: Styled components for markdown-rendered AI messages
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-30
 * ============================================================================
 *
 * Crystalline Swan theme tokens applied to markdown elements.
 * Tables get horizontal scroll on mobile. Code blocks use Fira Code.
 */

import styled from 'styled-components';

export const MarkdownWrap = styled.div`
  /* Base typography */
  font-family: 'Sora', sans-serif;
  font-size: inherit;
  line-height: 1.65;
  color: var(--text-primary, #E0ECF4);

  /* Headings */
  h1, h2, h3, h4 {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 700;
    color: var(--text-heading, #E0ECF4);
    margin: 16px 0 8px;
  }
  h1 { font-size: 1.25em; }
  h2 { font-size: 1.15em; }
  h3 { font-size: 1.05em; }
  h4 { font-size: 1em; }
  & > h1:first-child, & > h2:first-child, & > h3:first-child {
    margin-top: 0;
  }

  /* Paragraphs */
  p {
    margin: 8px 0;
    &:first-child { margin-top: 0; }
    &:last-child { margin-bottom: 0; }
  }

  /* Bold / emphasis */
  strong { color: var(--accent-primary, #60C0F0); font-weight: 700; }
  em { font-style: italic; }

  /* Links */
  a {
    color: var(--accent-primary, #60C0F0);
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }

  /* Lists */
  ul, ol {
    margin: 8px 0;
    padding-left: 24px;
  }
  li {
    margin: 4px 0;
    &::marker {
      color: var(--accent-primary, #60C0F0);
    }
  }

  /* Inline code */
  code:not(pre code) {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Fira Code', monospace;
    font-size: 0.88em;
  }

  /* Code blocks */
  pre {
    background: var(--bg-base, #030712);
    border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
    border-radius: 8px;
    padding: 14px 16px;
    margin: 12px 0;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;

    code {
      font-family: 'Fira Code', monospace;
      font-size: 0.85em;
      line-height: 1.5;
      background: transparent;
      padding: 0;
    }
  }

  /* Blockquotes */
  blockquote {
    margin: 12px 0;
    padding: 8px 16px;
    border-left: 3px solid var(--accent-secondary, #8B5CF6);
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 5%, transparent);
    border-radius: 0 6px 6px 0;

    p { margin: 4px 0; }
  }

  /* Horizontal rule */
  hr {
    border: none;
    border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
    margin: 16px 0;
  }
`;

/* Table wrapper for horizontal scroll on mobile */
export const TableWrap = styled.div`
  overflow-x: auto;
  margin: 12px 0;
  -webkit-overflow-scrolling: touch;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9em;
    min-width: 400px;
  }

  thead {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, var(--bg-elevated, #141419));
  }

  th {
    padding: 10px 14px;
    text-align: left;
    font-weight: 600;
    color: var(--text-heading, #E0ECF4);
    border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
    white-space: nowrap;
  }

  td {
    padding: 8px 14px;
    border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
    color: var(--text-primary, #E0ECF4);
  }

  tbody tr:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 4%, transparent);
  }
`;

/* Copy button for code blocks */
export const CodeBlockHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 14px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, var(--bg-base, #030712));
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 8px 8px 0 0;
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
`;

export const CopyBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  cursor: pointer;
  transition: color 0.15s ease;

  &:hover { color: var(--accent-primary, #60C0F0); }
`;
