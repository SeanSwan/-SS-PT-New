import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const readCoachFile = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const SIDEBAR_SOURCE = readCoachFile('ConversationSidebar.tsx');
const ITEM_SOURCE = readCoachFile('ConversationItem.tsx');
const STYLES_SOURCE = readCoachFile('styles/CoachSidebarStyles.ts');

describe('ConversationSidebar style and accessibility locks', () => {
  it('keeps empty state and conversation row visuals in extracted styles', () => {
    expect(SIDEBAR_SOURCE).not.toContain('style={{');
    expect(ITEM_SOURCE).not.toContain('style={{');
    expect(STYLES_SOURCE).toContain('export const EmptyStateIcon');
    expect(STYLES_SOURCE).toContain('export const EmptyStateHint');
    expect(STYLES_SOURCE).toContain('export const ThreadIcon');
    expect(STYLES_SOURCE).toContain('export const InlineTitleInput');
  });

  it('keeps search and row actions at the 44px touch target floor', () => {
    expect(STYLES_SOURCE).not.toContain('min-height: 40px');
    expect(STYLES_SOURCE).not.toMatch(/width:\s*32px/);
    expect(STYLES_SOURCE).not.toMatch(/height:\s*32px/);
    expect(STYLES_SOURCE).toMatch(/export const SearchInput[\s\S]*min-height:\s*44px/);
    expect(STYLES_SOURCE).toMatch(/export const ConvActionBtn[\s\S]*min-width:\s*44px[\s\S]*height:\s*44px/);
  });

  it('keeps conversation selection keyboard-activatable via a REAL nested button', () => {
    // role=button census refactor: the row is a plain container; selection is a
    // native <ThreadSelectButton> (Enter/Space come from the browser), and the
    // rename input renders OUTSIDE that button, never inside one.
    expect(ITEM_SOURCE).toContain('ThreadSelectButton');
    expect(ITEM_SOURCE).toMatch(/<ThreadSelectButton\s*\n\s*type="button"/);
    expect(ITEM_SOURCE).toMatch(/onClick=\{handleSelect\}/);
    expect(ITEM_SOURCE).not.toMatch(/role="button"/);
    expect(ITEM_SOURCE).not.toContain('handleRowKeyDown');
    expect(STYLES_SOURCE).toContain('export const ThreadSelectButton = styled.button');
  });
});
