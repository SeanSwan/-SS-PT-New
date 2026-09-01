# Install-VideoUpscale.ps1 -- everything needed to take H3 video to 2K/4K, locally.
#
#   .\Install-VideoUpscale.ps1              what is missing (downloads nothing)
#   .\Install-VideoUpscale.ps1 -Download    fetch it
#
# NO CUSTOM NODES ARE NEEDED. ComfyUI 0.34.2 ships SeedVR2 (comfy_extras/nodes_seedvr.py, 5 nodes)
# and RIFE frame interpolation (comfy_extras/nodes_frame_interpolation.py) in CORE. The popular
# custom nodes for both are unnecessary here and two of them are actively broken on this exact stack
# (Python 3.13 + CUDA 13): Fannovel16's frame-interpolation pulls a cupy wheel that cannot build, and
# kijai's GIMM-VFI hardcodes cupy-cuda12x. Core is torch-only and immune. Weights only, below.
#
# WHY nvfp4. This 5090 reports supports_nvfp4_compute() = True -- Blackwell FP4 tensor cores. The
# nvfp4 builds are both the smallest AND the fastest here, which is the opposite of the usual
# size/quality tradeoff and is why most guides (written for older cards) recommend fp8 instead.
#
# WHY 4xNomosWebPhoto_RealPLKSR and not 4x-UltraSharp. The three ESRGAN models every tutorial names
# -- 4x-UltraSharp, 4x_foolhardy_Remacri, 4x-AnimeSharp -- are CC-BY-NC (NON-COMMERCIAL). SwanStudios
# is a commercial product. This one is CC-BY-4.0.

param([switch]$Download)

$ErrorActionPreference = 'Stop'
$base = 'Z:\AI-Weights\ComfyUI'

$items = @(
    @{ Repo='Comfy-Org/SeedVR2'; Path='diffusion_models/seedvr2_7b_nvfp4.safetensors'; Dir='diffusion_models'; MiB=4539; Note='SeedVR2 7B (nvfp4) - the quality model' },
    @{ Repo='Comfy-Org/SeedVR2'; Path='diffusion_models/seedvr2_3b_nvfp4.safetensors'; Dir='diffusion_models'; MiB=1904; Note='SeedVR2 3B (nvfp4) - fast draft pass' },
    @{ Repo='Comfy-Org/SeedVR2'; Path='vae/seedvr2_ema_vae_fp16.safetensors';          Dir='vae';              MiB=478;  Note='SeedVR2 VAE' },
    @{ Repo='Comfy-Org/frame_interpolation'; Path='frame_interpolation/rife_v4.25.safetensors'; Dir='frame_interpolation'; MiB=22; Note='RIFE 4.25 - 24fps to 48fps' }
)

# Not on Hugging Face; a direct release asset.
$esrgan = @{
    Url  = 'https://github.com/Phhofm/models/releases/download/4xNomosWebPhoto_RealPLKSR/4xNomosWebPhoto_RealPLKSR.pth'
    Dest = Join-Path $base 'upscale_models\4xNomosWebPhoto_RealPLKSR.pth'
    MiB  = 28
    Note = '4x photo upscaler (CC-BY-4.0, commercial-safe)'
}

if (-not (Test-Path -LiteralPath $base)) { throw "Shared weights library not found: $base (is Z: mounted?)" }

Write-Host ''
Write-Host "  target  $base   (extra_model_paths.yaml maps these folders; C: has ~146GB free, Z: ~715GB)"
Write-Host ''

$missing = @()
foreach ($i in $items) {
    $dest = Join-Path $base $i.Path
    if (Test-Path -LiteralPath $dest) {
        Write-Host ("  present  {0,-46} {1,6} MiB   {2}" -f (Split-Path -Leaf $i.Path), [math]::Round((Get-Item -LiteralPath $dest).Length/1MB), $i.Note)
    } else {
        Write-Host ("  MISSING  {0,-46} {1,6} MiB   {2}" -f (Split-Path -Leaf $i.Path), $i.MiB, $i.Note)
        $missing += $i
    }
}
$esrganMissing = -not (Test-Path -LiteralPath $esrgan.Dest)
if ($esrganMissing) { Write-Host ("  MISSING  {0,-46} {1,6} MiB   {2}" -f '4xNomosWebPhoto_RealPLKSR.pth', $esrgan.MiB, $esrgan.Note) }
else { Write-Host ("  present  {0,-46} {1,6} MiB   {2}" -f '4xNomosWebPhoto_RealPLKSR.pth', [math]::Round((Get-Item -LiteralPath $esrgan.Dest).Length/1MB), $esrgan.Note) }

# Hashtable keys are not properties: Measure-Object -Property cannot see them. Sum by hand.
$needMiB = 0
foreach ($m in $missing) { $needMiB += $m.MiB }
$__unused = 0

if ($esrganMissing) { $needMiB += $esrgan.MiB }

Write-Host ''
if ($needMiB -eq 0) {
    Write-Host '  Everything is here. Load "02 SWAN - Upscale to 2K-4K" from the ComfyUI Workflow browser.'
    Write-Host ''
    exit 0
}
Write-Host ("  {0} MiB to fetch." -f $needMiB)
if (-not $Download) { Write-Host '  DRY RUN -- re-run with -Download.'; Write-Host ''; exit 0 }

foreach ($i in $missing) {
    New-Item -ItemType Directory -Force -Path (Join-Path $base $i.Dir) | Out-Null
    Write-Host ''
    Write-Host ("  fetching {0} ({1} MiB)..." -f (Split-Path -Leaf $i.Path), $i.MiB)
    & hf download $i.Repo $i.Path --local-dir $base
    if ($LASTEXITCODE -ne 0) { throw "download failed: $($i.Path)" }
}

if ($esrganMissing) {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $esrgan.Dest) | Out-Null
    Write-Host ''
    Write-Host '  fetching 4xNomosWebPhoto_RealPLKSR.pth (28 MiB)...'
    Invoke-WebRequest -Uri $esrgan.Url -OutFile $esrgan.Dest -UseBasicParsing
}

Write-Host ''
Write-Host '  verifying:'
$bad = 0
foreach ($i in $items) {
    $dest = Join-Path $base $i.Path
    if (-not (Test-Path -LiteralPath $dest)) { Write-Host "  MISSING after download: $($i.Path)"; $bad++; continue }
    $mib = (Get-Item -LiteralPath $dest).Length / 1MB
    # A truncated download is the failure that looks like success: the file exists and ComfyUI fails
    # later with an unhelpful error. Within 3% of the published size, or it is not trusted.
    if ([math]::Abs($mib - $i.MiB) / $i.MiB -gt 0.03) { Write-Host ("  SIZE WRONG {0}: {1:N0} MiB, expected ~{2}" -f (Split-Path -Leaf $i.Path), $mib, $i.MiB); $bad++ }
    else { Write-Host ("  ok  {0,-46} {1,6:N0} MiB" -f (Split-Path -Leaf $i.Path), $mib) }
}
if (Test-Path -LiteralPath $esrgan.Dest) {
    $mib = (Get-Item -LiteralPath $esrgan.Dest).Length / 1MB
    if ([math]::Abs($mib - $esrgan.MiB) / $esrgan.MiB -gt 0.10) { Write-Host ("  SIZE WRONG esrgan: {0:N0} MiB" -f $mib); $bad++ }
    else { Write-Host ("  ok  {0,-46} {1,6:N0} MiB" -f '4xNomosWebPhoto_RealPLKSR.pth', $mib) }
} else { Write-Host '  MISSING after download: 4xNomosWebPhoto_RealPLKSR.pth'; $bad++ }

Write-Host ''
if ($bad) { Write-Host "  $bad file(s) missing or wrong size -- do NOT rely on this install."; exit 1 }
Write-Host '  Upscaling is installed. Restart ComfyUI and load "02 SWAN - Upscale to 2K-4K".'
Write-Host ''
exit 0
