# Verify-Weights.ps1 -- rot detection for EVERYTHING under Z:\AI-Weights\ComfyUI.
#
#   .\Verify-Weights.ps1 -Baseline     hash every weight file, write the manifest (run once, and
#                                      again after any deliberate install/removal)
#   .\Verify-Weights.ps1               compare current files against the manifest; exit 1 on drift
#
# WHY. The installers verify the Krea 2 and upscale files against UPSTREAM digests, but the H3
# video weights have no published-digest coverage here, and a verified install can still rot later
# (half-written resume, bad sector, silent substitution). This snapshots a trusted baseline of the
# WHOLE library and detects any later change: CHANGED and MISSING files fail loudly; NEW files are
# reported as info (a new install is expected to add files -- re-baseline after it).
#
# A weekly scheduled task runs the compare so drift is caught while nobody is looking:
#   schtasks /Create /TN SwanWeightsVerify /SC WEEKLY /D SUN /ST 09:00 /TR "powershell -NoProfile -ExecutionPolicy Bypass -File C:\ComfyUI-H3-v0.34.2-cu130\Verify-Weights.ps1 -Log"
# Results land in .manifest\verify-log.txt next to the manifest.

param(
    [switch]$Baseline,
    [string]$Root = 'Z:\AI-Weights\ComfyUI',
    [switch]$Log
)

$ErrorActionPreference = 'Stop'
$manifestDir = Join-Path $Root '.manifest'
$manifestPath = Join-Path $manifestDir 'weights-manifest.json'
$logPath = Join-Path $manifestDir 'verify-log.txt'

if (-not (Test-Path -LiteralPath $Root)) { throw "Weights library not found: $Root (is the drive mounted?)" }

function Get-WeightFiles {
    Get-ChildItem -LiteralPath $Root -Recurse -File |
        Where-Object { $_.FullName -notlike (Join-Path $manifestDir '*') }
}

function Write-VerifyLog([string]$line) {
    if ($Log) {
        New-Item -ItemType Directory -Force -Path $manifestDir | Out-Null
        Add-Content -LiteralPath $logPath -Value ("{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm'), $line)
    }
}

if ($Baseline) {
    Write-Host ''
    Write-Host "  baselining $Root (hashing everything -- this takes a few minutes)..."
    $entries = @()
    foreach ($f in Get-WeightFiles) {
        $rel = $f.FullName.Substring($Root.Length).TrimStart('\')
        $sha = (Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash.ToLower()
        $entries += [pscustomobject]@{ path = $rel; bytes = $f.Length; sha256 = $sha }
        Write-Host ("  {0,-70} {1,10:N0} KB" -f $rel, ($f.Length / 1KB))
    }
    New-Item -ItemType Directory -Force -Path $manifestDir | Out-Null
    [pscustomobject]@{
        root    = $Root
        date    = (Get-Date -Format 'yyyy-MM-dd HH:mm')
        files   = $entries
    } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
    Write-Host ''
    Write-Host ("  manifest written: {0} files -> {1}" -f $entries.Count, $manifestPath)
    Write-VerifyLog ("BASELINE {0} files" -f $entries.Count)
    exit 0
}

if (-not (Test-Path -LiteralPath $manifestPath)) {
    Write-Host "  No manifest yet. Run: .\Verify-Weights.ps1 -Baseline"
    Write-VerifyLog 'NO MANIFEST'
    exit 1
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$known = @{}
foreach ($e in $manifest.files) { $known[$e.path] = $e }

$changed = 0; $missing = 0; $new = 0; $ok = 0
$seen = @{}
foreach ($f in Get-WeightFiles) {
    $rel = $f.FullName.Substring($Root.Length).TrimStart('\')
    $seen[$rel] = $true
    if (-not $known.ContainsKey($rel)) { Write-Host "  NEW      $rel  (re-baseline after a deliberate install)"; $new++; continue }
    $e = $known[$rel]
    if ($f.Length -ne $e.bytes) {
        Write-Host "  CHANGED  $rel  (size $($f.Length) vs baseline $($e.bytes))"; $changed++; continue
    }
    $sha = (Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash.ToLower()
    if ($sha -ne $e.sha256) { Write-Host "  CHANGED  $rel  (sha256 differs at same size -- corruption or substitution)"; $changed++ }
    else { $ok++ }
}
foreach ($path in $known.Keys) {
    if (-not $seen.ContainsKey($path)) { Write-Host "  MISSING  $path"; $missing++ }
}

Write-Host ''
Write-Host ("  {0} ok, {1} changed, {2} missing, {3} new (baseline {4})" -f $ok, $changed, $missing, $new, $manifest.date)
Write-VerifyLog ("VERIFY ok={0} changed={1} missing={2} new={3}" -f $ok, $changed, $missing, $new)
if ($changed -or $missing) { Write-Host '  DRIFT DETECTED -- do not trust renders until this is explained.'; exit 1 }
exit 0
