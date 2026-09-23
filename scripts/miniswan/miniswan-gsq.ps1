<#
.SYNOPSIS
Brings the MiniSwan GSQ model (Qwen3.8-27B on the RTX 4080) online for Hermes, and takes it down again.

.DESCRIPTION
Hermes on the 5090 reaches models through the Windows host address it sees from WSL
(172.26.128.1). The MiniSwan GSQ profile deliberately binds llama-server to
127.0.0.1:18081 only, so the missing link is a forwarder on this machine. This script
owns exactly three steps and nothing else:

  1. ensure MiniSwan is awake and SSH-reachable (Wake-on-LAN via the verified helper)
  2. start the model through MiniSwan's own pinned controller (MiniSwan-GSQ.ps1 -Mode Start)
  3. open an SSH local forward  127.0.0.1:18082 -> MiniSwan 127.0.0.1:18081

It does not edit the Hermes config, install software, change the profile, change a
scheduled task, or touch the canonical brain. Hermes already has the matching
`miniswan-gsq` provider and `mini-gsq` alias pointing at port 18082.

WHY 18082: this machine's own local GSQ server already owns 18081, and the Hermes
config maps local-gsq -> 18081, miniswan-gsq -> 18082.

WHAT IT COSTS: while the model is loaded the 4080 has roughly 1.9 GB of VRAM free
(measured 2026-09-13: 14152 MiB used at 64K context). A Video Studio render job on
MiniSwan will not fit at the same time. Use `-Mode stop` when you are done, or the
tunnel keeps an SSH session open and the box will not sleep.

.PARAMETER Mode
start  - wake, start the model, open the tunnel, verify health
status - report tunnel, health, and MiniSwan's controller state (no changes)
stop   - close the tunnel, stop the model on MiniSwan, let the box sleep again

.PARAMETER LocalPort
Local forward port. Default 18082, which is what the Hermes miniswan-gsq provider expects.

.PARAMETER SshTarget
SSH host alias. Defaults to miniswan (LAN) as of 2026-09-18. The tailnet alias
miniswan-net was the default and is the fragile link: on 2026-09-18 the tailnet
route to MiniSwan went offline (tailscale showed the peer offline, relayed via lax,
tx 1404 rx 0) while the LAN path answered SSH the whole time. ssh's keepalive then
gave up, the forward died, and 172.26.128.1:18082 stayed dark for hours. Prefer the
LAN when both boxes are on 192.168.50.x; use -SshTarget miniswan-net when remote.

.PARAMETER Mac
Adapter MAC for Wake-on-LAN. Default is MiniSwan's recorded MAC.

.EXAMPLE
.\scripts\miniswan\miniswan-gsq.ps1 -Mode start

.EXAMPLE
.\scripts\miniswan\miniswan-gsq.ps1 -Mode status
#>
[CmdletBinding()]
param(
  [ValidateSet('start', 'status', 'stop')]
  [string]$Mode = 'status',

  [ValidateRange(1024, 65535)]
  [int]$LocalPort = 18082,

  # Hermes runs inside WSL and reaches this machine at the WSL vNIC address
  # (172.26.128.1 by default). Binding only 127.0.0.1 makes the forward invisible
  # to Hermes - that was a real defect on the first run of this script.
  # 'auto' resolves the vEthernet (WSL) adapter; pass an explicit IP to override.
  [ValidateNotNullOrEmpty()]
  [string]$BindAddress = 'auto',

  [ValidateNotNullOrEmpty()]
  [string]$SshTarget = 'miniswan',

  [ValidateNotNullOrEmpty()]
  [string]$FallbackTarget = 'miniswan-net',

  [ValidateNotNullOrEmpty()]
  [string]$Mac = '10-FF-E0-85-27-89',

  [ValidateNotNullOrEmpty()]
  [string]$BroadcastAddress = '192.168.50.255',

  # What the wake helper probes for readiness after sending the packet. Must be an
  # address that resolves the SAME WAY $SshTarget does - and the bare name
  # 'miniswan' does not. Measured 2026-09-19: C:\Windows\...\etc\hosts maps
  # 'miniswan' to 100.72.20.72 (the TAILNET) while ~/.ssh/config maps Host
  # miniswan to 192.168.50.92 (the LAN). So the old '-ProbeHost $SshTarget' waited
  # on the tailnet and then this script verified the LAN with ssh - two different
  # links. Harmless while both are up; if the tailnet is down (the documented
  # fragile link) the helper reports SSH_NOT_READY and this script would throw
  # MINISWAN_UNREACHABLE even though the box woke and answered on the LAN.
  # Pass -WakeProbeHost 100.72.20.72 alongside -SshTarget miniswan-net when remote.
  [ValidateNotNullOrEmpty()]
  [string]$WakeProbeHost = '192.168.50.92',

  [ValidateNotNullOrEmpty()]
  [string]$RemoteController = 'C:\swan\hermes-profiles\gsq\MiniSwan-GSQ.ps1',

  [int]$HealthTimeoutSeconds = 90,

  [switch]$Force
)

$ErrorActionPreference = 'Stop'

$WakeHelper = Join-Path $PSScriptRoot 'miniswan-wake.ps1'
$StatePath = Join-Path ([System.IO.Path]::GetTempPath()) 'miniswan-gsq-tunnel.json'

function Write-Step([string]$Text) { Write-Host "  $Text" }

function Resolve-BindAddress {
  param([string]$Requested)
  if ($Requested -and $Requested -ne 'auto') { return $Requested }

  $ip = $null
  try {
    $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
      Where-Object { $_.InterfaceAlias -match 'WSL' } |
      Select-Object -First 1 -ExpandProperty IPAddress
  } catch { }

  if (-not $ip) {
    # Fallback for constrained shells where the NetTCPIP cmdlets are unavailable:
    # read the vEthernet (WSL) adapter block straight out of ipconfig.
    $inWslBlock = $false
    foreach ($line in (ipconfig)) {
      if ($line -match 'adapter\s') { $inWslBlock = ($line -match 'WSL') ; continue }
      if ($inWslBlock -and $line -match 'IPv4 Address[^:]*:\s*([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)') {
        $ip = $Matches[1]; break
      }
    }
  }

  if ($ip) { return $ip }

  # Fail closed on the START path. Returning 127.0.0.1 here binds a forward Hermes
  # (inside WSL) can never reach: it reads as "online" on this host while every
  # WSL-side call fails - the same silent-mismatch class as the missing -Bind at
  # the Start-Tunnel call site. status and stop still run, so a half-open forward
  # can always be diagnosed and torn down.
  if ($Mode -eq 'start') {
    throw 'MINISWAN_BIND_UNRESOLVED: no vEthernet (WSL) IPv4 address found, so the forward cannot be bound where Hermes can reach it. Bring the WSL adapter up, or pass -BindAddress <wsl-vnic-ip> explicitly.'
  }
  Write-Step 'WARNING: no WSL vNIC found; reporting status against 127.0.0.1 (start will refuse)'
  return '127.0.0.1'
}

function Test-SshReady {
  param([string]$Target, [int]$TimeoutSeconds = 6)
  $probe = & ssh -o BatchMode=yes -o ConnectTimeout=$TimeoutSeconds $Target 'echo READY' 2>&1
  return ($LASTEXITCODE -eq 0) -and (($probe -join ' ') -match 'READY')
}

function Resolve-ReachableTarget {
  if (Test-SshReady -Target $SshTarget) { return $SshTarget }
  Write-Step "waking MiniSwan (WoL $Mac -> $BroadcastAddress)"
  # NOT piped. `& powershell.exe ... | <anything>` throws
  # "Cannot run a document in the middle of a pipeline" on PS 5.1 - reproduced
  # 2026-09-19 for both `| Out-Null` and `| ForEach-Object`, which is the form this
  # call used to use. With $ErrorActionPreference = 'Stop' set at the top of this
  # script that throw was TERMINATING, so this function died before a single wake
  # packet was sent: `MiniSwan Qwen - LOAD.cmd` could not wake a sleeping box at
  # all, which is the one case the wake exists for. The path only ever runs when
  # MiniSwan is already asleep, which is why it went unnoticed - a reachable box
  # short-circuits on the Test-SshReady above.
  # Capture unpiped, and assert on WOL_SENT: a wake that did not happen must not
  # read as one that did.
  $wakeOut  = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $WakeHelper `
    -Mac $Mac -BroadcastAddress $BroadcastAddress -ProbeHost $WakeProbeHost -WaitSeconds 60 2>&1
  $wakeCode = $LASTEXITCODE
  foreach ($line in @($wakeOut)) { Write-Step ([string]$line) }
  if (-not (@($wakeOut) -match 'WOL_SENT')) {
    Write-Step "WARNING: wake helper reported no WOL_SENT (exit=$wakeCode) - the packet may not have been sent"
  }
  if (Test-SshReady -Target $SshTarget) { return $SshTarget }
  Write-Step "tailnet target did not answer; trying LAN fallback $FallbackTarget"
  if (Test-SshReady -Target $FallbackTarget) { return $FallbackTarget }
  throw "MINISWAN_UNREACHABLE: neither $SshTarget nor $FallbackTarget accepted SSH after wake"
}

function Get-RemoteController {
  param([string]$Target, [string]$Mode)
  # Forward slashes on purpose: the path crosses local PowerShell -> ssh argv ->
  # the remote shell, and backslashes were observed being stripped in transit
  # (remote -File got 'C:swanhermes-profilesgsqMiniSwan-GSQ.ps1', 2026-09-17).
  # Windows PowerShell accepts forward-slash paths natively.
  $remotePath = $RemoteController -replace '\\', '/'
  $remote = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$remotePath`" -Mode $Mode -Json"
  $out = & ssh -o BatchMode=yes -o ConnectTimeout=20 $Target $remote 2>&1
  $code = $LASTEXITCODE
  $text = ($out | Out-String).Trim()
  $json = $null
  try { $json = $text | ConvertFrom-Json } catch { }
  return [pscustomobject]@{ ExitCode = $code; Text = $text; Json = $json }
}

function Get-TunnelProcess {
  if (-not (Test-Path -LiteralPath $StatePath)) { return $null }
  try {
    $state = Get-Content -LiteralPath $StatePath -Raw | ConvertFrom-Json
    $proc = Get-Process -Id ([int]$state.pid) -ErrorAction SilentlyContinue
    if ($proc -and $proc.ProcessName -eq 'ssh') { return $proc }
  } catch { }
  return $null
}

function Test-LocalHealth {
  param([int]$Port, [string]$Bind = '127.0.0.1', [int]$TimeoutSeconds = 2)
  try {
    $r = Invoke-WebRequest -Uri "http://${Bind}:$Port/health" -TimeoutSec $TimeoutSeconds -UseBasicParsing
    return ($r.StatusCode -eq 200)
  } catch {
    if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 503) { return $false }
    return $false
  }
}

function Start-Tunnel {
  param([string]$Target, [int]$Port, [string]$Bind)
  $existing = Get-TunnelProcess
  if ($existing) { Write-Step "tunnel already up (pid $($existing.Id))"; return $existing }
  Write-Step "opening forward ${Bind}:$Port -> ${Target}:127.0.0.1:18081"
  $args = @(
    '-N',
    '-o', 'BatchMode=yes',
    '-o', 'ExitOnForwardFailure=yes',
    '-o', 'ServerAliveInterval=30',
    '-o', 'ServerAliveCountMax=3',
    '-L', "${Bind}:${Port}:127.0.0.1:18081",
    $Target
  )
  $proc = Start-Process -FilePath 'ssh' -ArgumentList $args -WindowStyle Hidden -PassThru
  @{ pid = $proc.Id; target = $Target; bindAddress = $Bind; localPort = $Port; startedUtc = (Get-Date).ToUniversalTime().ToString('o') } |
    ConvertTo-Json | Set-Content -LiteralPath $StatePath -Encoding utf8
  return $proc
}

$script:Bind = Resolve-BindAddress -Requested $BindAddress

# --------------------------------------------------------------------------- status
if ($Mode -eq 'status') {
  $tunnel = Get-TunnelProcess
  # A forward may also have been started outside this script (another shell, a task, an operator).
  # Report it honestly instead of claiming "down" just because our state file has no pid.
  $foreign = $null
  if (-not $tunnel) {
    $foreign = Get-CimInstance Win32_Process -Filter "Name='ssh.exe'" -ErrorAction SilentlyContinue |
      Where-Object { $_.CommandLine -match [regex]::Escape(":$LocalPort`:") } |
      Select-Object -First 1
  }
  # Health must be probed through the same bind the start path uses (the WSL vNIC),
  # otherwise status always reports "not answering" - $healthy was never assigned here.
  $healthy = Test-LocalHealth -Port $LocalPort -Bind $script:Bind
  $tunnelDesc = if ($tunnel) { "up (pid $($tunnel.Id))" }
    elseif ($foreign) { "up (pid $($foreign.ProcessId), started outside this script)" }
    elseif ($healthy) { 'up (listener not attributable from this shell)' }
    else { 'down' }
  Write-Host 'MiniSwan GSQ status'
  Write-Step ("bind address    : $script:Bind (port $LocalPort)")
  Write-Step ("tunnel          : $tunnelDesc")
  Write-Step ("local /health   : " + $(if ($healthy) { 'ok' } else { 'not answering' }))
  $target = if (Test-SshReady -Target $SshTarget) { $SshTarget } elseif (Test-SshReady -Target $FallbackTarget) { $FallbackTarget } else { $null }
  if (-not $target) { Write-Step 'miniswan        : asleep or unreachable'; exit 3 }
  $rc = Get-RemoteController -Target $target -Mode 'Status'
  Write-Step ("miniswan        : $target")
  Write-Step ("controller      : " + $(if ($rc.Json) { ($rc.Json | ConvertTo-Json -Compress) } else { $rc.Text }))
  exit 0
}

# ---------------------------------------------------------------------------- stop
if ($Mode -eq 'stop') {
  $tunnel = Get-TunnelProcess
  if ($tunnel) {
    Write-Step "closing tunnel (pid $($tunnel.Id))"
    Stop-Process -Id $tunnel.Id -Force -ErrorAction SilentlyContinue
  }
  Remove-Item -LiteralPath $StatePath -Force -ErrorAction SilentlyContinue
  if (Test-SshReady -Target $SshTarget) {
    $rc = Get-RemoteController -Target $SshTarget -Mode 'Stop'
    Write-Step ("controller stop : " + $(if ($rc.Json) { ($rc.Json | ConvertTo-Json -Compress) } else { $rc.Text }))
  } else {
    Write-Step 'miniswan asleep; nothing to stop'
  }
  Write-Host 'MiniSwan GSQ stopped. The box may sleep on its own schedule.'
  exit 0
}

# --------------------------------------------------------------------------- start
Write-Host 'MiniSwan GSQ start'
$target = Resolve-ReachableTarget
Write-Step "ssh target      : $target"

$status = Get-RemoteController -Target $target -Mode 'Status'
$phase = if ($status.Json) { [string]$status.Json.status } else { '' }
Write-Step "controller phase: $(if ($phase) { $phase } else { $status.Text })"

if ($phase -eq 'RUNNING' -and -not $Force) {
  Write-Step 'model already running (use -Force to restart)'
} else {
  if ($phase -eq 'RUNNING') {
    # -Force used to fall straight through to -Mode Start, which the remote
    # controller REFUSES while its state says READY - so "use -Force to restart"
    # was a no-op that could never restart anything. A restart is Stop -> Start;
    # there is no reload verb, and a changed profile is only read at load time.
    # This is the only path that applies a profile change to a running model, so
    # it has to actually stop first. Found 2026-09-19 while a ctx bump sat
    # unapplied with the guard reporting CTX_BELOW_PINNED and no way to act on it.
    Write-Step 'restarting: stopping first (a profile change only takes effect at load time)'
    $stopped = Get-RemoteController -Target $target -Mode 'Stop'
    Write-Step ("stop result     : " + $(if ($stopped.Json) { ($stopped.Json | ConvertTo-Json -Compress) } else { $stopped.Text }))
    # The controller needs a moment to release port 18081 and rewrite state.json;
    # an immediate Start can land on a still-READY state and be refused.
    Start-Sleep -Seconds 3
  }
  Write-Step 'starting model via MiniSwan-GSQ.ps1 -Mode Start'
  $started = Get-RemoteController -Target $target -Mode 'Start'
  Write-Step ("start result    : " + $(if ($started.Json) { ($started.Json | ConvertTo-Json -Compress) } else { $started.Text }))
  if ($started.ExitCode -ne 0 -and -not $started.Json) {
    throw "GSQ_START_FAILED: controller exited $($started.ExitCode)"
  }
}

# -Bind is REQUIRED here. Start-Tunnel's $Bind parameter defaults to empty, and an
# empty bind makes OpenSSH read "-L :18082:..." as "all interfaces" - silently
# widening the forward past the WSL vNIC to every NIC on the box. The status line
# prints $script:Bind, so it reported 172.26.128.1 while the live forward bound
# 0.0.0.0 (report/behaviour mismatch, found 2026-09-18).
$proc = Start-Tunnel -Target $target -Port $LocalPort -Bind $script:Bind

Write-Step 'waiting for health through the tunnel'
$deadline = (Get-Date).AddSeconds($HealthTimeoutSeconds)
$healthy = $false
while ((Get-Date) -lt $deadline) {
  if ($proc.HasExited) { throw "TUNNEL_DIED: ssh exited with code $($proc.ExitCode)" }
  if (Test-LocalHealth -Port $LocalPort -Bind $script:Bind) { $healthy = $true; break }
  Start-Sleep -Seconds 3
}

if (-not $healthy) {
  Write-Host ''
  Write-Host "  Model started but /health did not answer within ${HealthTimeoutSeconds}s." -ForegroundColor Yellow
  Write-Step "check the remote log: $target -> C:\swan\hermes-profiles\gsq\logs\gsq.stderr.log"
  exit 4
}

Write-Host ''
Write-Host '  MiniSwan GSQ is ONLINE.'
Write-Step "endpoint        : http://$($script:Bind):$LocalPort/v1"
Write-Step "hermes provider : miniswan-gsq   (aliases: mini-gsq, miniswan-gsq)"
# This banner used to hardcode "64K ctx" and was still saying 64K after the
# profile moved to 81920 (found 2026-09-19). A stale number on the success path is
# worse than no number: it is the line an operator reads to decide the load
# worked. Read the pin instead of restating it, and label it PINNED - the guard
# reports the served value, and this script must not imply it has verified it.
$pinnedCtx = $null
try {
  $pinPath = 'Z:\AI-Runtimes\context-guard\miniswan-profile.json'
  if (Test-Path -LiteralPath $pinPath) {
    $pin = Get-Content -LiteralPath $pinPath -Raw | ConvertFrom-Json
    if ($pin.contextPerSlot) { $pinnedCtx = [int]$pin.contextPerSlot }
  }
} catch { }
Write-Step ("model           : qwen3.8-gsq-rco-mini (pinned ctx " + $(if ($pinnedCtx) { $pinnedCtx } else { 'unknown - profile pin unreadable' }) + ", tools on)")
Write-Step 'ctx note        : pinned value above is what the NEXT load will use; the guard'
Write-Step '                  reports what the running server actually serves.'
Write-Host ''
Write-Host '  Keep this shell open, or the forward closes with it.'
Write-Host '  When finished:  .\scripts\miniswan\miniswan-gsq.ps1 -Mode stop'
exit 0
