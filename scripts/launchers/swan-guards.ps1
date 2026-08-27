# swan-guards.ps1 - one double-click to run the deterministic checks and READ the output.
#
# WHY: these checks are only useful if Sean can run them without an agent in the loop.
# Everything here is READ-ONLY: it queries information_schema and parses files. Nothing
# writes, migrates, or repairs.
#
# Exit codes are surfaced honestly - a check that finds nothing says so, and a check that
# could not run says THAT rather than reporting clean.

$ErrorActionPreference = 'Continue'
# Derived from this script's location (<repo>\scripts\launchers), not hardcoded, so the
# double-click launcher works from any checkout on any machine.
$Repo = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
Set-Location $Repo

function Show-Header($text) {
  Write-Host ''
  Write-Host ('  ' + $text) -ForegroundColor Cyan
  Write-Host ('  ' + ('-' * $text.Length)) -ForegroundColor Cyan
  Write-Host ''
}

function Report-Exit($code, $name) {
  Write-Host ''
  switch ($code) {
    0 { Write-Host ("  $name : no blocking findings.") -ForegroundColor Green }
    1 { Write-Host ("  $name : FINDINGS above - read them.") -ForegroundColor Yellow }
    2 { Write-Host ("  $name : COULD NOT RUN. This is not a pass.") -ForegroundColor Red }
    default { Write-Host ("  $name : exit $code") -ForegroundColor Yellow }
  }
}

# Not every check lives on every branch. The frontend guards are on `main`; this working
# tree sits on a wip branch that predates them. Without this, a missing script exits
# non-zero and gets reported as "FINDINGS" - a check that never ran, described as a result.
function Require-Script($relPath, $name) {
  if (Test-Path (Join-Path $Repo $relPath)) { return $true }
  Write-Host ''
  Write-Host ("  $name : NOT PRESENT in this working tree.") -ForegroundColor Red
  Write-Host ("  expected: $relPath") -ForegroundColor Red
  Write-Host '  This check lives on the main branch; this tree is on a wip branch.'
  Write-Host '  THIS IS NOT A PASS - the check did not run.' -ForegroundColor Red
  return $false
}

function Run-Drift {
  Show-Header 'DATABASE SCHEMA DRIFT  (models vs the live database)'
  Write-Host '  Read-only. Compares every Sequelize model against information_schema.'
  Write-Host '  Takes ~30-60s because it loads all 157 models.'
  Write-Host ''
  if (-not (Require-Script 'backend\scripts\schema-drift-check.mjs' 'schema-drift')) { return }
  & node backend\scripts\schema-drift-check.mjs
  Report-Exit $LASTEXITCODE 'schema-drift'
}

function Run-Tokens {
  Show-Header 'CSS TOKEN REGISTRY  (var(--token) existence + fallback drift)'
  Write-Host '  Read-only. Advisory by default - it reports, it does not gate.'
  Write-Host ''
  if (-not (Require-Script 'scripts\hooks\token-registry-check.mjs' 'token-registry')) { return }
  & node scripts\hooks\token-registry-check.mjs
  Report-Exit $LASTEXITCODE 'token-registry'
}

function Run-Guards {
  Show-Header 'FRONTEND RULE GUARDS  (self-test)'
  Write-Host '  Runs the guard test suite: MUI / recharts / retired palette / raw hex /'
  Write-Host '  css-helper (the mount-crash rule) / 300-line cap.'
  Write-Host ''
  if (-not (Require-Script 'scripts\hooks\frontend-guards.test.mjs' 'frontend-guards tests')) { return }
  & node scripts\hooks\frontend-guards.test.mjs
  Report-Exit $LASTEXITCODE 'frontend-guards tests'
}

while ($true) {
  Write-Host ''
  Write-Host '  SWAN CODE GUARDS' -ForegroundColor Cyan
  Write-Host '  ================' -ForegroundColor Cyan
  Write-Host ''
  Write-Host '   1  Database schema drift   (models vs live DB)'
  Write-Host '   2  CSS token registry      (undefined tokens + fallback drift)'
  Write-Host '   3  Frontend rule guards    (self-test)'
  Write-Host '   4  Run all three'
  Write-Host '   Q  Quit'
  Write-Host ''
  $choice = Read-Host '  Choose'

  switch ($choice.Trim().ToUpper()) {
    '1' { Run-Drift }
    '2' { Run-Tokens }
    '3' { Run-Guards }
    '4' { Run-Drift; Run-Tokens; Run-Guards }
    'Q' { Write-Host ''; return }
    default { Write-Host '  Pick 1-4 or Q.' -ForegroundColor Yellow }
  }

  Write-Host ''
  Read-Host '  Press Enter for the menu' | Out-Null
}
