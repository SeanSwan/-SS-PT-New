/**
 * SunLight.jsx — a sun that follows the player so the shadow box is never left behind.
 *
 * Extracted from App.jsx (Fable 5.1 review, F3): App had grown to 351 lines carrying two frame
 * systems, a light and the scene. The split is by RESPONSIBILITY, not by line count — each file
 * now owns one job, and App owns only "what is in the world".
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { usePlayerStore } from '../state/store.js';

/**
 * The sun follows the player, exactly as the floor does (see Ground.jsx) and for the same reason:
 * the shadow camera is a fixed box in the LIGHT's space, and anything that walks out of the box
 * simply stops casting a shadow — no error, no warning, the shadow just is not there. Anchoring
 * the box to the player means "inside the box" is always true. A directional light's DIRECTION is
 * what creates the shading, and direction is preserved: position and target move together.
 */
function SunLight() {
  const light = useRef();
  useFrame(() => {
    const p = usePlayerStore.getState().position;
    const l = light.current;
    if (!l) return;
    l.position.set(p.x + 12, 18, p.z + 8);
    l.target.position.set(p.x, 0, p.z);
    l.target.updateMatrixWorld();
  });
  return (
    <directionalLight
      ref={light}
      position={[12, 18, 8]}
      intensity={1.4}
      castShadow
      // The shadow camera is an orthographic box; anything outside it casts no shadow at all.
      // It must cover the play area, or monsters lose their shadow as they walk in.
      shadow-camera-left={-30}
      shadow-camera-right={30}
      shadow-camera-top={30}
      shadow-camera-bottom={-30}
      shadow-mapSize={[1024, 1024]}
    />
  );
}

export default SunLight;
