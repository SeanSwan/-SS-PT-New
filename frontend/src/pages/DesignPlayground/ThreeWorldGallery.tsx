/**
 * ThreeWorldGallery — QA + judgement surface for the 20-variant Three.js fleet.
 * @module pages/DesignPlayground/ThreeWorldGallery
 *
 * WHAT THIS IS FOR
 * The console lists the fleet's structure; this page renders it. It is the surface
 * where the fleet is actually LOOKED AT, because a structural claim that was never
 * seen on screen is not evidence (the standing lesson: "render it, measure it, LOOK
 * at it").
 *
 * It lazy-mounts each variant only when its card scrolls into view. Twenty live
 * WebGL contexts at once would exhaust the browser's context budget (browsers cap
 * around 8-16), so eager mounting would show a broken gallery and tell you nothing
 * about the variants.
 *
 * Each card carries its divergence tuple and the cost the variant accepts, so the
 * comparison is about bones rather than paint.
 */
import React, { Suspense, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { THREE_WORLDS, type ThreeWorldEntry } from '../HomePage/three-worlds/registry';

const Wrap = styled.div`
  min-height: 100vh;
  /* The gallery chrome sits OUTSIDE WorldSurface, so it declares the two house
     aliases its cards read; keeps them resolvable rather than fallback-forever. */
  --obsidian: #0a0a0f; // swan-guard-allow-hex house alias declared for this surface
  --card-dark: #141419; // swan-guard-allow-hex house alias declared for this surface
  background: var(--bg-base, #030712);
  color: var(--text-primary, #e0ecf4);
  padding: clamp(1rem, 3vw, 2.5rem);
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Head = styled.header`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.5rem;
  align-items: baseline;
  justify-content: space-between;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 25%, transparent);
  padding-bottom: 0.75rem;
  h1 { margin: 0; font-size: 1.25rem; font-family: 'Plus Jakarta Sans', sans-serif; }
  p { margin: 0; font-size: 0.82rem; color: var(--text-secondary, rgba(224, 236, 244, 0.7)); }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1rem;
`;

const Card = styled.section`
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 22%, transparent);
  border-radius: 14px;
  overflow: hidden;
  background: var(--card-dark, #141419);
  display: flex;
  flex-direction: column;
`;

const Meta = styled.div`
  padding: 0.6rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  h2 { margin: 0; font-size: 0.9rem; font-family: 'Sora', sans-serif; }
  code { font-family: 'Fira Code', monospace; font-size: 0.7rem; color: var(--arctic-cyan, #50a0f0); overflow-wrap: anywhere; }
  p { margin: 0; font-size: 0.72rem; color: var(--text-secondary, rgba(224, 236, 244, 0.66)); }
`;

/** Fixed aspect frame so twenty scenes are compared at one consistent size. */
const Frame = styled.div`
  position: relative;
  aspect-ratio: 16 / 10;
  background: linear-gradient(160deg, var(--primary, #002060), var(--obsidian, #0a0a0f));
  > * { position: absolute; inset: 0; overflow: hidden; }
`;

const Placeholder = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.5));
`;

/** Mount a variant only once it is near the viewport. */
function LazyMount({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || show) return undefined;
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) setShow(true); },
      { rootMargin: '300px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [show]);

  return <div ref={ref}>{show ? children : <Placeholder>scroll to mount</Placeholder>}</div>;
}

/** One card. Renders the real variant component through the registry's lazy import. */
function WorldCard({ entry }: { entry: ThreeWorldEntry }) {
  const [Comp, setComp] = useState<React.ComponentType<{ preview?: boolean }> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    import(`../HomePage/three-worlds/${entry.id}/${entry.id}`)
      .then((m) => { if (alive) setComp(() => m.default); })
      .catch((e) => { if (alive) setErr(String(e?.message ?? e)); });
    return () => { alive = false; };
  }, [entry.id]);

  return (
    <Card data-variant={entry.id}>
      <Meta>
        <h2>{entry.title}</h2>
        <code>
          {entry.skeleton.nav_model} · {entry.skeleton.hero_mechanics} · {entry.skeleton.grid}
        </code>
        <p>{entry.tradeoff}</p>
      </Meta>
      <Frame>
        <LazyMount>
          {err ? <Placeholder>failed: {err}</Placeholder>
            : Comp ? <Suspense fallback={<Placeholder>loading scene…</Placeholder>}><Comp preview /></Suspense>
              : <Placeholder>loading module…</Placeholder>}
        </LazyMount>
      </Frame>
    </Card>
  );
}

const ThreeWorldGallery: React.FC = () => (
  <Wrap>
    <Head>
      <h1>Three.js front-page fleet — {THREE_WORLDS.length} variants</h1>
      <p>
        Every variant is one lazy scene with a static poster fallback. Cards mount on
        approach, because the browser caps concurrent WebGL contexts.
      </p>
    </Head>
    <Grid>
      {THREE_WORLDS.map((entry) => <WorldCard key={entry.id} entry={entry} />)}
    </Grid>
  </Wrap>
);

export default ThreeWorldGallery;
