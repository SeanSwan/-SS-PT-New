<#
.SYNOPSIS
  Dry-first, packet-driven Opus 5 + Kimi K3 + Tencent HY3 review panel.
.DESCRIPTION
  The supplied sanitized packet is the single source of product context. This
  launcher deliberately uses product-neutral role remits so it cannot inject a
  stale assignment from an unrelated product into the paid reviewer prompts.
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
Review the supplied packet as Opus 5, a principal product architect and hostile
reviewer. The packet is the authoritative product context. Make decisive,
implementation-ready architecture, data, API, migration, failure-mode, rollout,
and UX decisions. Challenge unsafe assumptions and return every required artifact
from the packet, including Mermaid, wireframes, a decision register, and tests.
'@
$kimiRemit = @'
Review the supplied packet as Kimi K3, the product, domain-intelligence, and
experience-design authority. The packet is the authoritative product context.
Make decisive, implementation-ready programming, learning, voice, inclusive-flow,
product, and visual-system decisions. Return every required artifact from the
packet, including Mermaid, wireframes, a decision register, and tests.
'@
$hy3Remit = @'
Review the supplied packet as Tencent HY3, a UX/UI systems and interaction-design
authority. The packet is the authoritative product context. Make decisive,
implementation-ready responsive information-architecture, interaction, visual,
accessibility, state, and delivery decisions. Return every required artifact from
the packet, including Mermaid, wireframes, a decision register, and tests.
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

Write-Host "[top-ai-panel] packet_sha256=$packetHash model_calls=3 shared_cap_usd=$($CapUsd.ToString('0.00'))"
Write-Host "[top-ai-panel] allocation opus=$($opusCap.ToString('0.00')) kimi=$($kimiCap.ToString('0.00')) hy3=$($hy3Cap.ToString('0.00'))"
if (-not $ConfirmSpend) { Write-Host '[top-ai-panel] status=preflight-only model_calls_executed=0' }

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
