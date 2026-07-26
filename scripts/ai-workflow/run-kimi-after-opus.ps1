<#
.SYNOPSIS
  Cost-gated Kimi K3 second-pass review after standalone Opus.
.DESCRIPTION
  Dry-run by default. The Opus artifact must contain the same document SHA-256.
  A live Kimi call requires a separate -ConfirmSpend approval.
#>
param(
  [Parameter(Mandatory = $true)][string]$Document,
  [Parameter(Mandatory = $true)][string]$OpusReview,
  [string]$Out = 'docs/ai-workflow/AI-HANDOFF/KIMI-SECOND-PASS-REVIEW.md',
  [ValidateSet('low', 'medium', 'high')][string]$Effort = 'high',
  [ValidateRange(1, 100000)][int]$MaxTokens = 16000,
  [ValidateRange(0.01, 3)][double]$CapUsd = 3,
  [switch]$ConfirmSpend
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$cliPath = Join-Path $repoRoot 'scripts\consult-kimi-second-pass.mjs'
$arguments = @(
  $cliPath,
  '--document', $Document,
  '--seed', $OpusReview,
  '--out', $Out,
  '--effort', $Effort,
  '--max-tokens', "$MaxTokens",
  '--cap-usd', "$CapUsd"
)
if ($ConfirmSpend) { $arguments += '--confirm-spend' }

Push-Location $repoRoot
try { & node @arguments } finally { Pop-Location }
exit $LASTEXITCODE
