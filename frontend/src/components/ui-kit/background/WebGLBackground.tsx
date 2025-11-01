// frontend/src/components/ui-kit/background/WebGLBackground.tsx

import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';

interface WebGLBackgroundProps {
  particleCount?: number;
  colorFrom?: string;
  colorTo?: string;
  interactive?: boolean;
  paused?: boolean;
  className?: string;
}

/**
 * WebGL Background Component
 *
 * Enhanced-tier background using WebGL for maximum performance and visual quality.
 * Renders GPU-accelerated particle system with 500+ particles at 60 FPS.
 *
 * Used when:
 * - Performance tier is 'enhanced'
 * - Device has high-end specs (≥4 cores, ≥4GB RAM)
 * - Network is fast (3G+)
 * - User has NOT enabled prefers-reduced-motion
 *
 * Performance targets:
 * - Desktop: ≤ 10% CPU, 60 FPS
 * - Mobile: ≤ 25% CPU, 30-60 FPS
 * - VRAM: < 100 MB
 *
 * @example
 * ```tsx
 * <WebGLBackground
 *   particleCount={500}
 *   colorFrom="#00ffff"
 *   colorTo="#7851a9"
 *   interactive
 * />
 * ```
 */
const WebGLBackground: React.FC<WebGLBackgroundProps> = ({
  particleCount = 500,
  colorFrom = '#00ffff',
  colorTo = '#7851a9',
  interactive = true,
  paused = false,
  className
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get WebGL context
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.warn('[WebGLBackground] WebGL not supported, falling back to Canvas');
      // TODO: Fallback to CanvasBackground
      return;
    }

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    /**
     * TODO: Full WebGL Implementation
     *
     * This is a placeholder. Full WebGL particle system will include:
     * 1. Vertex shader for particle position/velocity
     * 2. Fragment shader for particle color/glow
     * 3. Particle buffer initialization
     * 4. Mouse/touch interaction via uniform variables
     * 5. Optimized update loop using transform feedback
     * 6. Memory management (particle pooling)
     *
     * For now, we'll use a simple WebGL clear color as a placeholder.
     */

    // Convert hex colors to RGB
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255
          }
        : { r: 0, g: 1, b: 1 }; // Default cyan
    };

    const fromColor = hexToRgb(colorFrom);
    const toColor = hexToRgb(colorTo);

    // Simple animation loop (placeholder)
    let time = 0;
    const animate = () => {
      if (paused) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      time += 0.01;

      // Oscillate between colors
      const t = (Math.sin(time) + 1) / 2; // 0 to 1
      const r = fromColor.r + (toColor.r - fromColor.r) * t;
      const g = fromColor.g + (toColor.g - fromColor.g) * t;
      const b = fromColor.b + (toColor.b - fromColor.b) * t;

      // Clear canvas with animated color
      gl.clearColor(r * 0.1, g * 0.1, b * 0.1, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      /**
       * TODO: Render particle system here
       * - Update particle positions
       * - Draw particles using point sprites or instanced meshes
       * - Draw connections between nearby particles
       * - Apply glow/bloom post-processing
       */

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [particleCount, colorFrom, colorTo, interactive, paused]);

  return (
    <WebGLContainer className={className}>
      <canvas ref={canvasRef} />
      <PlaceholderNote>
        WebGL Enhanced Mode (Placeholder)
        <br />
        Full particle system coming soon
        <br />
        Particle Count: {particleCount} | Interactive: {interactive ? 'Yes' : 'No'}
      </PlaceholderNote>
    </WebGLContainer>
  );
};

const WebGLContainer = styled.div`
  position: absolute;
  inset: 0;
  z-index: -1;

  canvas {
    width: 100%;
    height: 100%;
    display: block;
  }
`;

const PlaceholderNote = styled.div`
  position: absolute;
  bottom: 20px;
  right: 20px;
  padding: 10px 15px;
  background: rgba(0, 0, 0, 0.7);
  color: rgba(255, 255, 255, 0.6);
  border-radius: 5px;
  font-size: 0.75rem;
  font-family: monospace;
  pointer-events: none;
  border: 1px solid rgba(255, 255, 255, 0.1);

  @media (max-width: 768px) {
    font-size: 0.65rem;
    padding: 8px 12px;
  }
`;

export default WebGLBackground;
