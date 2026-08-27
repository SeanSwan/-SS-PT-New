<#
.SYNOPSIS
  Swan Radar console — one-click terminal into the always-on Linux box.

.DESCRIPTION
  Opens an interactive SSH session to radar. Tries the LAN address first
  (fast, home only); falls back to Tailscale (works anywhere) automatically.

  Key:    ~/.ssh/id_ed25519_radar   (dedicated to this box — not shared with backups)
  Config: ~/.ssh/config              (Host radar / Host radar-net)

  Read-only by default in spirit: this just gives Sean a shell. Nothing here
  writes to radar on its own.
#>

param(
    # -AtLogin: run from the Windows Startup folder. At login the network stack and
    # Tailscale are usually not up yet, so probe on a retry loop instead of failing
    # instantly and crying wolf about a box that is actually fine.
    [switch]$AtLogin
)

$ErrorActionPreference = 'Stop'
$Host.UI.RawUI.WindowTitle = 'Swan Radar console'

Write-Host ''
Write-Host '  SWAN RADAR' -ForegroundColor Cyan
Write-Host '  always-on Linux box - news collectors, SwanGuard host' -ForegroundColor DarkGray
Write-Host ''

function Test-RadarRoute {
    param([string]$TargetAlias)
    & ssh -o BatchMode=yes -o ConnectTimeout=6 $TargetAlias 'exit 0' 2>$null
    return ($LASTEXITCODE -eq 0)
}

$target   = $null
$attempts = if ($AtLogin) { 6 } else { 1 }   # ~60s of grace at login, instant otherwise

for ($i = 1; $i -le $attempts -and -not $target; $i++) {

    if ($i -gt 1) {
        Write-Host "  network not ready - retry $i/$attempts in 10s" -ForegroundColor DarkGray
        Start-Sleep -Seconds 10
    }

    Write-Host '  probing LAN (192.168.50.20) ... ' -NoNewline
    if (Test-RadarRoute 'radar') {
        Write-Host 'reachable' -ForegroundColor Green
        $target = 'radar'
        break
    }
    Write-Host 'no' -ForegroundColor DarkYellow

    Write-Host '  probing Tailscale (swan-radar) ... ' -NoNewline
    if (Test-RadarRoute 'radar-net') {
        Write-Host 'reachable' -ForegroundColor Green
        $target = 'radar-net'
        break
    }
    Write-Host 'no' -ForegroundColor Red
}

if (-not $target) {
    Write-Host ''
    Write-Host '  Could not reach radar on either route.' -ForegroundColor Red
    Write-Host '  Check, in order:' -ForegroundColor DarkGray
    Write-Host '    1. Is the radar box powered on?'
    Write-Host '    2. On this PC:  tailscale status     (is swan-radar listed?)'
    Write-Host '    3. If swan-radar shows "expired", re-auth it in the Tailscale admin console.'
    Write-Host ''
    Read-Host '  press Enter to close'
    exit 1
}

Write-Host ''
Write-Host "  connecting via '$target' - type 'exit' to leave" -ForegroundColor DarkGray
Write-Host ''

& ssh $target

Write-Host ''
Write-Host '  session closed.' -ForegroundColor DarkGray
Read-Host '  press Enter to close'
