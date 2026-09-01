# Install-Krea2.ps1 -- fetch Krea 2 for LOCAL inference in this ComfyUI.
#
#   .\Install-Krea2.ps1              what it would download, and what is already here (downloads nothing)
#   .\Install-Krea2.ps1 -Download    fetch what is missing
#
# WHY THESE FILES. Krea 2 ships in two places. `krea/Krea-2-Raw` is licence-gated (instant auto-accept,
# but it needs a logged-in HF account) and carries the SAME weights twice -- a single 24.5 GiB file plus
# a sharded diffusers copy -- so a naive clone costs ~49 GiB for 24.5 GiB of model. `Comfy-Org/Krea-2`
# is NOT gated and ships ComfyUI-ready quantizations. This script uses the Comfy-Org repo.
#
# fp8_scaled is the default rather than NVFP4: NVFP4 is Blackwell-native and smaller (7.15 GiB), but
# it has an open ComfyUI loading issue on the 5090 and sources disagree about whether it needs an
# extra backend. Treat NVFP4 as a speed experiment AFTER fp8 is proven working, not as the baseline.
#
# WEIGHTS GO TO Z:. extra_model_paths.yaml maps diffusion_models/text_encoders/vae to
# Z:\AI-Weights\ComfyUI\. C: has ~146 GB free and is the system drive; Z: has ~715 GB.
#
# TRAINING IS A SEPARATE INSTALL, deliberately -- see Install-Krea2-Training-NOTES.md next to this file.
# Do NOT downgrade this ComfyUI's PyTorch to train.

param([switch]$Download)

$ErrorActionPreference = 'Stop'
$repo = 'Comfy-Org/Krea-2'
# Pinned to the exact repo commit the SHA-256 digests were read from, so a future upstream
# re-upload cannot silently change what this script fetches (the digests would catch it, but
# pinning fails faster and names the cause).
$revision = 'e5ea8b4dd7f38f348b138eb0fe29f92c0e367e96'
$base = 'Z:\AI-Weights\ComfyUI'

# Hash-verify a list of entries (Path + Sha); returns the number of bad files.
function Test-SwanWeights($entries) {
    $bad = 0
    foreach ($f in $entries) {
        $dest = Join-Path $base $f.Path
        if (-not (Test-Path -LiteralPath $dest)) { Write-Host "  MISSING: $($f.Path)"; $bad++; continue }
        $got = (Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash.ToLower()
        if ($got -ne $f.Sha) {
            Write-Host ("  SHA MISMATCH {0}" -f (Split-Path -Leaf $f.Path))
            Write-Host ("    expected {0}" -f $f.Sha)
            Write-Host ("    got      {0}" -f $got)
            Write-Host ("    fix: Remove-Item -LiteralPath '{0}' ; re-run with -Download" -f $dest)
            Write-Host  '         (hf download skips a full-length file, so a corrupted one is never re-fetched on its own)'
            $bad++
        } else {
            Write-Host ("  ok  {0,-52} sha256 {1}..." -f (Split-Path -Leaf $f.Path), $got.Substring(0,16))
        }
    }
    return $bad
}

$files = @(
    @{ Path = 'diffusion_models/krea2_turbo_fp8_scaled.safetensors'; Dir = 'diffusion_models'; GiB = 12.24; Sha = 'eb4dd8c612cfd10f64f25b057e6e6bbcb5737c94a7372177e456dbf7579502f1'; Note = 'the model (8-step Turbo, fp8)' },
    @{ Path = 'text_encoders/qwen3vl_4b_fp8_scaled.safetensors';     Dir = 'text_encoders';    GiB = 4.88;  Sha = '54bd5144df0bbc25dd6ccadfcb826b521445a1b06ae5a42570bdd2974ca87094'; Note = 'text encoder (Qwen3-VL 4B, fp8)' },
    @{ Path = 'vae/qwen_image_vae.safetensors';                      Dir = 'vae';              GiB = 0.24;  Sha = 'a70580f0213e67967ee9c95f05bb400e8fb08307e017a924bf3441223e023d1f'; Note = 'VAE' }
)

if (-not (Test-Path -LiteralPath $base)) { throw "Shared weights library not found: $base (is Z: mounted?)" }

Write-Host ''
Write-Host "  repo    $repo  (not licence-gated)"
Write-Host "  target  $base"
Write-Host ''

$missing = @()
$haveGiB = 0.0
foreach ($f in $files) {
    $dest = Join-Path $base $f.Path
    if (Test-Path -LiteralPath $dest) {
        $actual = [math]::Round((Get-Item -LiteralPath $dest).Length / 1GB, 2)
        Write-Host ("  present  {0,-52} {1,6} GiB   {2}" -f (Split-Path -Leaf $f.Path), $actual, $f.Note)
        $haveGiB += $actual
    } else {
        Write-Host ("  MISSING  {0,-52} {1,6} GiB   {2}" -f (Split-Path -Leaf $f.Path), $f.GiB, $f.Note)
        $missing += $f
    }
}

# Hashtable keys are not properties: Measure-Object -Property cannot see them. Sum by hand.
$needGiB = 0.0
foreach ($m in $missing) { $needGiB += $m.GiB }

Write-Host ''
if ($missing.Count -eq 0) {
    # Nothing to download - but STILL verify. An install that is never re-checked rots silently: a
    # half-written resume, a bad sector, or a substituted file all leave the right filenames in
    # place. This script used to exit here without hashing anything.
    Write-Host "  Nothing to download ($([math]::Round($haveGiB,2)) GiB present). Checking what is already here."
    $VerifyOnly = $true
} else {
    $freeGiB = [math]::Round((Get-PSDrive -Name Z).Free / 1GB, 1)
    Write-Host ("  {0} file(s) to fetch, {1} GiB. Free on Z: {2} GiB." -f $missing.Count, [math]::Round($needGiB,2), $freeGiB)
    if ($freeGiB -lt ($needGiB * 1.2)) { throw "Not enough free space on Z: for $needGiB GiB." }

    if (-not $Download) {
        # A dry run on a PARTIAL install still hash-checks whatever is already here. Exiting
        # without verifying present files is exactly the rot scenario the verify step exists for.
        $present = @($files | Where-Object { Test-Path -LiteralPath (Join-Path $base $_.Path) })
        if ($present.Count -gt 0) {
            Write-Host '  verifying the files that are already here (SHA-256):'
            $preBad = Test-SwanWeights $present
            if ($preBad) { Write-Host ''; Write-Host "  $preBad present file(s) FAILED SHA-256 -- fix before downloading the rest."; exit 1 }
        }
        Write-Host '  DRY RUN -- nothing downloaded. Re-run with -Download to fetch.'
        Write-Host ''
        exit 0
    }
    $VerifyOnly = $false
}

# `hf download` resumes a partial file and skips a complete one, so re-running after an interruption
# is safe and cheap.
if (-not $VerifyOnly) {
foreach ($f in $missing) {
    $outDir = Join-Path $base $f.Dir
    New-Item -ItemType Directory -Force -Path $outDir | Out-Null
    Write-Host ''
    Write-Host ("  fetching {0} ({1} GiB)..." -f (Split-Path -Leaf $f.Path), $f.GiB)
    & hf download $repo $f.Path --revision $revision --local-dir $base
    if ($LASTEXITCODE -ne 0) { throw "download failed: $($f.Path)" }
}
}

Write-Host ''
Write-Host '  verifying by SHA-256 (identity, not approximate size):'
# This used to accept a file whose size was within 2% of the published figure. Size is not identity:
# it accepts a corrupted file of the right length, a resumed download that raced, and any substituted
# artifact of similar size. Hugging Face publishes the SHA-256 as the LFS oid, so there is no reason
# to guess. Digests above were read from the HF paths-info API for Comfy-Org/Krea-2 on 2026-09-01.
$bad = Test-SwanWeights $files

Write-Host ''
if ($bad) { Write-Host "  $bad file(s) missing or failed SHA-256 -- do NOT rely on this install."; exit 1 }
Write-Host '  Krea 2 is installed. Load "04 SWAN - Krea2 - Character Stills" from the Workflows panel.'
Write-Host '  Settings that matter: 8 steps, cfg 1.0, euler / simple. Negative is automatic'
Write-Host '  (ConditioningZeroOut). There is no mu knob in the local ComfyUI graph.'
Write-Host ''
exit 0
