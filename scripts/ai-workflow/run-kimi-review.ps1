<#
.SYNOPSIS
  Cost-gated Kimi-only Swan review.
.DESCRIPTION
  Dry-run by default. A live call requires -ConfirmSpend and cannot exceed -CapUsd.
#>
param(
  [Parameter(Mandatory = $true)][string]$Document,
  [string]$Seed = '',
  [string]$Out = 'docs/ai-workflow/AI-HANDOFF/KIMI-DESIGN-REVIEW.md',
  [ValidateSet('low', 'medium', 'high')][string]$Effort = 'high',
  [ValidateRange(1, 100000)][int]$MaxTokens = 16000,
  [ValidateRange(0.01, 3)][double]$CapUsd = 3,
  [switch]$ConfirmSpend
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$cliPath = Join-Path $repoRoot 'scripts\consult-kimi.mjs'
$arguments = @($cliPath, '--document', $Document, '--out', $Out, '--effort', $Effort, '--max-tokens', "$MaxTokens", '--cap-usd', "$CapUsd")
if ($Seed) { $arguments += @('--seed', $Seed) }
if ($ConfirmSpend) { $arguments += '--confirm-spend' }

Push-Location $repoRoot
try { & node @arguments } finally { Pop-Location }
exit $LASTEXITCODE