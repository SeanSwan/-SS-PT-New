# start-render-agent.ps1 — one command, no secret in your shell history.
# ============================================================================
#
# WHY THIS EXISTS: the first working instructions were three PowerShell lines including
# `$env:SWAN_AGENT_TOKEN = "<75-character secret>"`. That is miserable to retype, easy to
# get wrong (the bash `VAR=value cmd` form does not work in PowerShell at all), and it
# writes the credential into PowerShell history where it long outlives the session.
#
# This asks for the token ONCE, stores it in a gitignored file next to the backend, and
# every launch afterwards is just:
#
#     .\backend\scripts\start-render-agent.ps1
#
# The token is read with -AsSecureString so it is not echoed to the screen while typing,
# and it is never written to the transcript or printed back.

[CmdletBinding()]
param(
  [string]$Api = 'https://ss-pt-new.onrender.com',
  [string]$Capabilities = 'ffmpeg,mediasync',
  [switch]$Reset      # discard the saved token and ask again (use after re-enrolling)
)

$ErrorActionPreference = 'Stop'

# Resolve paths from THIS script's location, so it does not matter what directory you are
# standing in when you run it — the single most common failure in the manual instructions.
$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Split-Path -Parent $ScriptDir
$TokenFile  = Join-Path $BackendDir '.swan-agent.env'
$AgentFile  = Join-Path $ScriptDir 'render-agent.mjs'

if (-not (Test-Path $AgentFile)) {
  Write-Host ""
  Write-Host "  Cannot find render-agent.mjs next to this script." -ForegroundColor Red
  Write-Host "  Expected: $AgentFile"
  Write-Host "  You are probably on a branch that predates it — this needs 'main'."
  Write-Host ""
  exit 2
}

if ($Reset -and (Test-Path $TokenFile)) {
  Remove-Item $TokenFile -Force
  Write-Host "  Saved token discarded." -ForegroundColor Yellow
}

if (-not (Test-Path $TokenFile)) {
  Write-Host ""
  Write-Host "  No saved token yet." -ForegroundColor Yellow
  Write-Host "  Get one from: Content Studio -> Render Queue -> Enrol this machine"
  Write-Host "  It is shown once. Paste it below (it will not be displayed as you type)."
  Write-Host ""

  $secure = Read-Host -Prompt '  Agent token' -AsSecureString
  $plain  = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
              [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))

  if ([string]::IsNullOrWhiteSpace($plain)) {
    Write-Host "  No token entered — nothing saved." -ForegroundColor Red
    exit 2
  }

  # Trim and strip quotes: pasting with surrounding quotes is the common slip, and it
  # produces a confusing 401 rather than an obvious error.
  $plain = $plain.Trim().Trim('"').Trim("'")

  # Written WITHOUT a BOM. A UTF8-BOM file makes the first key parse as "?SWAN_AGENT_TOKEN"
  # and the token reads as missing — a silent failure that looks like a bad credential.
  [System.IO.File]::WriteAllText($TokenFile, "SWAN_AGENT_TOKEN=$plain`n",
    (New-Object System.Text.UTF8Encoding $false))

  Write-Host ""
  Write-Host "  Saved to $TokenFile" -ForegroundColor Green
  Write-Host "  That file is gitignored. Delete it, or re-run with -Reset, to change the token."
  Write-Host ""
}

Write-Host "  Starting agent — Ctrl+C to stop." -ForegroundColor Cyan
Write-Host ""

# The agent reads the token file itself; the secret never enters this process's
# environment, so it cannot leak into a child process or a crash dump.
& node $AgentFile --api $Api --capabilities $Capabilities
