<#
SwanStudios desktop shim for the tracked video-studio launcher.
Copy this file to the Desktop as "Swan Video Studio.ps1".
#>

$ErrorActionPreference = 'Stop'

$candidates = @(
  (Join-Path $env:USERPROFILE 'Desktop\quick-pt\SS-PT\scripts\swan-video-studio\launch-swan-video-studio.ps1'),
  (Join-Path $env:USERPROFILE 'Desktop\SS-PT\scripts\swan-video-studio\launch-swan-video-studio.ps1'),
  (Join-Path $env:USERPROFILE 'Documents\SS-PT\scripts\swan-video-studio\launch-swan-video-studio.ps1')
)

$target = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if (-not $target) {
  Write-Host 'Could not find SwanStudios launch-swan-video-studio.ps1.' -ForegroundColor Red
  Write-Host 'Expected one of:' -ForegroundColor Yellow
  $candidates | ForEach-Object { Write-Host "  $_" }
  Read-Host 'Press Enter to close'
  exit 1
}

& $target
