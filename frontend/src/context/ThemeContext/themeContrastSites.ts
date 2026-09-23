/**
 * themeContrastSites.ts
 * =====================
 *
 * WHAT is measured: the text sites the theme lens renders, the token each one paints
 * with, and the wash it sits on.
 *
 * Split out of `themeContrastInstrument.ts` under Rule 4 on 2026-09-20, when the wash
 * machinery below pushed the instrument past 300 lines. The seam is data vs apparatus,
 * the same one the repo already used for `themePalettes.ts`: the instrument is the
 * scanner, this is the declaration it scans against. Keeping them in one file meant a
 * rule-4 failure was fixed by deleting comments — extraction is the remedy, not
 * trimming.
 *
 * WHY EVERY SURFACE CARRIES ITS WASH
 * The surfaces here used to be bare `{ label, color }` pairs, with the wash percentage
 * appearing only inside the `color` call. That made the percentage unverifiable: the
 * gate compared TOKENS, so `--accent-primary` at 14% and at 18% were the same token to
 * it, and changing the wash in the stylesheet left the gate measuring a surface that
 * no longer existed. `washSurface()` now states the recipe once and hands it to both
 * the colour and the assertion, so `washDrift()` can prove the stylesheet agrees.
 *
 * Read a `wash` as: "this token, at this percentage, over the panel". No wash means
 * the surface is a plain token (`panel`, `accent`, `bg-primary`).
 */

import {
  type Surface,
  type TextSite,
  AA_NON_TEXT,
  AA_NORMAL,
  panel,
  token,
} from './themeContrastInstrument';
import { washSurface } from './themeContrastWashes';

export const SITES: TextSite[] = [
  {
    file: 'ThemeLensPopover.styles.ts',
    component: 'PanelTitle',
    threshold: AA_NORMAL,
    note: '0.75rem/600 uppercase',
    surfaces: { '--text-secondary': (id) => [{ label: 'panel', color: panel(id) }] },
  },
  {
    file: 'ThemeLensPopover.styles.ts',
    component: 'CycleButton',
    threshold: AA_NORMAL,
    note: '0.75rem/600 pill; both the rest and hover washes',
    surfaces: {
      '--text-primary': (id) => [
        washSurface(id, '--accent-primary', 14, 'panel+accent14'),
        washSurface(id, '--accent-primary', 24, 'panel+accent24(hover)'),
      ],
    },
  },
  {
    file: 'ThemeLensPopover.styles.ts',
    component: 'SystemLabel',
    // The 55% wash is declared on SystemRow (styles.ts:133), not on the label itself.
    paintedBy: 'SystemRow',
    threshold: AA_NORMAL,
    note: '0.75rem/500 on the 55% base wash',
    surfaces: {
      '--text-secondary': (id) => [washSurface(id, '--bg-base', 55, 'panel+bgBase55')],
    },
  },
  {
    file: 'ThemeLensPopover.styles.ts',
    component: 'OptionLabel',
    // The selected/unselected ternary is declared on Option (styles.ts:161–164).
    paintedBy: 'Option',
    threshold: AA_NORMAL,
    note: '0.75rem/500; selected is emphasised, unselected is not',
    surfaces: {
      '--text-primary': (id) => [
        washSurface(id, '--accent-primary', 20, 'panel+accent20(selected)'),
      ],
      '--text-secondary': (id) => [
        washSurface(id, '--bg-base', 60, 'panel+bgBase60(unselected)'),
      ],
    },
  },
  {
    file: 'ThemeLensPopover.styles.ts',
    component: 'SelectedMark',
    threshold: AA_NON_TEXT,
    note: '13px check glyph on the accent disc — a graphical object, so 3:1',
    surfaces: {
      '--text-on-accent': (id) => [{ label: 'accent', color: token(id, '--accent-primary') }],
    },
  },
  {
    file: 'ThemeLensButton.styles.ts',
    component: 'TooltipBubble',
    threshold: AA_NORMAL,
    note: '0.75rem/500 on the opaque page colour — round 3 #1',
    surfaces: {
      '--text-primary': (id) => [{ label: 'bg-primary', color: token(id, '--bg-primary') }],
    },
  },
];
