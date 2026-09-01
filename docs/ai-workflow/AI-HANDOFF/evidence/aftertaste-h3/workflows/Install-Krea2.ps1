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
$base = 'Z:\AI-Weights\ComfyUI'

$files = @(
    @{ Path = 'diffusion_models/krea2_turbo_fp8_scaled.safetensors'; Dir = 'diffusion_models'; GiB = 12.24; Note = 'the model (8-step Turbo, fp8)' },
    @{ Path = 'text_encoders/qwen3vl_4b_fp8_scaled.safetensors';     Dir = 'text_encoders';    GiB = 4.88;  Note = 'text encoder (Qwen3-VL 4B, fp8)' },
    @{ Path = 'vae/qwen_image_vae.safetensors';                      Dir = 'vae';              GiB = 0.24;  Note = 'VAE' }
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
$__unused = 0


Write-Host ''
if ($missing.Count -eq 0) {
    Write-Host "  Everything is here ($([math]::Round($haveGiB,2)) GiB). Load the Krea 2 template from the ComfyUI Workflow browser."
    Write-Host ''
    exit 0
}

$freeGiB = [math]::Round((Get-PSDrive -Name Z).Free / 1GB, 1)
Write-Host ("  {0} file(s) to fetch, {1} GiB. Free on Z: {2} GiB." -f $missing.Count, [math]::Round($needGiB,2), $freeGiB)
if ($freeGiB -lt ($needGiB * 1.2)) { throw "Not enough free space on Z: for $needGiB GiB." }

if (-not $Download) {
    Write-Host '  DRY RUN -- nothing downloaded. Re-run with -Download to fetch.'
    Write-Host ''
    exit 0
}

# `hf download` resumes a partial file and skips a complete one, so re-running after an interruption
# is safe and cheap.
foreach ($f in $missing) {
    $outDir = Join-Path $base $f.Dir
    New-Item -ItemType Directory -Force -Path $outDir | Out-Null
    Write-Host ''
    Write-Host ("  fetching {0} ({1} GiB)..." -f (Split-Path -Leaf $f.Path), $f.GiB)
    & hf download $repo $f.Path --local-dir $base
    if ($LASTEXITCODE -ne 0) { throw "download failed: $($f.Path)" }
}

Write-Host ''
Write-Host '  verifying what landed:'
$bad = 0
foreach ($f in $files) {
    $dest = Join-Path $base $f.Path
    if (-not (Test-Path -LiteralPath $dest)) { Write-Host "  MISSING after download: $($f.Path)"; $bad++; continue }
    $actual = (Get-Item -LiteralPath $dest).Length / 1GB
    # A truncated download is the failure that looks like success: the file exists, and ComfyUI fails
    # later with an unhelpful error. Within 2% of the published size, or it is not trusted.
    if ([math]::Abs($actual - $f.GiB) / $f.GiB -gt 0.02) {
        Write-Host ("  SIZE WRONG {0}: {1:N2} GiB, expected ~{2} GiB" -f (Split-Path -Leaf $f.Path), $actual, $f.GiB)
        $bad++
    } else {
        Write-Host ("  ok  {0,-52} {1:N2} GiB" -f (Split-Path -Leaf $f.Path), $actual)
    }
}

Write-Host ''
if ($bad) { Write-Host "  $bad file(s) are missing or the wrong size -- do NOT rely on this install."; exit 1 }
Write-Host '  Krea 2 is installed. Restart ComfyUI, then load the Krea 2 template from the Workflow browser.'
Write-Host '  Settings that matter: 8 steps, cfg 0.0, mu 1.15.'
Write-Host ''
exit 0
