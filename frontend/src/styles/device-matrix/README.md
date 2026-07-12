# Swan Device Matrix

Portable pixel-perfect phone styling system. **Copy this folder into any
project and it works** — that is the contract.

## What it is

| File | Job | Dependencies |
|---|---|---|
| `buckets.ts` | The 12 CSS viewport realities (P1–P12) covering ~93% of US phone traffic in 2026. IDs are byte-aligned with `tools/viewport-sweep/buckets.mjs` so design code and QA sweeps speak one language. | none |
| `devices.ts` | Top-20 phone registry (30+ marketing models via aliases), each mapped to its bucket. `iphone-xr` (P1) is the house primary. | `buckets` |
| `media.ts` | Pure-string `@media` builders: `media.bucket('P1')`, `media.device('iphone-xr')`, `media.phone`, capability/preference gates, `safeArea()` env helpers, 44px touch floor constant. | `buckets`, `devices` |
| `grid.ts` | Container-query grid engine: `SwanGridFrame` + `SwanGrid` with asymmetric presets (`editorial` / `console` / `rail` / `fluid`), bucket-scoped areas, Style-Lens-aware gaps and panel chrome. | styled-components (peer) |

Only `grid.ts` needs styled-components. Delete it and the rest is
dependency-free TypeScript.

## Why 20 devices, not 30

Past 20 entries, every additional marketing name lands in an
already-covered bucket — 20 phones collapse into 12 CSS realities.
Aliases carry the long tail (30+ models are represented). Layouts target
**buckets**; device pins exist for surgical one-phone fixes only.

## The rules the matrix encodes

1. **Buckets for layout, device pins for bug fixes.** `media.bucket('P1')`
   changes composition; `media.device('iphone-xr')` patches one phone's quirk.
2. **375 is two phones.** iPhone mini class (tall, notched) and iPhone SE
   class (short, no safe-area) share one width. Never write a bare 375
   rule — use `media.tallPhone375()` / `media.shortPhone375()` or
   `disambiguate375(height)`.
3. **44px touch floor everywhere** (`TOUCH_TARGET_MIN_PX`).
4. **Safe-area honesty.** Notched devices get `safeArea('bottom', '16px')`
   → `max(16px, env(safe-area-inset-bottom))`.
5. **Grids respond to containers, not viewports.** The same `SwanGrid` is
   correct in a full page, a modal, or a half-width compare panel.
6. **Grid must break.** Presets are asymmetric by design; there is no
   equal-N-up preset and that is intentional.

## Usage

```tsx
import styled from 'styled-components';
import {
  media, safeArea, SwanGrid, SwanGridFrame, TOUCH_TARGET_MIN_PX,
} from '../../styles/device-matrix';

const Bar = styled.nav`
  min-height: ${TOUCH_TARGET_MIN_PX}px;
  padding-bottom: ${safeArea('bottom', '12px')};

  ${media.bucket('P1')} {
    padding-inline: 20px; /* tuned on the house-primary iPhone XR */
  }
  ${media.shortPhone375()} {
    min-height: ${TOUCH_TARGET_MIN_PX}px; /* SE keeps the floor, loses chrome */
  }
`;

export const Console = () => (
  <SwanGridFrame>
    <SwanGrid $preset="console" $collapseAt={760}>
      <section style={{ gridArea: 'focus' }}>…</section>
      <aside style={{ gridArea: 'flank' }}>…</aside>
      <footer style={{ gridArea: 'band' }}>…</footer>
    </SwanGrid>
  </SwanGridFrame>
);
```

## Relationship to existing helpers

`frontend/src/styles/breakpoints.ts` / `responsive.ts` remain the generic
size-tier helpers (`md`, `lg`, tablet/desktop). The device matrix is the
**phone-truth layer** underneath them — use it whenever a decision must be
correct on a *specific real phone* rather than a generic size class.

## Keeping it honest

`deviceMatrix.test.ts` locks: bucket/device consistency (incl. the 375
split), alignment with `tools/viewport-sweep/buckets.mjs`, XR primacy,
query-string stability, and the 44px floor. If the sweep tool's buckets
change, the alignment test fails here — update both sides in one commit.
