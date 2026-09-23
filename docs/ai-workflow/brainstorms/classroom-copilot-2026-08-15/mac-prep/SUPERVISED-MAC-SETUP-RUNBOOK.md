# Supervised Mac Setup Runbook

This runbook prepares the target Mac without merging Sean's and the teacher's
brains. Every state-changing step is supervised, reversible, and follows a
read-only check. Stop on any red gate; do not improvise around it.

## 0. Hard stops

Do not continue beyond public/synthetic setup if any is true:

- director policy is not approved in writing;
- device ownership/MDM status is unresolved;
- Mac is Intel or below the supported OS floor;
- FileVault is off before real classroom use;
- a dedicated standard account is absent;
- H0 exists but its adoption/current state was not observed;
- exact model artifact, license, digest, or context capacity is unknown;
- an endpoint is public, unauthenticated, logs prompts, or accepts child content;
- a child name/roster/observation appears in the build folder or agent view.

## 1. Separate the build surface from classroom information

Use the dedicated standard macOS account. Create only these conceptual areas:

- `~/classroom-build/` — this public/synthetic setup package; Codex desktop may
  work here;
- the Hermes profile home — managed by Hermes and outside Desktop/Documents;
- any school-approved record location — never opened by Codex/Claude/Hermes
  tooling unless policy explicitly allows the exact use.

Cloud-connected desktop agents must never inspect a classroom notes folder,
roster, parent message, incident record, allergy roster, photo, or audio.

## 2. Collect facts before changing state

From the copied package:

```zsh
node scripts/classroom-hermes/mac-preflight.mjs > mac-preflight.safe.json
```

Review the safe JSON with Sean. Fill ownership, director policy, and H0 adoption
separately. Do not paste system dumps or account output into a cloud chat.

Acceptance: Apple Silicon, macOS 14+, enough free disk, ownership known, MDM
resolved, and H0/Hermes/Ollama presence recorded. Hardware does not select a
model by itself; it selects which benchmarks are permitted.

## 3. Protect the OS account

Using System Settings with Sean present:

1. Confirm the teacher uses a dedicated **standard** account; Sean retains the
   separate administrator account for maintenance.
2. Turn on FileVault and store the recovery key by the agreed offline method.
3. Require a password immediately after sleep/screen saver; test lock/restart.
4. Confirm the account's Desktop/Documents are not needed for Hermes storage.
5. Keep AirDrop receiving, Handoff, shared clipboard, and unnecessary sharing
   services off for the classroom account unless deliberately approved.
6. Turn on the macOS inbound application firewall.

Outbound default-deny requires an approved network-filter product or a separately
reviewed packet-filter policy; the built-in application firewall is primarily
inbound. Do not claim it proves outbound containment. Until that control exists,
the acceptance test uses Wi-Fi off plus local network capture, and remote lanes
remain disabled.

## 4. Preserve H0 before touching Hermes

If `h0Installed` is true:

- confirm the old H0 launcher still opens;
- record the model name/digest from the safe preflight;
- copy only the generic H0 setup assets/Modelfile to an encrypted local recovery
  location—never terminal history or child content;
- record accepted school days out of five and her actual feedback;
- do not delete, rename, recreate, or pull over the `classroom` model.

Print/preserve the H0 paper sheets first. The paper floor is part of the system,
not a consolation prize.

## 5. Install the local Hermes runtime, not a remote thin client

Architecture choice: Hermes Agent executes locally on her Mac so her profile,
memory, tools, and file authority remain hers. The 5090 supplies inference only;
it is not her Hermes host.

Current official macOS route:

1. Open the official [Hermes installation documentation](https://hermes-agent.nousresearch.com/docs/).
2. Download the official `install.sh` to a build-only file, inspect its source and
   SHA-256, then run it only after Sean approves the observed bytes. Do not pipe
   an unseen changing script directly into a privileged shell.
3. Do not use Homebrew, PyPI, or Intel macOS; current official platform support
   does not support those routes.
4. Do not rely on the public Desktop DMG for “connect to existing Hermes.” An
   open upstream issue reports the advertised artifact predates that onboarding.

Verification (no `--fix`, no `--live`):

```zsh
hermes --version
hermes doctor
hermes status
```

Save only pass/fail/version receipts, not logs containing profile paths or
credentials. `hermes doctor --live` is forbidden during this local-only phase.

## 6. Install her isolated profile bundle

Review `profile/distribution.yaml`, `SOUL.md`, the skill, and configuration
template. From this package's `mac-prep` directory:

```zsh
hermes profile install ./profile --name classroom-teacher --alias
classroom-teacher config set terminal.home_mode profile
classroom-teacher fallback clear
classroom-teacher doctor
```

The local install prompt must show only `SOUL.md`, the classroom-planning skill,
and its reference. No `.env`, tokens, Sean memory, session database, MCP file,
cron job, or browser configuration is distributed.

Use `classroom-teacher tools` to disable every network, browser, voice,
messaging, terminal, file-write, computer-use, MCP, delegation, and scheduled
tool initially. Re-enable one capability at a time only after a synthetic test,
least-access review, and revoke test.

Profile home proof:

```zsh
classroom-teacher profile show classroom-teacher
```

Confirm its home is the teacher profile—not Sean's default—and no other process
uses it. With the observed path in a quoted variable, add a local Spotlight
marker and Time Machine exclusion under supervision, then verify both. Never run
these commands against an unresolved path.

## 7. Select an inference lane after measurement

Hermes currently requires at least 64K effective context for agent use. The
configured server and Hermes must agree; verify the effective Ollama `CONTEXT`
column with `ollama ps` during a benchmark.

- Existing H0 passes 64K/tool benchmark: it may become Hermes' local engine.
- H0 fails but remains useful: keep it behind local mode; use template-only
  offline floor and the 5090 for generic Hermes work.
- No local model passes comfortably: do not install a bigger model by optimism.
- Qwen 3.8 27B: never Mac default; exact tag/license/digest must be observed on
  the 5090 before it is named in runtime config.

Configure providers through `classroom-teacher model`, not by copying Sean's
`.env` or config. No cloud-provider key and no fallback chain is installed.

## 8. Install the one front door

Copy `mac/classroom-hermes.command` to a teacher-approved location, mark it
executable, and add only that launcher to the Dock/Desktop. It offers mutually
exclusive local, general-planning, and paper modes. General mode requires the
explicit PUBLIC confirmation; no silent remote fallback exists.

Keep the old H0 launcher available but out of the main path until the retirement
gate in `H0-WRAP-DECISION.md` passes.

## 9. Add the 5090 route only after its own gate

Required evidence before configuration:

- private overlay identity for her device and individual revocation;
- endpoint bound to private overlay only, HTTPS plus application authentication;
- exact allowed model tag/license/digest;
- no public reachability;
- prompt/body logging disabled and purge sweep verified;
- exact structured generic request contract;
- synthetic canary sent while traffic is captured;
- endpoint rejects arbitrary narrative and child-specific classifications.

The Mac runs Hermes; the 5090 runs inference. Do not point Desktop at Sean's
remote Hermes gateway, because remote mode executes tools/files on that host and
would blur her separate brain.

## 10. SwanGuard and Radar

Create her own identity with the same SwanGuard permissions Sean approved, plus
individual audit and revocation. The opportunity schema physically rejects
child fields. Radar uses controlled queries and structured cards only. No parent
or school email enters the dedicated deals/research inbox.

Marketplace actions remain human-native: saved searches, notifications, open the
listing, paste/save a link, human review, human contact/purchase.

## 11. Acceptance matrix

- Wi-Fi off: local/paper mode works; no cloud fallback appears.
- 5090 off/unreachable: one clear message, then local/paper floor.
- synthetic daily card prints and reads in 90 seconds or less.
- five cards reuse one core with small variations.
- daily card has no deal, voice, or child observation field.
- allergy test catches a synthetic match and emits no student key.
- Radar rejects free-text query and raw HTML.
- SwanGuard rejects a synthetic child field.
- generic 5090 envelope accepts; all 50 hostile envelopes reject.
- second process/profile cannot write the same Hermes home.
- revoke the Mac's 5090 and SwanGuard identities; access immediately fails.
- restore the prior launcher/profile from the recovery copy.

## 12. Stop/rollback

On any unexpected network request, child-content prompt, tool access, memory
write, wrong profile, or model fallback: disconnect networking, stop the session,
preserve only non-PII evidence, revoke device credentials, and follow
`OPERATIONS-ROLLBACK-AND-RETENTION.md`. Do not “try again” with live data.

