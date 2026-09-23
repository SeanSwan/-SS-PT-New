$ErrorActionPreference = 'Stop'
$wrapperLog = Join-Path $PSScriptRoot 'run-wrapper.log'
try {
  "$(Get-Date -Format o) start user=$env:USERNAME" | Add-Content -LiteralPath $wrapperLog
  & (Join-Path $PSScriptRoot 'Invoke-WorkstationGuardian.ps1') -Enforce `
    -LogPath (Join-Path $PSScriptRoot 'guardian.log')
  "$(Get-Date -Format o) finish success=$?" | Add-Content -LiteralPath $wrapperLog
  if (-not $?) { exit 1 }
  exit 0
} catch {
  "$(Get-Date -Format o) error=$($_.Exception.Message)" | Add-Content -LiteralPath $wrapperLog
  exit 1
}
