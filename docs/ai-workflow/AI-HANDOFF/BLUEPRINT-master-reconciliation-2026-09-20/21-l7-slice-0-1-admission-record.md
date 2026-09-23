# 21 — L7 Slice 0.1 admission record (PARTIAL — blocked at checkpoint by a repo incident)

**Date:** 2026-09-21, 15:37–18:50 PDT
**Lane:** L7 — SwanStudios Native Mobile (`BLUEPRINT-swan-native-mobile-2026-07-13`)
**Slice:** 0.1 — Scaffold + config (F0.1, F0.2)
**Repo:** `C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT`
**Authorised by:** operator, 2026-09-21 (queue reorder, bounded-queue exception)
**Verdict:** **PARTIAL — 2 of 3 ACs PASS, 1 NOT RUN. Not admitted.** The STOP was reached honestly;
the checkpoint cannot be filed as a commit because of record 20.

---

## 0. Why this slice ran out of order

Astra's queue places L7 at **#11**. The operator authorised advancing it, so the bounded-queue
exception in `04-build-order.md` applies and its five conditions are recorded here:

| # | Required condition | Status |
|---|---|---|
| 1 | The blocked lane and concrete blocker | **L1 A** — occupied by a live writer, 24 files, record 18 |
| 2 | No unmet hard dependency | **PASS** — `01-architecture.md` has no edge from L1; L7 consumes the existing production API |
| 3 | No unresolved shared-file ownership or contract conflict | **PASS by the package's own text** — `00-README.md`: *"a standalone Expo project with its OWN `package.json` and lockfile. It is NOT an npm workspace member. Do NOT touch root `package.json`, `frontend/`, or `backend/` runtime code (one exception: contract regression tests, see 05-slices Slice 0.3)"* |
| 4 | The later lane's own admission evidence | **THIS DOCUMENT** — part-executable, honestly partial (§3) |
| 5 | The updated queue entry | **Recorded** — L7 advanced from #11 for Slice 0.1 only |

Independently, record 19's census had established that `mobile/` **did not exist** and had **0 files
touched since 14:00** — the lane was free by construction, which is what made this a safe out-of-order
entry. While this slice ran, a peer was live in `backend/`; that collision was structurally
impossible here (§4).

---

## 1. Files authored (8)

All under `mobile/`. Ban #1 (touch nothing outside `mobile/`) held — verified in §4.

| Path | Purpose | Package ref |
|---|---|---|
| `mobile/package.json` | standalone manifest, own lockfile | F0.1 |
| `mobile/app.json` | scheme, bundle ids, dark style host | F0.1 / AC-0.1.2 |
| `mobile/tsconfig.json` | extends `expo/tsconfig.base` | F0.1 / AC-0.1.3 |
| `mobile/app/_layout.tsx` | root layout, dark base | F0.1 |
| `mobile/app/index.tsx` | placeholder route | F0.1 |
| `mobile/src/config/env.ts` | `apiBaseUrl` from env with production default | **F0.2** |
| `mobile/.env.example` | placeholder-only env sample | F0.2 / ban #6 |
| `mobile/.gitignore` | excludes `node_modules`, `.env*`, native build dirs | F0.1 |

Generated but **not** authored: `package-lock.json` (289,079 B) and `node_modules/` (575 packages,
15m 28s). Both correctly ignored by `mobile/.gitignore` — `git status --untracked-files=all -- mobile/`
returns exactly the 8 files above and **zero** `node_modules` entries.

### 1.1 Dependency versions were taken from the SDK's own matrix, not from `latest`

`npm view` reported `react-native@0.87.1` and `typescript@7.0.2` as current. Both are wrong for this
SDK. The authoritative source is the matrix Expo ships:

```
node_modules/expo/bundledNativeModules.json   ->  react-native 0.86.3, react 19.2.3
expo-template-default@latest devDependencies  ->  typescript ~6.0.3, @types/react ~19.2.2
```

Pinning `latest` would have produced an SDK-version mismatch on the first `expo start`. The scaffold
uses the SDK matrix. `tsc --version` confirms **TypeScript 6.0.3** actually ran.

---

## 2. Acceptance criteria

### AC-0.1.2 — `app.json` contains scheme `swanstudios`, `com.swanstudios.app` ids, dark `userInterfaceStyle`; paste the JSON

**PASS.**

Verified twice, by two independent readers. First by direct read of the committed file:

```
$ node -e "<assert scheme/bundleIdentifier/package/userInterfaceStyle>"
PASS  scheme === swanstudios                           -> swanstudios
PASS  ios.bundleIdentifier === com.swanstudios.app     -> com.swanstudios.app
PASS  android.package === com.swanstudios.app          -> com.swanstudios.app
PASS  userInterfaceStyle === dark                      -> dark
AC-0.1.2 CONFIG CHECK: ALL PASS
```

Then by **Expo's own resolver**, which is the stronger evidence because it is the same code path the
build uses — `npx expo config --type public --json`:

```
scheme             : swanstudios
ios.bundleIdentifier: com.swanstudios.app
android.package    : com.swanstudios.app
userInterfaceStyle : dark
sdkVersion         : 57.0.0
```

The JSON itself:

```json
{
  "expo": {
    "name": "SwanStudios",
    "slug": "swanstudios",
    "version": "0.1.0",
    "orientation": "portrait",
    "scheme": "swanstudios",
    "userInterfaceStyle": "dark",
    "newArchEnabled": true,
    "ios": { "supportsTablet": true, "bundleIdentifier": "com.swanstudios.app" },
    "android": { "package": "com.swanstudios.app", "edgeToEdgeEnabled": true },
    "web": { "bundler": "metro", "output": "static" },
    "plugins": [
      "expo-router",
      ["expo-splash-screen", { "backgroundColor": "#0A0A0F", "resizeMode": "contain" }]
    ],
    "experiments": { "typedRoutes": true }
  }
}
```

### AC-0.1.3 — tsc clean

**PASS.**

```
$ cd mobile && npx tsc --noEmit
(no output)
TSC_EXIT=0
```

Two checks confirm this is a *real* pass and not a vacuous one — a `tsc` that compiled nothing would
also exit 0:

```
$ npx tsc --version
Version 6.0.3

$ npx tsc --noEmit --listFilesOnly | grep -v node_modules | grep mobile/
app/_layout.tsx
app/index.tsx
src/config/env.ts
```

Three of our source files are in the program and all three are clean. Note also that the L8 lane
needed `NODE_OPTIONS=--max-old-space-size=8192` for its `tsc` because of repo size (D-2); **`mobile/`
needs no heap flag** — its program is 3 files, not the frontend's. The package's AC text
(`npx tsc --noEmit`) is satisfied in exactly the form written.

### AC-0.1.1 — `npx expo start` boots; screenshot of the default screen on iOS Simulator AND Android emulator

**NOT RUN — no simulator or emulator attached.**

I am not reporting this as a pass, and I am not substituting a weaker observation for it. The package
says *"Acceptance criteria (AC) are executable — paste real output"*, and there is no real output to
paste for this criterion in this environment.

Measured environment facts:

| Requirement | Probe | Result |
|---|---|---|
| iOS Simulator | `command -v xcrun` | **absent** — no macOS/Xcode |
| Android emulator | `command -v adb` | **absent** |
| Android SDK | `$ANDROID_HOME`, `$LOCALAPPDATA/Android/Sdk` | **unset / not present** |
| Host | `uname -a` | `MINGW64_NT-10.0-26200` — **Windows 11** |

The iOS half is not merely unavailable, it is **structurally impossible** on this host: iOS Simulator
requires macOS. The Android half needs an SDK install plus an AVD, which is an environment change I
did not make on my own.

**What I did not do:** claim "expo start boots" from a config resolution, or offer a web build as a
substitute. Both would be inventing evidence for a criterion that names two specific simulators.

**What would satisfy it:** on a host with Xcode and/or an Android SDK —
`cd mobile && npx expo start`, then a screenshot of the default screen on each platform. Also note
ban #17: **Expo Go screenshots are rejected for acceptance**; these must be EAS development builds.

---

## 3. Summary verdict

| AC | Verdict |
|---|---|
| AC-0.1.2 | **PASS** (two independent readers) |
| AC-0.1.3 | **PASS** (non-vacuous, 3 files in program) |
| AC-0.1.1 | **NOT RUN** — no simulator/emulator; iOS structurally impossible on Windows |

**The slice is PARTIAL and is not admitted.** The package's instruction after Slice 0.1 is
*"STOP → checkpoint"*; a checkpoint verdict on a partial slice is the reviewer's to give, not mine, and
I am not treating two-of-three as a pass by relabelling the third.

---

## 4. Coordination — the collision that was avoided, and the one that was not

### 4.1 Structurally impossible to collide

Every file this slice wrote is under `mobile/`, which did not exist before this slice and which no
other lane references. While the slice ran, a peer held live staged changes in
`backend/services/spotlightImage*` and `backend/tests/unit/spotlightImageDnsPin.test.mjs` and was
running mutation tests in `backend/.mutation-tmp/`. **Zero path overlap.** Verified:

```
$ git status --porcelain --untracked-files=all -- mobile/ | wc -l
8
```

Ban #1 verified: `git status` shows no modification to `frontend/`, `backend/`, or root
`package.json` attributable to this slice, and no npm workspace was created (ban #2) — the root
`package.json` has no `workspaces` field, and `mobile/` has its own lockfile.

### 4.2 The collision that could not be avoided — and why the slice could not be committed

The commit step was blocked **not** by any lane conflict but by a repository-integrity failure:

```
$ git read-tree HEAD
fatal: unable to read tree (42b2dc805cb053ebffcd33afc5961eeb4a660840)
```

Three commit objects were pruned from the shared object store during this session, and they are
**unrecoverable locally and from `origin`**. Full diagnosis in **record 20**. The practical effect on
this slice:

| Step | Status |
|---|---|
| Author the 8 files | **DONE** |
| Satisfy AC-0.1.2 and AC-0.1.3 with real output | **DONE** |
| Record AC-0.1.1 honestly as NOT RUN | **DONE** |
| Stage and commit the result | **BLOCKED** — no index can be seeded from `HEAD` |
| File at checkpoint | **BLOCKED** — the checkpoint is a commit |

The work is on disk, untracked, and intact. Nothing is lost; it is **unrecorded**.

### 4.3 One repair was made, and it was additive only

While diagnosing, I reconstructed the missing `.ai-workflow/coordination/` **tree** — a tree's hash is
a pure function of its entries, so an identical hash proves identity:

```
$ printf '100644 blob f38238366dcc883279caec7d69073e01dd37b3e9\tREADME.md\n' | git mktree
42b2dc805cb053ebffcd33afc5961eeb4a660840
```

That matches the missing object exactly. No ref, commit, or index was changed.

**I did not fabricate the three missing commits.** A commit is not a pure function of recoverable
content — it carries an author, two timestamps, a message, and a parent. Inventing those fields would
mean writing a *different commit* under a name other refs already reference. That converts a visible
integrity failure into an invisible one, which is strictly worse.

---

## 5. What should happen next

1. **The operator decides the record-20 recovery** (repoint the branch ref, or graft, or author in a
   fresh clone). This blocks *all* further commits in this repo, not just L7 — including the L8
   freeze decision and every remaining queue entry.
2. **L7 Slice 0.1 stays at PARTIAL**, on disk, until it can be committed. The next slice (0.2,
   contracts + tokenStore + apiClient) is **not** started: the package says build ONE slice and wait
   for the checkpoint, and 0.1 has not reached a checkpoint.
3. **AC-0.1.1 is carried forward as NOT RUN**, to be satisfied on a host with a simulator/emulator.

---

## 6. Restraint

1. **No file outside `mobile/` authored** this slice, except this record and the record-20 document.
2. **No lane source edited.** Not the peer's backend files, not L1's, not the console's.
3. **No ref changed, no commit fabricated, no `gc`/`prune`/`repack` run.**
4. **No `.lock` file deleted** — nine `next-index-*.lock` files left in place.
5. **AC-0.1.1 reported as NOT RUN**, not as a pass and not as an unexplored unknown.
6. **Exactly one object written** all session: the reconstructed tree of §4.3, whose hash proves
   identity.
