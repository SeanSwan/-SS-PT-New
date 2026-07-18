/**
 * Dashboards v2 — ProgressRing (KIMI-DASHBOARDS §2.4). A single adherence/completion dial via
 * VictoryPie (donut). Ring color resolves from the lens (--world-accent → theme.palette), track is the
 * lens axis-grid tone; both resolved from a host ref (SVG can't carry var()) and re-resolved on world
 * switch. The center label is the ONLY text. Size keys off --dash-dial-r via the wrapper. Client uses
 * --dash-accent (zero action-fill per §2.4). Colors flow through VictoryPie `style`, resolved (not var).
 */
import { useLayoutEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { VictoryPie } from 'victory';
import { resolveLensVictoryTheme } from '../lensBindings';
import { useWorldKey } from '../useWorldKey';

export interface ProgressRingProps {
  pct: number; // 0..100 (already computed server-side; clamped here defensively)
  label: string;
  caption?: string;
}

const Wrap = styled.div`
  position: relative;
  width: var(--dash-dial-r, 132px);
  height: var(--dash-dial-r, 132px);
  display: grid;
  place-items: center;
`;
const Center = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  pointer-events: none;
`;
const Value = styled.span`
  font: 700 clamp(20px, 6vw, 28px) / 1 var(--dash-font-display, inherit);
  color: var(--dash-ink);
`;
const Caption = styled.span`
  font-size: 11px;
  color: var(--dash-ink-2);
`;

export function ProgressRing({ pct, label, caption }: ProgressRingProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const worldKey = useWorldKey();
  const [colors, setColors] = useState(() => ({ ring: '#60C0F0', track: 'rgba(255,255,255,0.12)' }));

  useLayoutEffect(() => {
    const b = resolveLensVictoryTheme(hostRef.current);
    setColors({ ring: b.theme.palette.qualitative[0], track: b.theme.axis.style.grid.stroke });
  }, [worldKey]);

  const value = Math.max(0, Math.min(100, Math.round(pct)));

  return (
    <Wrap ref={hostRef} role="img" aria-label={`${label}: ${value}%`} data-testid="dash-ring">
      {/* colorScale maps slices by data order (done, rest) — avoids a banned `style=` JSX attribute. */}
      <VictoryPie
        width={160}
        height={160}
        padding={0}
        innerRadius={62}
        cornerRadius={6}
        labels={() => null}
        colorScale={[colors.ring, colors.track]}
        data={[
          { x: 'done', y: value },
          { x: 'rest', y: 100 - value },
        ]}
      />
      <Center>
        <Value>{value}%</Value>
        {caption ? <Caption>{caption}</Caption> : null}
      </Center>
    </Wrap>
  );
}
