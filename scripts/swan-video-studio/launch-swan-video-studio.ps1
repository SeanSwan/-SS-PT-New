<#
.SYNOPSIS
  Opens the local SwanStudios Codex video-production workflow.

.DESCRIPTION
  Creates a media workspace outside the repo, copies Swan video style files,
  optionally reconnects video-use and HyperFrames, and opens the folders needed
  to start editing raw exercise footage with Codex.
#>

[CmdletBinding()]
param(
  [string]$WorkspaceRoot = (Join-Path $env:USERPROFILE 'Videos\SwanStudios-Video-Studio'),
  [string]$ToolRoot = (Join-Path $env:USERPROFILE 'Developer'),
  [switch]$SetupOnly,
  [switch]$NoToolInstall,
  [switch]$SkipToolSetup,
  [switch]$NoOpen
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptRoot '..\..')

. (Join-Path $ScriptRoot 'swan-video-studio-lib.ps1')

Write-Host 'SwanStudios Video Studio' -ForegroundColor Cyan
Write-Host 'Codex + video-use + HyperFrames local workflow'

Initialize-Workspace
Show-EnvironmentStatus
if (-not $SkipToolSetup) {
  Offer-MissingToolInstalls
  Ensure-VideoUse
  Ensure-HyperFramesCodex
}
New-SwanVideoProject
if (-not $NoOpen) { Open-Workflow }

Write-Step 'Done'
Write-Host "Workspace: $WorkspaceRoot"
Write-Host "Tool root:  $ToolRoot"
Write-Host 'Next: drop raw footage into the project raw folder, then use the Codex prompts in 03-style-guides.'

if ($Host.Name -match 'ConsoleHost' -and -not $NoOpen) {
  Read-Host 'Press Enter to close this launcher'
}
