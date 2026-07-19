/**
 * Video V-next — VideoControls (Kimi (b)7: chrome is MONASTIC). Quiet, solid surface — NO glass, no fringe,
 * no glow. The premium reads as the CONTRAST between silent utility and the one loud hero. Search + a
 * content-type select whose options derive from the loaded results (no guessed enum). 44px targets.
 */
import { useState } from 'react';
import styled from 'styled-components';
import { normalizeContentTypeLabel } from '../VideoLibraryV3.logic';

const Bar = styled.form`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 12px var(--video-pad, 24px);
  max-width: 1200px;
  margin: 0 auto;
`;
const Input = styled.input`
  flex: 1 1 220px;
  min-height: var(--video-target, 44px);
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid var(--video-ice-14);
  background: var(--video-surface);
  color: var(--video-ink);
  font-size: 14px;
  &::placeholder {
    color: var(--video-ink-2);
  }
`;
const Select = styled.select`
  min-height: var(--video-target, 44px);
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid var(--video-ice-14);
  background: var(--video-surface);
  color: var(--video-ink);
  font-size: 14px;
`;
const Btn = styled.button`
  min-height: var(--video-target, 44px);
  padding: 0 18px;
  border-radius: 10px;
  border: 1px solid var(--video-ice-14);
  background: var(--video-elev-1, var(--video-surface));
  color: var(--video-ink);
  font: 600 14px / 1 var(--video-font-display, inherit);
  cursor: pointer;
`;

export function VideoControls({
  contentTypes,
  contentType,
  onContentType,
  onSearch,
}: {
  contentTypes: string[];
  contentType: string;
  onContentType: (v: string) => void;
  onSearch: (v: string) => void;
}) {
  const [text, setText] = useState('');
  return (
    <Bar
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(text.trim());
      }}
    >
      <Input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search the library…"
        aria-label="Search videos"
      />
      <Select value={contentType} onChange={(e) => onContentType(e.target.value)} aria-label="Filter by type">
        <option value="">All types</option>
        {contentTypes.map((t) => (
          <option key={t} value={t}>
            {normalizeContentTypeLabel(t)}
          </option>
        ))}
      </Select>
      <Btn type="submit">Search</Btn>
    </Bar>
  );
}
