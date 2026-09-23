<#
.SYNOPSIS
  Cost-gated Swan Guard Newsroom panel: Opus 5 + Kimi K3 + Tencent HY3.
.DESCRIPTION
  Dry-run by default. A live run requires -ConfirmSpend. One shared cap is
  divided across three independent calls; paid calls are never retried.
#>
param(
  [Parameter(Mandatory = $true)][string]$Document,
  [string]$Seed = '',
  [string]$OpusOut = 'docs/ai-workflow/AI-HANDOFF/OPUS5-REVIEW.md',
  [string]$KimiOut = 'docs/ai-workflow/AI-HANDOFF/KIMI-K3-REVIEW.md',
  [string]$Hy3Out = 'docs/ai-workflow/AI-HANDOFF/HY3-REVIEW.md',
  [ValidateSet('low', 'medium', 'high')][string]$Effort = 'high',
  [ValidateRange(60000, 60000)][int]$MaxTokens = 60000,
  [ValidateRange(0.01, 3)][double]$CapUsd = 3,
  [switch]$ConfirmSpend
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$documentPath = (Resolve-Path -LiteralPath $Document).Path
$packetHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $documentPath).Hash.ToLowerInvariant()
$opusCli = Join-Path $repoRoot 'scripts\consult-opus5.mjs'
$kimiCli = Join-Path $repoRoot 'scripts\consult-kimi.mjs'
$hy3Cli = Join-Path $repoRoot 'scripts\consult-hy3-design.mjs'

$opusCap = [Math]::Round($CapUsd * 0.55, 2)
$kimiCap = [Math]::Round($CapUsd * 0.40, 2)
$hy3Cap = [Math]::Round($CapUsd - $opusCap - $kimiCap, 2)
if ($hy3Cap -lt 0.01) { throw 'Shared cap is too small for three bounded calls.' }

$common = @('--document', $documentPath, '--effort', $Effort, '--max-tokens', "$MaxTokens")
$opusRemit = @'
You are Opus 5, principal architect and hostile reviewer for Swan Guard Newsroom.
Produce a builder-exact blueprint for the proven Feed/Sources/Archive app. Preserve
storyService, governed shadow ingestion, and public Feed isolation. Cover official
news/RSS, X, YouTube, AI and semiconductor releases, hardware, local events, opt-in
crime trends, desktop/mobile UX, agent/MCP contracts, privacy, cost, provenance,
failure isolation, clustering, promotion, tests, rollout, rollback, Mermaid, and an
ASCII wireframe. Rank risks and challenge weak assumptions.
'@
$kimiRemit = @'
You are Kimi K3, product-design lead for Swan Guard Newsroom. Turn this architecture
into a distinctive dense desktop newsroom that also works on mobile. Design Feed,
Sources, Archive, Watchlists, Alerts, Local, and Agent surfaces without generic
dashboard slop. Specify hierarchy, keyboard command palette, panes, inspector,
notification controls, accessibility, responsive states, empty/loading/error states,
Mermaid, ASCII wireframes, design tokens, motion limits, and builder-exact slices.
Preserve storyService and governed shadow-to-promotion boundaries.
'@
$hy3Remit = @'
You are Tencent HY3, a divergent interaction and systems designer. Stress-test the
Swan Guard Newsroom packet and propose high-leverage desktop/mobile workflows for
many dense interests: AI, chips, creator channels, local events, and safety trends.
Focus on information compression, spatial navigation, alert triage, watchlist setup,
agent observability, accessibility, failure states, and low-noise notification logic.
Return concrete wireframes, Mermaid, components, tests, and a phased build order.
'@

$opusArgs = @($opusCli) + $common + @('--out', $OpusOut, '--cap-usd', "$opusCap", '--remit', $opusRemit)
$kimiArgs = @($kimiCli) + $common + @('--out', $KimiOut, '--cap-usd', "$kimiCap", '--remit', $kimiRemit)
$hy3Args = @($hy3Cli) + $common + @('--out', $Hy3Out, '--cap-usd', "$hy3Cap", '--remit', $hy3Remit)
if ($Seed) {
  $seedPath = (Resolve-Path -LiteralPath $Seed).Path
  $opusArgs += @('--seed', $seedPath)
  $kimiArgs += @('--seed', $seedPath)
  $hy3Args += @('--seed', $seedPath)
}
if ($ConfirmSpend) {
  $opusArgs += '--confirm-spend'
  $kimiArgs += '--confirm-spend'
  $hy3Args += '--confirm-spend'
}

Write-Host "[newsroom-panel] packet_sha256=$packetHash model_calls=3 shared_cap_usd=$($CapUsd.ToString('0.00'))"
Write-Host "[newsroom-panel] allocation opus=$($opusCap.ToString('0.00')) kimi=$($kimiCap.ToString('0.00')) hy3=$($hy3Cap.ToString('0.00'))"
if (-not $ConfirmSpend) { Write-Host '[newsroom-panel] status=preflight-only model_calls_executed=0' }

Push-Location $repoRoot
try {
  & node @opusArgs
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & node @kimiArgs
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & node @hy3Args
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally { Pop-Location }
exit 0
