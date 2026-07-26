<#
.SYNOPSIS
  Cost-gated standalone Claude Opus 5 review.
.DESCRIPTION
  Dry-run by default. A live call requires -ConfirmSpend and cannot exceed -CapUsd.
  Opus receives only the exact bounded document and no other model's review.
#>
param(
  [Parameter(Mandatory = $true)][string]$Document,
  [string]$Out = 'docs/ai-workflow/AI-HANDOFF/OPUS-STANDALONE-REVIEW.md',
  [ValidateSet('low', 'medium', 'high')][string]$Effort = 'high',
  [ValidateRange(1, 100000)][int]$MaxTokens = 40000,
  [ValidateRange(0.01, 3)][double]$CapUsd = 3,
  [switch]$ConfirmSpend
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$cliPath = Join-Path $repoRoot 'scripts\consult-opus.mjs'
$arguments = @(
  $cliPath,
  '--document', $Document,
  '--out', $Out,
  '--effort', $Effort,
  '--max-tokens', "$MaxTokens",
  '--cap-usd', "$CapUsd"
)
if ($ConfirmSpend) { $arguments += '--confirm-spend' }

Push-Location $repoRoot
try { & node @arguments } finally { Pop-Location }
exit $LASTEXITCODE
