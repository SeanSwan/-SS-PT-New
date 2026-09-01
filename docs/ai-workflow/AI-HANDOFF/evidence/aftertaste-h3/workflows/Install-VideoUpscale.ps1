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

# Pinned to the exact repo commits the SHA-256 digests were read from, so an upstream re-upload
# cannot silently change what this script fetches.
$revisions = @{
    'Comfy-Org/SeedVR2'             = '673340c8a66db62b84e4099def7d01d337ae12dc'
    'Comfy-Org/frame_interpolation' = '9bca6366a22473ccee25602fa82b224d78413960'
}

$items = @(
    @{ Repo='Comfy-Org/SeedVR2'; Path='diffusion_models/seedvr2_7b_nvfp4.safetensors'; Dir='diffusion_models'; MiB=4539; Sha='cc4af1a7bd5377066496f393555478323e806fa21163bdbe3409451aface9b93'; Note='SeedVR2 7B (nvfp4) - the quality model' },
    @{ Repo='Comfy-Org/SeedVR2'; Path='diffusion_models/seedvr2_3b_nvfp4.safetensors'; Dir='diffusion_models'; MiB=1904; Sha='c8dea38b04d43295621726e2cd371c0d2d001006169c113aea17950f2cb2e295'; Note='SeedVR2 3B (nvfp4) - fast draft pass' },
    @{ Repo='Comfy-Org/SeedVR2'; Path='vae/seedvr2_ema_vae_fp16.safetensors';          Dir='vae';              MiB=478;  Sha='20678548f420d98d26f11442d3528f8b8c94e57ee046ef93dbb7633da8612ca1'; Note='SeedVR2 VAE' },
    @{ Repo='Comfy-Org/frame_interpolation'; Path='frame_interpolation/rife_v4.25.safetensors'; Dir='frame_interpolation'; MiB=22; Sha='1505884b9bdae956795430d2a70f7e2317b2abd8f130f8cfdb35a5759f909481'; Note='RIFE 4.25 - 24fps to 48fps' }
)

# Not on Hugging Face; a direct release asset.
$esrgan = @{
    Url  = 'https://github.com/Phhofm/models/releases/download/4xNomosWebPhoto_RealPLKSR/4xNomosWebPhoto_RealPLKSR.pth'
    Dest = Join-Path $base 'upscale_models\4xNomosWebPhoto_RealPLKSR.pth'
    MiB  = 28
    Sha  = 'a9db66c9b674c6a5025b6ef3bee71a57c33b8605d8a2de0980470f89002efbbe'
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
if ($esrganMissing) { $needMiB += $esrgan.MiB }

Write-Host ''
if ($needMiB -eq 0) {
    # Nothing to download - but STILL verify. An install that is never re-checked rots silently: a
    # half-written resume, a bad sector, or a substituted file all leave the right filenames in
    # place. This branch used to exit here without hashing anything.
    Write-Host '  Nothing to download. Checking what is already here.'
    $VerifyOnly = $true
} else {
    Write-Host ("  {0} MiB to fetch." -f $needMiB)
    if (-not $Download) {
        # A dry run on a PARTIAL install still hash-checks whatever is already here -- exiting
        # without verifying present files is exactly the rot scenario the verify step exists for.
        $present = @()
        foreach ($i in $items) { $d = Join-Path $base $i.Path; if (Test-Path -LiteralPath $d) { $present += @{ Dest=$d; Name=(Split-Path -Leaf $i.Path); Sha=$i.Sha } } }
        if (-not $esrganMissing) { $present += @{ Dest=$esrgan.Dest; Name='4xNomosWebPhoto_RealPLKSR.pth'; Sha=$esrgan.Sha } }
        if ($present.Count -gt 0) {
            Write-Host '  verifying the files that are already here (SHA-256):'
            $preBad = 0
            foreach ($a in $present) {
                $got = (Get-FileHash -LiteralPath $a.Dest -Algorithm SHA256).Hash.ToLower()
                if ($got -ne $a.Sha) { Write-Host ("  SHA MISMATCH {0}  (fix: Remove-Item -LiteralPath '{1}' ; re-run -Download)" -f $a.Name, $a.Dest); $preBad++ }
                else { Write-Host ("  ok  {0,-46} sha256 {1}..." -f $a.Name, $got.Substring(0,16)) }
            }
            if ($preBad) { Write-Host ''; Write-Host "  $preBad present file(s) FAILED SHA-256 -- fix before downloading the rest."; exit 1 }
        }
        Write-Host '  DRY RUN -- re-run with -Download.'; Write-Host ''; exit 0
    }
    $VerifyOnly = $false
}

if (-not $VerifyOnly) {
foreach ($i in $missing) {
    New-Item -ItemType Directory -Force -Path (Join-Path $base $i.Dir) | Out-Null
    Write-Host ''
    Write-Host ("  fetching {0} ({1} MiB)..." -f (Split-Path -Leaf $i.Path), $i.MiB)
    & hf download $i.Repo $i.Path --revision $revisions[$i.Repo] --local-dir $base
    if ($LASTEXITCODE -ne 0) { throw "download failed: $($i.Path)" }
}

if ($esrganMissing) {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $esrgan.Dest) | Out-Null
    Write-Host ''
    Write-Host '  fetching 4xNomosWebPhoto_RealPLKSR.pth (28 MiB)...'
    Invoke-WebRequest -Uri $esrgan.Url -OutFile $esrgan.Dest -UseBasicParsing
}
}

Write-Host ''
Write-Host '  verifying by SHA-256 (identity, not approximate size):'
# This used to accept a file whose size was within 3% of the published figure. Size is not identity:
# it accepts a corrupted file of the right length, a resumed download that raced, and any substituted
# artifact of similar size. Hugging Face publishes the SHA-256 as the LFS oid, so there is no reason
# to guess. Digests below were read from the HF paths-info API and confirmed against these files.
$bad = 0
$all = @()
foreach ($i in $items) { $all += @{ Dest = (Join-Path $base $i.Path); Name = (Split-Path -Leaf $i.Path); Sha = $i.Sha } }
$all += @{ Dest = $esrgan.Dest; Name = '4xNomosWebPhoto_RealPLKSR.pth'; Sha = $esrgan.Sha }
foreach ($a in $all) {
    if (-not (Test-Path -LiteralPath $a.Dest)) { Write-Host "  MISSING after download: $($a.Name)"; $bad++; continue }
    $got = (Get-FileHash -LiteralPath $a.Dest -Algorithm SHA256).Hash.ToLower()
    if ($got -ne $a.Sha) {
        Write-Host ("  SHA MISMATCH {0}" -f $a.Name)
        Write-Host ("    expected {0}" -f $a.Sha)
        Write-Host ("    got      {0}" -f $got)
        Write-Host ("    fix: Remove-Item -LiteralPath '{0}' ; re-run with -Download" -f $a.Dest)
        Write-Host  '         (hf download skips a full-length file, so a corrupted one is never re-fetched on its own)'
        $bad++
    } else {
        Write-Host ("  ok  {0,-46} sha256 {1}..." -f $a.Name, $got.Substring(0,16))
    }
}

Write-Host ''
if ($bad) { Write-Host "  $bad file(s) missing or failed SHA-256 -- do NOT rely on this install."; exit 1 }
Write-Host '  Verified. Restore with "02 SWAN - Restore 2x (SeedVR2)", finish with "03 SWAN - Finish 4K + 48fps".'
Write-Host ''
exit 0
