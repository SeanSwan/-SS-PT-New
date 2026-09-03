/**
 * TriggerControl.jsx — the trigger, the fist, the reload: intent in, bullets out.
 *
 * Extracted from App.jsx (Fable 5.1 review, F3): App had grown to 351 lines carrying two frame
 * systems, a light and the scene. The split is by RESPONSIBILITY, not by line count — each file
 * now owns one job, and App owns only "what is in the world".
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { aim, PITCH_LIMIT } from '../player/aim.js';
import { useGameStore, usePlayerStore } from '../state/store.js';
import { FRAME_ORDER } from '../systems/frameOrder.js';
import {
  gun, weaponOf, recoilKick, spreadAfterShot, spreadAfterRest, currentCone, applySpread,
  canFire, ammoAfterShot, needsReload, startReload, finishReload, recoverDelay, holster,
  startSwap, finishSwap, equip,
} from './gunState.js';
import { SPRINT_OUT_SECONDS } from './weapons.js';

/** One scratch vector, reused every shot — allocating in a frame loop feeds the garbage collector. */
const _dirScratch = new Vector3();

/**
 * TriggerControl — hold to fire.
 *
 * TEACHING NOTE — THE TRIGGER IS A FRAME SYSTEM, NOT A CLICK HANDLER:
 * A click handler fires once per click; Overwatch/BF6 guns fire while HELD, at a fixed rate. So
 * mousedown/mouseup only record intent, and the frame loop is what actually pulls the trigger —
 * first shot instantly, then one every FIRE_INTERVAL. The decision itself is a hitscan from the
 * camera (see combat.js): the ray IS the shot; any tracer would be decoration.
 */
/** Seconds a fresh unlocked click must be held before it fires. The click that GRABS the aim
 *  (requests pointer lock) must not also be a bullet down the pre-aim ray — cold start, every
 *  Esc, every restart, the crosshair sits wherever it sat and the "free shot" reads as a hit the
 *  player never authored (GLM-Flash finding 2). While already locked, clicks fire instantly. In
 *  a browser that refuses lock (headless tests), the still-held button simply starts firing when
 *  the window lapses — which is why every trigger test holds longer than this. */
const ARM_SECONDS = 0.25;

function TriggerControl() {
  const { camera, gl } = useThree();
  const held = useRef(false);
  const lastShot = useRef(-Infinity);
  const armedAt = useRef(0);
  const wantReload = useRef(false);
  const seenRun = useRef(useGameStore.getState().runId);
  const wantSwap = useRef(false);
  const wantEquip = useRef(null);
  const wasSprinting = useRef(false);

  useEffect(() => {
    const canvas = gl.domElement;
    const down = (e) => {
      // RIGHT-CLICK IS AIM, NOT A FIST (Sean, playtest 3: "Who does punch as right click? That's
      // the F key. Right click is so you can zoom in when you actually get a scope"). Hold to aim
      // down sights: narrower FOV, slower mouse, tighter cone. It is the slot a real scope upgrades.
      if (e.button === 2) { gun.ads = true; return; }
      if (e.button !== 0) return;
      held.current = true;
      gun.firedThisPress = false; // a NEW press: a semi is allowed exactly one shot from here
      // An unlocked click is (also) the aim-grab — give the lock a beat before the gun believes it.
      armedAt.current = document.pointerLockElement === canvas ? 0 : performance.now() / 1000 + ARM_SECONDS;
    };
    const noMenu = (e) => e.preventDefault(); // right-click belongs to the sights, not the browser menu
    canvas.addEventListener('contextmenu', noMenu);
    const up = (e) => {
      if (e.button === 0) { held.current = false; gun.firedThisPress = false; }
      if (e.button === 2) gun.ads = false;
    };
    // THE PUNCH IS F. A key event, not a held state: one swing per press, and `repeat` is what stops
    // a leaned-on key from machine-gunning fists (the store's cooldown is the real gate, but a key
    // that fires 30 times a second would burn it on the first frame).
    const key = (e) => {
      if (e.repeat) return;
      if (e.code === 'KeyF') {
        const p = usePlayerStore.getState().position;
        useGameStore.getState().melee({ x: p.x, z: p.z }, aim.yaw);
      }
      // R reloads — but only records INTENT. The frame loop enters the state with ITS clock,
      // because the key handler's clock (performance.now) and the game's clock (R3F elapsedTime)
      // are different epochs: a reloadingUntil stamped from the wrong one is hours in the future
      // and the gun never finishes reloading. Same intent-vs-act split as the trigger itself.
      if (e.code === 'KeyR') wantReload.current = true;
      if (e.code === 'KeyQ') wantSwap.current = true;
      // Dev keys until wall-buys exist (S7): put a specific gun in your hands to test its feel.
      if (e.code === 'Digit1') wantEquip.current = 'sidearm-9';
      if (e.code === 'Digit2') wantEquip.current = 'fry-rifle';
    };
    // The keyboard has cleared its keys on window blur since Slice 2; the mouse path never did.
    // Alt-tab while firing left `held` true FOREVER (the mouseup lands on the other window), and
    // on refocus the gun fired autonomously with no button down (GLM-Flash finding 1). ADS is the
    // same bug in a second costume: alt-tab while aiming and you come back permanently zoomed.
    const blur = () => { held.current = false; gun.ads = false; };
    canvas.addEventListener('mousedown', down);
    document.addEventListener('mouseup', up);
    window.addEventListener('keydown', key);
    window.addEventListener('blur', blur);
    return () => {
      canvas.removeEventListener('mousedown', down);
      canvas.removeEventListener('contextmenu', noMenu);
      document.removeEventListener('mouseup', up);
      window.removeEventListener('keydown', key);
      window.removeEventListener('blur', blur);
    };
  }, [gl]);

  useFrame((state, delta) => {
    // Death opens the hand: without this, dying mid-burst leaves `held` true forever (the death
    // overlay swallows the mouseup) and "Go again" resumes firing uncommanded. shoot() itself
    // also refuses while over — belt AND braces, because they fail differently.
    // Death holsters the gun: hand open, sights down, cone closed, pattern back to the top. Without
    // the last two, "Go again" starts you with a blown-open crosshair and a mid-burst kick you did
    // not earn — the round is new, the gun should be too.
    // A NEW RUN holsters the gun, however it started (F6): death, or a reset that was never a
    // death. runId is the store's "this is a different run" signal; watching it means the trigger
    // no longer has to be told which paths count as an ending.
    const { over, runId } = useGameStore.getState();
    if (runId !== seenRun.current) { seenRun.current = runId; holster(gun); }
    if (over) { held.current = false; holster(gun); return; }
    const now = state.clock.elapsedTime;
    const fevered = useGameStore.getState().feverUntil > 0;
    // The cone shrinks back on its own once you stop shooting — the reward for firing in bursts.
    if (now - gun.lastShotAt > recoverDelay(gun)) gun.spread = spreadAfterRest(gun, delta);

    // --- Sprint-out (S5/G2): leaving a sprint costs a beat before the gun answers ---
    const sprintingNow = usePlayerStore.getState().position.sprinting ?? false;
    if (wasSprinting.current && !sprintingNow) gun.sprintOutUntil = now + SPRINT_OUT_SECONDS;
    if (sprintingNow) { gun.ads = false; gun.sprintOutUntil = now + SPRINT_OUT_SECONDS; }
    wasSprinting.current = sprintingNow;

    // --- Swap + dev equip (S5) ---
    if (wantEquip.current) { Object.assign(gun, equip(gun, wantEquip.current, now)); wantEquip.current = null; }
    if (wantSwap.current) { wantSwap.current = false; if (gun.swapUntil <= now) { Object.assign(gun, startSwap(gun, now)); if (gun.swapUntil) window.__swanSfx?.('swap'); } }
    if (gun.swapUntil > now) return;            // hands are busy
    if (gun.pendingSlot != null) Object.assign(gun, finishSwap(gun));

    // --- Ammo/reload state (Beyond-Zombies S1) ---
    if (wantReload.current) {
      wantReload.current = false;
      if (gun.reloadingUntil === 0) { gun.ads = false; Object.assign(gun, startReload(gun, now, fevered)); if (gun.reloadingUntil) window.__swanSfx?.('reload'); }
    }
    if (gun.reloadingUntil > 0) {
      // Sprinting holsters the ram-rod: the reload cancels with the mag exactly as it was —
      // startReload moved nothing, so cancelling is just forgetting the timer.
      if (usePlayerStore.getState().position.sprinting) { gun.reloadingUntil = 0; }
      else if (now >= gun.reloadingUntil) { Object.assign(gun, finishReload(gun)); }
      else return; // rounds move at the END; a reloading gun cannot fire
    }

    if (!held.current) return;
    if (performance.now() / 1000 < armedAt.current) return;
    if (!canFire(gun, now)) {
      // Dry trigger on an empty mag reloads by itself — the horde-game convention, because the
      // player is watching the window, not the counter.
      if (needsReload(gun)) { Object.assign(gun, startReload(gun, now, fevered)); window.__swanSfx?.('dryClick'); }
      return;
    }
    if (now - lastShot.current < weaponOf(gun).fireInterval) return;
    lastShot.current = now;
    Object.assign(gun, ammoAfterShot(gun));
    gun.firedThisPress = true; // a semi now waits for the trigger to be released
    if (typeof window !== 'undefined') window.__swanSfx?.('shot');

    // The bullet leaves inside the CONE, not down the exact crosshair ray. The cone is knowable
    // (it blooms per shot and is hard-capped — Sean: "make sure this spread has a limit, so it's
    // just not running everywhere all the time"); only the point inside it is random.
    const camDir = camera.getWorldDirection(_dirScratch);
    const dir = applySpread({ x: camDir.x, y: camDir.y, z: camDir.z }, currentCone(gun));
    useGameStore.getState().shoot(
      { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      dir,
    );

    // RECOIL AS A PATTERN, NOT A DICE ROLL (Sean: "when the gun kicks up, that's not just a random
    // kick up... weapons in BF6 have different kick to figure out how strong they are"). Shot N of
    // a burst always kicks the same way, so the gun can be LEARNED and pulled against; a pause
    // resets to the top of the pattern. Clamped by the pitch limit the mouse obeys.
    const kick = recoilKick(gun, now);
    aim.pitch = Math.min(aim.pitch + kick.pitch, PITCH_LIMIT);
    aim.yaw += kick.yaw;
    gun.burstIndex = kick.nextIndex;
    gun.spread = spreadAfterShot(gun);
    gun.lastShotAt = now;
    if (typeof window !== 'undefined') window.__swanShotsFired = (window.__swanShotsFired ?? 0) + 1;
  }, FRAME_ORDER.trigger);
  return null;
}

export default TriggerControl;
