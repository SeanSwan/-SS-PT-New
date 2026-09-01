# Skinned meshes and crowds — putting a real monster where a box was

**The one idea:** an animated model is not a shape, it is a shape *bound to an invisible skeleton*.
Everything that goes wrong when you put one in a game — and four things do — goes wrong at that
binding.

## What a skinned mesh actually is

The Fryling GLB carries three things:

1. **Geometry** — the triangles you see.
2. **A skeleton** — 3 bones (root/mid/tip). Bones are invisible; only their *effect* on the
   geometry shows. Each vertex knows which bones influence it and by how much ("skinning").
3. **Clips** — recorded bone motion (`idle`, `move`, `attack`, `hit`, `death`). A clip does not
   move the mesh. It moves the *bones*; the mesh follows because it is bound to them.

At runtime an **AnimationMixer** plays clips onto the skeleton, a little every frame. No mixer
update, no motion — the model stands in its bind pose forever, and that is not an error either.

## The four traps, in the order this slice met them

### 1. The server would not hand over the file

The GLB lives in the repo's asset directory — *outside* the game package — because that directory
is the single source of truth the manifest's sha256 describes. Vite refuses to serve files outside
its root unless `server.fs.allow` says otherwise. The tempting fix is copying the file into
`public/`, and it is wrong: a second copy is a second thing to keep in sync, silently.

### 2. `.clone()` shares the skeleton — the whole flock moves as one creature

Forty enemies each need their own Fryling. three.js's ordinary `.clone()` copies the mesh but keeps
pointing at the **original bones**. All forty then animate identically, driven by whichever mixer
ran last. No error. `SkeletonUtils.clone` duplicates the bone hierarchy too — it is the version
that means what you thought `.clone()` meant. Our browser test asserts every enemy's root bone is
distinct, so this cannot regress silently.

### 3. The model's origin is not where you think

The box was 1×1×1 *centred on its own origin*. The GLB measures 2×3×2 with its origin at a
**corner** — measured from the file's POSITION accessor, not guessed. Drop it in unadjusted and the
monster stands beside where the game thinks it is, and every collision looks unfair for a reason
you cannot see. The fix is a scale (to 1 unit tall) and an offset (half the footprint), applied
*inside* the Fryling component — the movement code never learns what the monster looks like.

### 4. Loading takes time, and React must be told what to show meanwhile

`useGLTF` **suspends**: the component literally pauses until the file arrives. Without a
`<Suspense>` boundary that pause propagates upward and blanks the scene. Ours falls back to the
Slice-3 box — so on a slow connection wave 1 opens with grey-box enemies that become Frylings when
the file lands. The grey-box is not dead code; it is the loading state.

## Shared materials — the flock that flashes together

Clones share materials too. Tint one enemy red-on-hit and *every* enemy flashes. Each Fryling
clones its material on mount: one material per monster, so damage-darkening stays per-monster.

## What you can now DO

Replace any grey-box in a scene with a rigged GLB: allow the file through the dev server, clone it
with `SkeletonUtils.clone`, correct origin/scale once inside the component, play a clip through the
mixer, and wrap the swap in `<Suspense>` with the box as fallback. And when a crowd all moves in
lockstep, you know which line to suspect first.
