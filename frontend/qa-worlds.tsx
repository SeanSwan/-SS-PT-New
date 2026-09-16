/**
 * qa-worlds — dev-only harness that renders all 20 Three.js variants for measurement.
 * @module qa-worlds
 *
 * WHY A SEPARATE ENTRY AND NOT A ROUTE IN THE APP
 * The app's routing wraps every page in providers, gates, guards and telemetry, so
 * mounting a QA surface inside it measures the harness as much as the variants. This
 * entry mounts the fleet directly, which is what makes the pixel-level verification
 * (`gallery-verify.mjs`) a statement about the variants rather than about the shell.
 *
 * It is dev-only by construction: Vite exposes it solely under `vite dev`, and it is
 * never imported by the application bundle.
 *
 * Each card mounts only when it approaches the viewport, because browsers cap the
 * number of simultaneous WebGL contexts — mounting all twenty eagerly would show a
 * broken gallery and prove nothing.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { THREE_WORLDS, type ThreeWorldEntry } from './src/pages/HomePage/three-worlds/registry';

/** Mount children once the wrapper is near the viewport. */
function LazyMount({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || show) return undefined;
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) setShow(true); },
      { rootMargin: '400px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [show]);
  return <div ref={ref}>{show ? children : 'scroll to mount'}</div>;
}

/** One variant card. The component comes from the registry's own lazy import. */
function Card({ entry }: { entry: ThreeWorldEntry }) {
  const [Comp, setComp] = useState<React.ComponentType<{ linkPrefix?: string }> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    import(`./src/pages/HomePage/three-worlds/${entry.id}/${entry.id}`)
      .then((m) => { if (alive) setComp(() => m.default); })
      .catch((e) => { if (alive) setErr(String((e as Error)?.message ?? e)); });
    return () => { alive = false; };
  }, [entry.id]);

  return (
    <article className="card" data-world={entry.id}>
      <div className="meta">
        <h2>{entry.title}</h2>
        <code>
          {entry.skeleton.nav_model} · {entry.skeleton.hero_mechanics} · {entry.skeleton.grid}
        </code>
      </div>
      <div className="frame">
        <LazyMount>
          {err ? <div style={{ padding: '1rem', color: '#ff8a8a' }}>failed: {err}</div>
            : Comp ? (
              // anchorPrefix="#" keeps CTA navigation inside the harness page instead
              // of attempting a real route change the QA entry has no router for.
              <Comp linkPrefix="#" />
            )
              : <div style={{ padding: '1rem', opacity: 0.5 }}>loading…</div>}
        </LazyMount>
      </div>
    </article>
  );
}

function App() {
  // `?only=vNN` renders a single variant in isolation. Round 2 withdrew the original
  // attribution of the co-mount crash to the software renderer: a page asking for 20
  // live WebGL contexts exceeds the browser's context cap BY CONSTRUCTION, and the
  // runtime's render-slot pool (renderSlots.ts) now enforces that budget. Isolation
  // per variant remains the production shape — one live variant per route.
  const only = new URLSearchParams(window.location.search).get('only');
  const rows = only ? THREE_WORLDS.filter((e) => e.id === only) : THREE_WORLDS;
  return (
    <>
      {rows.map((entry) => <Card key={entry.id} entry={entry} />)}
    </>
  );
}

const host = document.getElementById('grid');
if (host) createRoot(host).render(<App />);
