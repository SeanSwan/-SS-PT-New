/**
 * COMPONENT: CoachFocusLens
 * PURPOSE: A restrained, optional Three.js visual cue for the shared command center.
 * CONTRACT: Decorative only; all coaching facts, controls, and status remain in DOM text.
 * ACCESSIBILITY: The figure has an honest label and degrades to a CSS material when WebGL is unavailable.
 * PERFORMANCE: One static render per mount; no animation loop, pointer tracking, or layout measurement.
 * DESIGN: Crystalline Swan focus material with cyan and purple token fallbacks.
 * OPERATIONS: WebGL errors are contained locally so chat, dictation, and review remain usable.
 */
import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import * as THREE from 'three';

type CoachFocusLensProps = {
  label: string;
};

const FocusLensFigure = styled.figure`
  --focus-accent: var(--accent-primary, #60C0F0);
  --focus-secondary: var(--accent-secondary, #8B5CF6);
  position: relative;
  display: grid;
  place-items: center;
  width: 76px;
  min-width: 76px;
  height: 58px;
  margin: 0;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--focus-accent) 34%, transparent);
  border-radius: 16px;
  background:
    radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--focus-accent) 18%, transparent), transparent 58%),
    linear-gradient(145deg, color-mix(in srgb, var(--focus-secondary) 15%, transparent), color-mix(in srgb, var(--bg-base, #030712) 88%, transparent));
  box-shadow: 0 0 22px color-mix(in srgb, var(--focus-accent) 12%, transparent), inset 0 1px 0 rgb(224 236 244 / 10%);
  isolation: isolate;

  &::after {
    position: absolute;
    inset: 0;
    z-index: -1;
    content: '';
    background: linear-gradient(120deg, transparent 18%, rgb(224 236 244 / 12%) 48%, transparent 70%);
    pointer-events: none;
  }

  &[data-fallback='true'] .focus-lens-canvas {
    opacity: 0;
  }

  @media (max-width: 768px) {
    width: 64px;
    min-width: 64px;
    height: 48px;
    border-radius: 14px;
  }
`;

const FocusLensCanvas = styled.canvas`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.92;
  pointer-events: none;
  transition: opacity 180ms ease;
`;

const FocusLensCaption = styled.figcaption`
  position: absolute;
  right: 7px;
  bottom: 5px;
  z-index: 1;
  color: var(--text-muted, rgb(224 236 244 / 66%));
  font-family: var(--font-mono, 'Fira Code', monospace);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1;
  text-transform: uppercase;
`;

const resolveTokenColor = (element: HTMLElement, token: string, fallback: string) => {
  const resolved = window.getComputedStyle(element).getPropertyValue(token).trim();
  return resolved || fallback;
};

const CoachFocusLens: React.FC<CoachFocusLensProps> = ({ label }) => {
  const figureRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const figure = figureRef.current;
    if (!canvas || !figure) return undefined;

    let renderer: THREE.WebGLRenderer | undefined;
    let scene: THREE.Scene | undefined;
    let geometry: THREE.BufferGeometry | undefined;
    let coreGeometry: THREE.BufferGeometry | undefined;
    let material: THREE.Material | undefined;
    let coreMaterial: THREE.Material | undefined;

    try {
      if (typeof WebGLRenderingContext === 'undefined') {
        setFallback(true);
        return undefined;
      }

      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas,
        powerPreference: 'low-power',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(76, 58, false);

      scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(28, 76 / 58, 0.1, 20);
      camera.position.z = 4.2;

      const accent = resolveTokenColor(figure, '--focus-accent', '#60C0F0');
      const secondary = resolveTokenColor(figure, '--focus-secondary', '#8B5CF6');
      geometry = new THREE.IcosahedronGeometry(0.82, 1);
      material = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.8, wireframe: true });
      const wireframe = new THREE.Mesh(geometry, material);
      wireframe.rotation.x = 0.28;
      wireframe.rotation.y = -0.42;

      coreGeometry = new THREE.SphereGeometry(0.42, 16, 12);
      coreMaterial = new THREE.MeshBasicMaterial({ color: secondary, transparent: true, opacity: 0.18 });
      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      scene.add(wireframe, core);
      renderer.render(scene, camera);

      const handleContextLost = () => setFallback(true);
      canvas.addEventListener('webglcontextlost', handleContextLost);

      return () => {
        canvas.removeEventListener('webglcontextlost', handleContextLost);
        geometry?.dispose();
        coreGeometry?.dispose();
        material?.dispose();
        coreMaterial?.dispose();
        renderer?.dispose();
      };
    } catch {
      setFallback(true);
      renderer?.dispose();
      return undefined;
    }
  }, []);

  return (
    <FocusLensFigure
      ref={figureRef}
      role="img"
      aria-label={`${label}. Visual only; coaching facts remain in text.`}
      data-purpose="visual-only"
      data-fallback={fallback ? 'true' : 'false'}
    >
      <FocusLensCanvas ref={canvasRef} className="focus-lens-canvas" aria-hidden="true" />
      <FocusLensCaption>Focus lens</FocusLensCaption>
    </FocusLensFigure>
  );
};

export default CoachFocusLens;
