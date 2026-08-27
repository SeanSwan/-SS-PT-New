# PLAUD Official Sync Runbook

## Operating Decision

As of 2026-06-19, the preferred SwanStudios PLAUD ingestion path is the official Plaud CLI, not the third-party Applaud webhook/JWT path.

Primary flow:

1. Plaud device syncs recordings to the normal Plaud cloud account.
2. Sean's Windows machine runs `@plaud-ai/cli` with the official local Plaud login.
3. Swan's official sync launcher pulls recent recordings, downloads one audio file at a time, and posts to `POST /api/plaud/clips/upload`.
4. Swan stores each clip with `clip_source='plaud_official_sync'` and the Plaud recording id as `clip_external_id`.
5. The database unique index makes reruns idempotent, so the same Plaud recording is skipped instead of duplicated.
6. The existing PLAUD intake, merge, and workout review flow stays unchanged after upload.

## One-Time Plaud Login

```powershell
Set-Location "<REPO>"
npx --yes @plaud-ai/cli login
npx --yes @plaud-ai/cli me
```

If `me` returns `AUTH_FAILED Token invalid or expired. Run plaud login.`, rerun the login command. The Swan launcher does not scrape browser tokens.

## Manual Start

Use dry-run first when validating the local Plaud account and Startup flow. It checks Plaud auth and recent recordings, but it does not download audio, upload to Swan, or write sync state.

```powershell
Set-Location "<REPO>"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\launchers\Start-Swan-Plaud-Official-Sync.ps1 -Once -DryRun
```

When dry-run is clean, run the real uploader:

```powershell
Set-Location "<REPO>"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\launchers\Start-Swan-Plaud-Official-Sync.ps1
```

The launcher reuses a valid local Swan token when available, including the encrypted token stored by the older Applaud launcher. It never prints Swan auth tokens.

## Windows Startup

```powershell
Set-Location "<REPO>"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\launchers\Install-Swan-Plaud-Official-Autostart.ps1 -StartNow
node scripts\qa\check-plaud-official-sync.mjs
```

The installer disables old Applaud Startup entries by default so one recording is not uploaded through two sources. Pass `-KeepApplaudFallback` only when intentionally running the folder-export fallback.

## Health Check

```powershell
Set-Location "<REPO>"
node scripts\qa\check-plaud-official-sync.mjs --check-only
```

For a structure-only check that avoids the live Plaud CLI auth/network call:

```powershell
Set-Location "<REPO>"
node scripts\qa\check-plaud-official-sync.mjs --check-only --skip-plaud-cli
```

In this Codex sandbox, the full health checker may report child-process execution as `not_checked`; run the command without `--skip-plaud-cli` from normal PowerShell for the real local Plaud login status.

## Fallback

The old Applaud runbook remains at `docs/ai-workflow/references/PLAUD-APPLAUD-RUNBOOK.md`. Treat it as fallback/repair material for local exports, not the primary plan while the official Plaud CLI is available.
