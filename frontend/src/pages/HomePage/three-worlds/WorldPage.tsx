/**
 * WorldPage — the shared front-page composition every variant renders through.
 * @module pages/HomePage/three-worlds/WorldPage
 *
 * WHAT MAKES 20 VARIANTS OUT OF ONE COMPONENT
 * The component is fixed; the SKELETON is the variable. `nav_model` picks where
 * wayfinding physically lives, `grid` picks how content is placed, `chapters` sets
 * how many scroll bands exist, and `heroMechanics` picks which Three.js world
 * mounts. So the same code produces a full-bleed 6-column scroll-scrubbed page and
 * a 68ch single-measure orbit page, and they share no silhouette.
 *
 * THE PROGRESSIVE-ENHANCEMENT CONTRACT (design-brain adapter §7)
 *   - Exactly ONE lazy Three.js scene per page, never two.
 *   - A committed poster is ALWAYS in the markup, so the first painted frame sells
 *     the page even if JS never runs.
 *   - Motion resolves through `resolveMotion`, which returns `poster` for
 *     reduced-motion and for the `essential` tier regardless of GPU.
 *   - The canvas is `aria-hidden` and `pointer-events:none`; every real control is
 *     DOM, keyboard reachable, and >=44px.
 *
 * BOUNDS: no data fetching, no router coupling. CTAs are announced, not navigated,
 * so a preview variant can never move the user off the gallery by accident.
 */
import React, { useCallback, useMemo, useRef } from 'react';
import { useAnimationTier } from '../../../hooks/useAnimationTier';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { copyFor, SHARED } from './copy/pack';
import { resolveMotion, useThreeWorld, hasWebGL, type WorldBuilder } from './runtime';
import { builderForMechanic } from './scenes/looks';
import type { SkeletonContract } from './skeletons';
import { Chapter, Chapters, Grid, Nav, NavItem, SectionLabel } from './layout';
import {
  Action, ActionRow, CanvasLayer, Content, CueDot, Headline,
  Poster, ProofRow, ScrollHint, StaticNote, Sub, WorldSurface,
} from './worldStyles';

export interface WorldPageProps {
  skeleton: SkeletonContract;
  /** Overrides the mechanic-derived builder. Used only by tests and the wildcard. */
  builder?: WorldBuilder;
  /**
   * Prefix applied to every CTA destination, so variants can be judged without
   * leaving the gallery. Promotion to a real route passes `''`.
   */
  linkPrefix?: string;
}

/** Chapter labels come from the shared section names, cycling if chapters exceed them. */
function chapterLabels(chapters: number): string[] {
  const pool = Object.values(SHARED.sections);
  return Array.from({ length: chapters }, (_, i) => pool[i % pool.length]);
}

/** DOM id for a chapter band, so nav items have a real destination. */
export function chapterId(label: string): string {
  return `chapter-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

export const WorldPage: React.FC<WorldPageProps> = ({ skeleton, builder, linkPrefix = '' }) => {
  const hostRef = useRef<HTMLElement>(null);
  /** The runtime creates/destroys the canvas inside this container per setup. */
  const canvasHostRef = useRef<HTMLDivElement>(null);

  const tier = useAnimationTier();
  const prefersReduced = useReducedMotion();
  const webgl = useMemo(() => hasWebGL(), []);
  const motion = resolveMotion(tier, prefersReduced, webgl);

  const build = useMemo<WorldBuilder>(
    () => builder ?? builderForMechanic(skeleton.hero_mechanics),
    [builder, skeleton.hero_mechanics],
  );

  const { live, lost, error } = useThreeWorld(canvasHostRef, hostRef, motion, build, {
    canvasId: skeleton.id,
  });
  const copy = copyFor(skeleton.id);
  const labels = chapterLabels(skeleton.chapters);
  const suppressCue = skeleton.grid === 'horizontal-scroll' || motion === 'poster';

  /**
   * Nav items scroll to their chapter band. This deliberately does something real:
   * an earlier version made every control a no-op, which a hostile reviewer correctly
   * called out as both a dead product surface and an accessibility defect —
   * focusable buttons that do nothing are worse than no buttons.
   */
  const onNavActivate = useCallback((label: string) => {
    const target = document.getElementById(chapterId(label));
    target?.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
  }, [prefersReduced]);

  /** CTAs are real links through the router, prefix-scoped so previews stay in place. */
  const hrefFor = useCallback(
    (to: string) => `${linkPrefix}${to}`,
    [linkPrefix],
  );

  return (
    <WorldSurface
      ref={hostRef}
      data-world-id={skeleton.id}
      data-nav-model={skeleton.nav_model}
      data-hero-mechanics={skeleton.hero_mechanics}
      data-grid={skeleton.grid}
      data-motion={motion}
      data-live={live ? 'yes' : 'no'}
      data-scene-error={error ?? ''}
      aria-label={`${skeleton.id} front page variant`}
    >
      {/*
        data-frames is DELIBERATELY NOT rendered here: the frame counter moves every
        frame, and a React-rendered copy would freeze a stale value into the DOM on
        each re-render, racing the live diagnostics the runtime republishes every
        250ms. The runtime owns that attribute; QA reads the live one.
      */}
      <Poster $hidden={live} aria-hidden="true" />
      {/*
        The CONTAINER stays MOUNTED and is hidden via opacity while the poster shows,
        so a recoverable context loss can restore into the same DOM home. The canvas
        inside it is the runtime's (created per setup, destroyed per teardown) — a
        force-lost context can never be re-gotten on the same canvas element, which
        is why the element itself cannot survive a hand-off teardown.
      */}
      {motion === 'live' && (
        <CanvasLayer
          ref={canvasHostRef}
          $hidden={!live}
          aria-hidden="true"
        />
      )}

      <Nav $model={skeleton.nav_model} aria-label="Variant navigation">
        {labels.slice(0, 6).map((label) => (
          <NavItem key={label} type="button" onClick={() => onNavActivate(label)}>
            {label}
          </NavItem>
        ))}
      </Nav>

      <Chapters aria-hidden="true">
        {labels.map((label, i) => (
          <Chapter key={label} id={chapterId(label)} $grid={skeleton.grid} $i={i} />
        ))}
      </Chapters>

      <Content>
        <Grid $grid={skeleton.grid}>
          <div>
            <SectionLabel $grid={skeleton.grid}>{labels[0]}</SectionLabel>
            <Headline>{copy.headline}</Headline>
            <Sub>{copy.sub}</Sub>
          </div>

          <ActionRow>
            {SHARED.ctas.map((cta) => (
              <Action key={cta.id} as="a" href={hrefFor(cta.to)} $intent={cta.intent}>
                {cta.label}
              </Action>
            ))}
          </ActionRow>

          <ProofRow>
            {SHARED.proof.slice(0, 4).map((p) => (
              <li key={p.id}>
                <b>{p.value}</b>
                <span>{p.label}</span>
              </li>
            ))}
          </ProofRow>
        </Grid>

        {error && (
          <StaticNote role="alert">
            Scene error — showing the static poster instead: {error}
          </StaticNote>
        )}

        {!error && motion === 'poster' && (
          <StaticNote>
            {lost
              ? 'Static preview — the GPU context was lost twice, so this variant is shown as a still.'
              : 'Static preview — motion is reduced or this device is on the essential tier.'}
          </StaticNote>
        )}
      </Content>

      <ScrollHint $hide={suppressCue}>
        Scroll<CueDot aria-hidden="true">↓</CueDot>
      </ScrollHint>
    </WorldSurface>
  );
};

export default WorldPage;
