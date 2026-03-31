/**
 * ┌─── SUB-COMPONENT: MarkdownRenderer ────────────────────────┐
 * │ PARENT: CoachMessage                                        │
 * │ PURPOSE: Renders AI responses as formatted markdown          │
 * │ Props: { content: string }                                   │
 * │ SECURITY: react-markdown is safe by default (no innerHTML)   │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';
import {
  MarkdownWrap,
  TableWrap,
  CodeBlockHeader,
  CopyBtn,
} from './styles/CoachMarkdownStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Code Block with Copy Button
// ─────────────────────────────────────────────────────────────
const CodeBlock: React.FC<{
  className?: string;
  children?: React.ReactNode;
}> = ({ className, children }) => {
  const [copied, setCopied] = useState(false);
  const language = className?.replace('language-', '') || '';
  const code = String(children).replace(/\n$/, '');

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div>
      <CodeBlockHeader>
        <span>{language || 'text'}</span>
        <CopyBtn onClick={handleCopy} aria-label="Copy code">
          {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
        </CopyBtn>
      </CodeBlockHeader>
      <pre>
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// SECTION: Custom Components
// ─────────────────────────────────────────────────────────────
const markdownComponents = {
  // Wrap tables in scrollable container for mobile
  table: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <TableWrap>
      <table {...props}>{children}</table>
    </TableWrap>
  ),
  // Code blocks with copy button
  code: ({ className, children, ...props }: React.HTMLAttributes<HTMLElement> & { className?: string }) => {
    // Inline code (no language class) vs block code
    const isBlock = className?.startsWith('language-');
    if (isBlock) {
      return <CodeBlock className={className}>{children}</CodeBlock>;
    }
    return <code className={className} {...props}>{children}</code>;
  },
};

// ─────────────────────────────────────────────────────────────
// SECTION: Main Component
// ─────────────────────────────────────────────────────────────
interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = memo(({ content }) => {
  // Memoize parsed output to avoid re-parsing on every render
  const rendered = useMemo(() => (
    <MarkdownWrap>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents as any}
      >
        {content}
      </ReactMarkdown>
    </MarkdownWrap>
  ), [content]);

  return rendered;
});

MarkdownRenderer.displayName = 'MarkdownRenderer';

export default MarkdownRenderer;
