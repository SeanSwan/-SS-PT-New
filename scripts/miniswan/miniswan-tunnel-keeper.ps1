<#
.SYNOPSIS
Keeps the MiniSwan GSQ endpoint reachable for Hermes, without a human in the loop.

.DESCRIPTION
Hermes runs inside WSL and reaches the model through http://172.26.128.1:18082.
That listener is an SSH local forward to MiniSwan's llama-server on 127.0.0.1:18081.

miniswan-gsq.ps1 -Mode start opens that forward exactly once and returns. There is
no supervisor, so any transport blip permanently kills the endpoint until somebody
double-clicks "MiniSwan Qwen - LOAD.cmd". Observed 2026-09-18: the tailnet route to
MiniSwan went offline, ssh's keepalive gave up after ~90s, ssh exited, and 18082
stayed dark for hours while the box itself was up and answering on the LAN the whole
time. This keeper exists so that class of failure repairs itself.

Every pass it:
  1. probes http://<wsl-vnic>:18082/health
  2. if healthy, does nothing
  3. if not, tears down any stale half-open forward, picks whichever SSH target
     actually answers THIS pass (LAN first, tailnet only as a fallback - the
     tailnet is the fragile link, not the LAN), makes sure the remote model is
     READY, and re-opens the forward

Remote state recovery is deliberately narrow. MiniSwan's controller refuses both
Start and Stop while its state says READY, which is what happens whenever
llama-server dies without a clean shutdown. The keeper will only clear that state
when all three of these are true:
  - the controller reports a RECOVERY_* code
  - nothing is listening on 18081
  - no llama-server.exe is running
and even then at most once per hour. The old state is never deleted, only renamed to
state.json.stale-<utc>. Pass -NoStateRecovery to disable this entirely.

.PARAMETER Targets
SSH targets in preference order. Default LAN first, tailnet second.

.PARAMETER AllowWake
Send Wake-on-LAN when no target answers, so the endpoint self-heals through
MiniSwan's sleep schedule. Enabled by the launchers (2026-09-19).

This has a real cost and one deliberate escape hatch. Waking MiniSwan leads to
the model being loaded, and the model occupies ~14 GiB of the 4080's VRAM, which
blocks Video Studio renders on that box. So while the hands-off flag file exists
the keeper will NOT wake the host and will NOT start the model - it still repairs
a dead forward to a model that is already up. Create that file before rendering
on MiniSwan; delete it to hand the box back to Hermes.

Wakes are rate-limited: at most one WoL per -WakeCooldownSeconds, and after
-MaxConsecutiveWakes wakes in a row that did not produce a healthy endpoint the
keeper stops waking and says so, rather than broadcasting into an empty room.

.PARAMETER HandsOffFlag
Path to the file that suppresses waking and model starts while it exists.
Defaults to miniswan-hands-off.flag beside this script. Resolved in the body, not
in the param block: $PSScriptRoot is empty at param-bind time under -File.

.PARAMETER NoStateRecovery
Never touch MiniSwan's controller state; just report.

.PARAMETER LocalProfilePath
Source-of-truth profile. The MiniSwan-side copy used to be checked by nothing.
Every -ProfileCheckIntervalSeconds the keeper hashes both copies over SSH and
writes an attestation (remote hash, whether it matched, when it was checked) to
-AttestationPath, logging loudly on drift. checkedUtc is in the file so a
consumer can tell "matched" apart from "not checked since the box slept".

.PARAMETER Once
Run a single repair pass and exit (useful for testing).
#>
[CmdletBinding()]
param(
  [ValidateRange(1024, 65535)]
  [int]$LocalPort = 18082,

  [string]$BindAddress = 'auto',

  [string[]]$Targets = @('miniswan', 'miniswan-net'),

  [string]$Mac = '10-FF-E0-85-27-89',

  [string]$BroadcastAddress = '192.168.50.255',

  # What the wake helper probes for readiness after sending the packet. This must
  # be an address that resolves the SAME WAY the SSH target does - and the bare
  # name 'miniswan' does not. Measured 2026-09-19: C:\Windows\...\etc\hosts maps
  # 'miniswan' to 100.72.20.72 (the TAILNET) while ~/.ssh/config maps Host
  # miniswan to 192.168.50.92 (the LAN). So probing 'miniswan' checked the
  # tailnet, then this keeper verified the LAN with ssh - two different links.
  # Harmless while both are up; if the tailnet is down (the documented fragile
  # link) the helper reports SSH_NOT_READY and the wake looks failed even though
  # the box woke and answered on the LAN. Default matches the default $Targets[0]
  # ('miniswan' -> LAN via ssh config). Override for remote/tailnet operation.
  [string]$WakeProbeHost = '192.168.50.92',

  [string]$RemoteController = 'C:\swan\hermes-profiles\gsq\MiniSwan-GSQ.ps1',

  [int]$IntervalSeconds = 30,

  [int]$HealthTimeoutSeconds = 90,

  [int]$StateRecoveryCooldownSeconds = 3600,

  [switch]$AllowWake,

  [int]$WakeCooldownSeconds = 300,

  [int]$MaxConsecutiveWakes = 6,

  # Resolved in the body: $PSScriptRoot is empty at param-bind time under -File
  # on PS 5.1, and a param default of (Join-Path $PSScriptRoot ...) throws before
  # the script ever runs. That exact bug kept the context-guard dead for ~190
  # scheduled runs; do not reintroduce it here.
  [string]$HandsOffFlag = '',

  [string]$LocalProfilePath = 'Z:\AI-Runtimes\hermes-profiles\miniswan\mini-profile.json',

  [string]$RemoteProfilePath = 'C:\swan\hermes-profiles\gsq\mini-profile.json',

  [string]$AttestationPath = 'Z:\AI-Runtimes\context-guard\miniswan-remote-attestation.json',

  [int]$ProfileCheckIntervalSeconds = 1800,

  # --- served-vs-pinned context reconciliation (added 2026-09-19) --------------
  # The guard owns "does the served configuration match the profile"; the keeper
  # owns "is it reachable". Before this, a profile change was invisible to the
  # only self-healing tool: the keeper only ever called -Mode Start, and the
  # controller refuses Start while its state says READY, so a model running with
  # the OLD context stayed that way forever while the guard reported
  # CTX_BELOW_PINNED and nothing could act on it. Observed live: the 65536 ->
  # 81920 bump sat unapplied for hours.
  #
  # The keeper reads the GUARD's verdict rather than probing /props itself. That
  # keeps one authority for the comparison (a second, independently-derived copy
  # of the same check is how two tools end up contradicting each other) and avoids
  # needing the API key here.
  [string]$GuardStatePath = 'Z:\AI-Runtimes\context-guard\state.json',

  # Refuse to act on a verdict older than this. A stale verdict means the guard
  # stopped running, and reloading a model because of a forgotten file is worse
  # than not reloading it. Same reasoning as the attestation's checkedUtc.
  [int]$GuardVerdictMaxAgeSeconds = 900,

  [int]$CtxReloadCooldownSeconds = 3600,

  [switch]$NoCtxReconcile,

  [switch]$NoStateRecovery,

  [switch]$Once
)

$ErrorActionPreference = 'Continue'
$ProgressPreference    = 'SilentlyContinue'

$LogDir      = Join-Path $PSScriptRoot 'logs'
# Port-scoped, like $StatePath and the mutex below. The default port keeps the
# original file name so every existing reader still finds it; a non-default port
# gets its own file. Without this, the side-by-side test instance that the mutex
# and state scoping exist to make possible appends its lines to the PRODUCTION
# log - i.e. it contaminates the one artifact you are trying to read. Measured
# 2026-09-19: a scratch-port run only avoided that because the whole script had
# been copied to a temp dir; run in place it would have polluted production.
$LogPath     = if ($LocalPort -ne 18082) { Join-Path $LogDir "tunnel-keeper-$LocalPort.log" } else { Join-Path $LogDir 'tunnel-keeper.log' }
# Scoped per port, like the mutex below: a single fixed temp name means two
# keepers on different ports would overwrite each other's forward pid, and then
# "clear stale forwards" would kill the wrong ssh.
$StatePath   = Join-Path ([System.IO.Path]::GetTempPath()) "miniswan-gsq-tunnel-$LocalPort.json"
$Controller  = $RemoteController -replace '\\', '/'

if ([string]::IsNullOrWhiteSpace($HandsOffFlag)) {
  $HandsOffFlag = Join-Path $PSScriptRoot 'miniswan-hands-off.flag'
}

if (-not (Test-Path -LiteralPath $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

function Write-Log([string]$Text) {
  $line = "$((Get-Date).ToUniversalTime().ToString('o'))  $Text"
  Add-Content -LiteralPath $LogPath -Value $line -Encoding utf8
  # Keep the log from growing without bound.
  try {
    if ((Get-Item -LiteralPath $LogPath).Length -gt 512KB) {
      $keep = Get-Content -LiteralPath $LogPath -Tail 400
      Set-Content -LiteralPath $LogPath -Value $keep -Encoding utf8
    }
  } catch { }
}

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
    $inWslBlock = $false
    foreach ($line in (ipconfig)) {
      if ($line -match 'adapter\s') { $inWslBlock = ($line -match 'WSL'); continue }
      if ($inWslBlock -and $line -match 'IPv4 Address[^:]*:\s*([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)') { $ip = $Matches[1]; break }
    }
  }
  return $ip
}

function Test-LocalHealth {
  param([int]$Port, [string]$Bind)
  try {
    $r = Invoke-WebRequest -Uri "http://${Bind}:$Port/health" -TimeoutSec 3 -UseBasicParsing
    return ($r.StatusCode -eq 200)
  } catch { return $false }
}

function Test-SshReady {
  param([string]$Target)
  # A missing or unusable ssh binary must read as "not ready", not as a crash.
  # This probe decides whether to wake, so throwing here would skip the wake
  # entirely and surface as "unexpected error" on every pass instead.
  #
  # BOUNDING (2026-09-19, HY4-R3-6). This call was measured to WEDGE the whole
  # keeper. ssh pid 70564 was spawned at 08:52:41Z, burned 0.03 s of CPU, owned
  # NO socket at all, and had still not exited ~5 h later. `& ssh` blocks until
  # the process exits, so the while-loop never advanced again: the log froze at
  # 08:22:40Z, the keeper never noticed the endpoint go down, and it never woke
  # MiniSwan. ConnectTimeout bounds only the TCP connect - it does nothing once a
  # session exists - and this call had no keepalive and no stdin redirection.
  #   -n                        ssh must not read stdin. A console/pipe stdin that
  #                             never reaches EOF is a documented way to hang ssh.
  #   -o ConnectionAttempts=1   do not silently retry the connect.
  #   -o ServerAliveInterval=5  -o ServerAliveCountMax=2
  #                             a peer that went to sleep mid-session is detected
  #                             in ~10 s instead of never.
  # The MECHANISM of the observed hang is not established (no socket was owned,
  # so it was not stuck in connect()); these flags bound every phase rather than
  # guessing which phase it was.
  try {
    $probe = & ssh -n -o BatchMode=yes -o ConnectTimeout=6 -o ConnectionAttempts=1 `
      -o ServerAliveInterval=5 -o ServerAliveCountMax=2 $Target 'echo READY' 2>&1
    return ($LASTEXITCODE -eq 0) -and (($probe -join ' ') -match 'READY')
  } catch {
    return $false
  }
}

function Invoke-Remote {
  param([string]$Target, [string]$Mode)
  $remote = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$Controller`" -Mode $Mode -Json"
  # -n / ConnectionAttempts=1 for the same reason as Test-SshReady above: every
  # ssh call in this script must be unable to block the loop indefinitely.
  # Keepalive stays generous here because a real -Mode Start can legitimately be
  # silent for ~90 s while the server loads, and the remote sshd answers
  # keepalives regardless of what the command is doing.
  $out = & ssh -n -o BatchMode=yes -o ConnectTimeout=25 -o ConnectionAttempts=1 -o ServerAliveInterval=30 -o ServerAliveCountMax=10 $Target $remote 2>&1
  $text = ($out | Out-String).Trim()
  $json = $null
  try { $json = $text | ConvertFrom-Json } catch { }
  return [pscustomobject]@{ ExitCode = $LASTEXITCODE; Text = $text; Json = $json }
}

function Format-RemoteResult {
  param([object]$Result)
  # The controller answers {status=...; code=...}. Logging `status` alone
  # collapses every distinct refusal to the bare word 'ERROR', which is how a
  # PROFILE_DRIFT deadlock read as an unexplained "controller phase 'ERROR'" in
  # this very log for hours (measured: 2026-09-19T08:22:20Z). `code` is the only
  # field carrying the diagnosis, so it must always be carried through.
  if ($null -eq $Result) { return '(no result)' }
  if ($Result.Json) {
    $s = [string]$Result.Json.status
    $c = [string]$Result.Json.code
    if ($c) { return "$s ($c)" }
    if ($s) { return $s }
  }
  if ($Result.Text) { return [string]$Result.Text }
  return "(exit $($Result.ExitCode), no output)"
}

function Invoke-RemoteProbe {
  param([string]$Target, [string]$Command)
  # This one had NO keepalive at all, so a peer that slept mid-probe left it
  # waiting forever. Same bounding as the other two call sites.
  $out = & ssh -n -o BatchMode=yes -o ConnectTimeout=20 -o ConnectionAttempts=1 -o ServerAliveInterval=10 -o ServerAliveCountMax=2 $Target $Command 2>&1
  return ($out | Out-String).Trim()
}

function Get-LocalSha256 {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  try { return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash } catch { return $null }
}

function Get-RemoteProfileHash {
  param([string]$Target, [string]$RemotePath)
  # certutil rather than powershell: one less quoting layer through ssh, and it
  # ships with every Windows build. The hash lands on its own line as bare hex.
  $raw = Invoke-RemoteProbe -Target $Target -Command "certutil -hashfile `"$RemotePath`" SHA256"
  foreach ($line in ($raw -split "`r?`n")) {
    $t = $line.Trim()
    if ($t -match '^[0-9A-Fa-f]{64}$') { return $t.ToUpperInvariant() }
  }
  return $null
}

function Write-ProfileAttestation {
  param(
    [string]$Path,
    [string]$RemotePath,
    [string]$RemoteHash,
    [string]$ExpectedHash,
    [bool]$Reachable
  )
  $obj = [ordered]@{
    checkedUtc     = (Get-Date).ToUniversalTime().ToString('o')
    checkedBy      = 'miniswan-tunnel-keeper'
    reachable      = $Reachable
    remotePath     = $RemotePath
    remoteSha256   = $RemoteHash
    expectedSha256 = $ExpectedHash
    matches        = ($null -ne $RemoteHash -and $null -ne $ExpectedHash -and $RemoteHash -eq $ExpectedHash)
  }
  try {
    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $tmp = $Path + '.tmp-' + [guid]::NewGuid().ToString('N').Substring(0, 8)
    Set-Content -LiteralPath $tmp -Value ($obj | ConvertTo-Json -Depth 5 -Compress) -Encoding UTF8
    Move-Item -LiteralPath $tmp -Destination $Path -Force
  } catch {
    Write-Log "attestation write failed: $($_.Exception.Message)"
  }
  return $obj
}

function Resolve-ReachableTarget {
  param([string[]]$Candidates)
  foreach ($t in $Candidates) { if (Test-SshReady -Target $t) { return $t } }
  return $null
}

function Invoke-ProfilePinCheck {
  param([string]$Target, [string]$LocalPath, [string]$RemotePath, [string]$AttPath)
  $expected = Get-LocalSha256 -Path $LocalPath
  $remote   = Get-RemoteProfileHash -Target $Target -RemotePath $RemotePath
  $att = Write-ProfileAttestation -Path $AttPath -RemotePath $RemotePath `
           -RemoteHash $remote -ExpectedHash $expected -Reachable ($null -ne $remote)

  if ($null -eq $expected) {
    Write-Log "profile pin: local source of truth missing ($LocalPath); cannot compare"
  } elseif ($null -eq $remote) {
    Write-Log "profile pin: could not read remote profile ($RemotePath); attestation marked unreachable"
  } elseif ($att.matches) {
    Write-Log "profile pin OK: MiniSwan copy matches the source of truth ($($expected.Substring(0, 8))...)"
  } else {
    Write-Log "PROFILE DRIFT: MiniSwan copy $($remote.Substring(0, 8))... != source of truth $($expected.Substring(0, 8))... - propagate the profile, then update the pin"
  }
  return $att
}

function Get-GuardVerdict {
  # Read the guard's published verdict instead of re-deriving the configuration
  # check here. Returns $null when there is no usable verdict, so every caller has
  # to decide explicitly what to do about not knowing.
  if (-not (Test-Path -LiteralPath $GuardStatePath)) { return $null }
  try { $s = Get-Content -LiteralPath $GuardStatePath -Raw | ConvertFrom-Json } catch { return $null }
  if (-not $s.report) { return $null }

  $ts = $null
  try { $ts = ([datetime]$s.report.timestampUtc).ToUniversalTime() } catch { $ts = $null }
  if (-not $ts) { return $null }

  $findings = @()
  if ($s.report.verdict -and $s.report.verdict.findings) { $findings = @($s.report.verdict.findings) }
  $level = $null
  if ($s.report.verdict) { $level = $s.report.verdict.level }

  return [pscustomobject]@{
    TimestampUtc = $ts
    AgeSeconds   = ((Get-Date).ToUniversalTime() - $ts).TotalSeconds
    Level        = $level
    Findings     = $findings
  }
}

function Invoke-CtxReconcile {
  param([string[]]$Candidates)

  # A profile change is only read at load time, so a model already running keeps
  # serving the OLD context indefinitely. Nothing else in this system can fix
  # that: the guard can only report it. This is the missing half.
  $v = Get-GuardVerdict
  if (-not $v) {
    Write-Log 'ctx reconcile: no readable guard verdict; skipping'
    return
  }
  if ($v.AgeSeconds -gt $GuardVerdictMaxAgeSeconds) {
    Write-Log ("ctx reconcile: guard verdict is stale ({0}s old, limit {1}s) - not acting on it" -f [int]$v.AgeSeconds, $GuardVerdictMaxAgeSeconds)
    return
  }
  # BOTH directions. A pinned ceiling that moves either way is the same class of
  # change - "the running server no longer matches the pin" - and applying it is
  # this function's entire job. CTX_ABOVE_PINNED is only a level-1 note in the
  # guard (BELOW is level 2), but the keeper acts on the CONDITION, not on the
  # severity: a reload is what clears either one. Matching only BELOW meant a
  # lowered pin sat unapplied exactly the way a raised one did.
  $hit = @($v.Findings | Where-Object { $_ -match 'CTX_BELOW_PINNED|CTX_ABOVE_PINNED' })
  if ($hit.Count -eq 0) { return }

  $now = Get-Date
  # $script: on the read AND the write. A bare assignment inside a function creates
  # a function-local, so the cooldown would never engage and this would reload the
  # model on every single pass - the worst possible failure for a feature whose
  # whole job is to touch the model rarely.
  if ($script:lastCtxReloadUtc -and (($now - $script:lastCtxReloadUtc).TotalSeconds -lt $CtxReloadCooldownSeconds)) {
    Write-Log ("ctx reconcile: suppressed by cooldown ({0}s)" -f $CtxReloadCooldownSeconds)
    return
  }
  if (Test-Path -LiteralPath $HandsOffFlag) {
    Write-Log "ctx reconcile: needed, but the hands-off flag is present ($HandsOffFlag) - not reloading"
    return
  }

  $target = Resolve-ReachableTarget -Candidates $Candidates
  if (-not $target) {
    Write-Log 'ctx reconcile: needed, but no SSH target is reachable; deferring'
    return
  }

  Write-Log "ctx reconcile: $($hit[0])"
  Write-Log "ctx reconcile: reloading via $target (Stop -> Start; a profile change is only read at load time)"
  $stop = Invoke-Remote -Target $target -Mode 'Stop'
  Write-Log ("ctx reconcile: stop result: " + (Format-RemoteResult $stop))
  # The controller needs a moment to release port 18081 and rewrite state.json; an
  # immediate Start can land on a still-READY state and be refused.
  Start-Sleep -Seconds 5
  $start = Invoke-Remote -Target $target -Mode 'Start'
  Write-Log ("ctx reconcile: start result: " + (Format-RemoteResult $start))

  $phase = if ($start.Json) { [string]$start.Json.status } else { '' }
  $code  = if ($start.Json) { [string]$start.Json.code }   else { '' }

  if ($phase -in @('READY', 'ALREADY_READY')) {
    $script:lastCtxReloadUtc = $now
    Write-Log 'ctx reconcile: reload issued and the controller reports READY. The forward is re-opened by the normal repair pass, and the guard is the one that confirms whether the served context now matches the pin.'
    return
  }

  # NOT reloaded. The previous version logged "reload issued" and armed the
  # 3600 s cooldown unconditionally, so a reload that never happened read exactly
  # like one that did - once an hour, forever (HY4-R3-1).
  #
  # The structural case: the controller refuses Stop AND Start while its recorded
  # profileSha256 no longer matches the profile on disk, which is precisely the
  # state a profile edit creates. Read-State throws PROFILE_DRIFT (line ~66) and
  # its own catch rethrows RECOVERY_REQUIRED_MALFORMED_STATE, so the useful word
  # never surfaces - the log must therefore carry `code` verbatim.
  #
  # The keeper CANNOT clear this by itself. Its Test-RecoveryProvablyStale helper
  # requires nothing listening on 18081 AND no llama-server process, i.e. the
  # model must be DOWN; here the model is ALIVE and serving the old context, which
  # is the opposite. Proven from this keeper's own log: the recovery path worked
  # at 2026-09-19T08:22:21Z ("remote state is provably stale; renaming
  # state.json") only because the server was genuinely down at that moment.
  if ($code -match 'RECOVERY_|PROFILE_DRIFT|MALFORMED_STATE') {
    $script:lastCtxReloadUtc = $now
    Write-Log 'ctx reconcile: BLOCKED - the controller refused both Stop and Start, so NOTHING WAS RELOADED. This is the profile-drift deadlock: state.json records the pre-change profileSha256, Read-State fails PROFILE_DRIFT, and its catch masks that as RECOVERY_REQUIRED_MALFORMED_STATE. The server is still alive on 18081, so Test-RecoveryProvablyStale cannot clear it either (that predicate needs the model DOWN). Applying the change needs the controller fix (Invoke-Stop must be able to read state without the profile-hash check) or a manual verified stop. Cooldown armed; not retrying every pass.'
    return
  }

  # Transient (ssh/network/controller-query failure). Leave the cooldown UNARMED
  # so the next pass retries, and say plainly that the reload did not happen.
  Write-Log ("ctx reconcile: reload did NOT complete (start result '$phase'" + $(if ($code) { ", code '$code'" } else { '' }) + '); cooldown left unarmed so the next pass retries')
}

function Stop-StaleForwards {
  param([int]$Port)
  $killed = @()
  if (Test-Path -LiteralPath $StatePath) {
    try {
      $state = Get-Content -LiteralPath $StatePath -Raw | ConvertFrom-Json
      $p = Get-Process -Id ([int]$state.pid) -ErrorAction SilentlyContinue
      if ($p -and $p.ProcessName -eq 'ssh') { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue; $killed += $p.Id }
    } catch { }
    Remove-Item -LiteralPath $StatePath -Force -ErrorAction SilentlyContinue
  }
  Get-CimInstance Win32_Process -Filter "Name='ssh.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match [regex]::Escape(":$Port`:") } |
    ForEach-Object {
      if ($killed -notcontains $_.ProcessId) {
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
        $killed += $_.ProcessId
      }
    }
  return $killed
}

function Start-Forward {
  param([string]$Target, [int]$Port, [string]$Bind)
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
  @{
    pid         = $proc.Id
    target      = $Target
    bindAddress = $Bind
    localPort   = $Port
    startedUtc  = (Get-Date).ToUniversalTime().ToString('o')
    keeper      = $true
  } | ConvertTo-Json | Set-Content -LiteralPath $StatePath -Encoding utf8
  return $proc
}

function Test-RecoveryProvablyStale {
  param([string]$Target)
  # Triple condition: controller says RECOVERY, nothing on 18081, no server process.
  $listener = Invoke-RemoteProbe -Target $Target -Command 'netstat -ano | findstr :18081'
  if ($listener) { return $false }
  $proc = Invoke-RemoteProbe -Target $Target -Command 'powershell -NoProfile -Command "(Get-Process llama-server -ErrorAction SilentlyContinue | Measure-Object).Count"'
  if ($proc -match '^\d+$' -and [int]$proc -gt 0) { return $false }
  return $true
}

function Reset-RemoteState {
  param([string]$Target)
  $stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
  $cmd = "powershell -NoProfile -Command `"if (Test-Path 'C:\swan\hermes-profiles\gsq\state.json') { Move-Item -LiteralPath 'C:\swan\hermes-profiles\gsq\state.json' -Destination 'C:\swan\hermes-profiles\gsq\state.json.stale-$stamp' -Force }; if (Test-Path 'C:\swan\hermes-profiles\gsq\state.json') { 'STILL_PRESENT' } else { 'STATE_CLEARED' }`""
  return (Invoke-RemoteProbe -Target $Target -Command $cmd)
}

# ---------------------------------------------------------------- single instance
# The production port keeps the ORIGINAL global mutex name. That matters: a keeper
# started before this change (2026-09-19) holds that name, so a new one started
# while it is still running would otherwise acquire a different mutex, run
# alongside it, and fight it for the same forward - each killing the other's ssh.
# Keeping the legacy name on 18082 makes the old and new keepers mutually
# exclusive, which is what lets this ship without a restart-then-relaunch dance.
# Only non-default ports get their own mutex, and that is what makes a
# side-by-side test instance possible without a bypass switch.
$mutexName = 'Global\MiniSwanTunnelKeeper-v1'
if ($LocalPort -ne 18082) { $mutexName = "$mutexName-$LocalPort" }
$mutexCreated = $false
$mutex = New-Object Threading.Mutex($false, $mutexName, [ref]$mutexCreated)
try {
  if (-not $mutex.WaitOne(0)) {
    Write-Log 'another keeper instance is already running; exiting'
    Write-Host ''
    Write-Host '  Another keeper is already running for this port - nothing to do.'
    Write-Host '  (To replace an older keeper, close its window first, then relaunch this.)'
    Write-Host ''
    exit 0
  }
}
catch [Threading.AbandonedMutexException] { }

Write-Log "keeper started (pid $PID, port $LocalPort, targets $($Targets -join ','))"

$bind = Resolve-BindAddress -Requested $BindAddress
if (-not $bind) {
  Write-Log 'FATAL: no vEthernet (WSL) IPv4 address; cannot bind where Hermes can reach. Exiting.'
  exit 2
}
Write-Log "bind address resolved: $bind"
# The keeper otherwise writes only to its log, so a clicked launcher window would
# show nothing but "Keeper exited." - indistinguishable from a failure.
Write-Host ''
Write-Host "  MiniSwan keeper running (pid $PID) on ${bind}:$LocalPort"
Write-Host '  Leave this window open. It re-opens the SSH forward if it drops, and'
Write-Host '  wakes MiniSwan if the box is asleep (unless the hands-off flag is set).'
Write-Host "  Log: $LogPath"
Write-Host ''

$lastRecoveryUtc     = $null
$lastWakeUtc         = $null
$consecutiveWakes    = 0
$lastProfileCheckUtc = $null
$lastCtxCheckUtc     = $null
$script:lastCtxReloadUtc = $null

while ($true) {
  try {
    if (Test-LocalHealth -Port $LocalPort -Bind $bind) {
      $consecutiveWakes = 0
      # Periodic pin check while everything is healthy - the quiet moment, and the
      # only one where the remote profile can be read without a repair in flight.
      $now = Get-Date
      if ((-not $lastProfileCheckUtc) -or (($now - $lastProfileCheckUtc).TotalSeconds -ge $ProfileCheckIntervalSeconds)) {
        $pinTarget = Resolve-ReachableTarget -Candidates $Targets
        if ($pinTarget) {
          Invoke-ProfilePinCheck -Target $pinTarget -LocalPath $LocalProfilePath `
            -RemotePath $RemoteProfilePath -AttPath $AttestationPath | Out-Null
          $lastProfileCheckUtc = $now
        }
      }

      # ---- served-vs-pinned context reconciliation
      # Only worth asking while the endpoint is HEALTHY. An unhealthy endpoint is
      # already the repair path's business below, and reloading a model that is
      # mid-repair would fight it. Shares the pin-check interval because both are
      # "quiet moment" inspections.
      if (-not $NoCtxReconcile) {
        if ((-not $lastCtxCheckUtc) -or (($now - $lastCtxCheckUtc).TotalSeconds -ge $ProfileCheckIntervalSeconds)) {
          Invoke-CtxReconcile -Candidates $Targets
          $lastCtxCheckUtc = $now
        }
      }

      if ($Once) { Write-Log "healthy on $bind`:$LocalPort; no action needed"; break }
      Start-Sleep -Seconds $IntervalSeconds
      continue
    }

    Write-Log "endpoint DOWN on $bind`:$LocalPort - starting repair"

    $killed = Stop-StaleForwards -Port $LocalPort
    if ($killed.Count) { Write-Log "cleared stale forward(s): pid $($killed -join ',')" }

    $target  = Resolve-ReachableTarget -Candidates $Targets
    $handsOff = Test-Path -LiteralPath $HandsOffFlag

    if (-not $target -and $handsOff) {
      Write-Log "no target answered, and the hands-off flag is present ($HandsOffFlag) - not waking MiniSwan"
    }
    elseif (-not $target -and $AllowWake) {
      $now = Get-Date
      $wakeDue = (-not $lastWakeUtc) -or (($now - $lastWakeUtc).TotalSeconds -ge $WakeCooldownSeconds)
      if (-not $wakeDue) {
        Write-Log "wake suppressed by cooldown (${WakeCooldownSeconds}s)"
      } elseif ($consecutiveWakes -ge $MaxConsecutiveWakes) {
        Write-Log "wake suppressed: $consecutiveWakes consecutive wakes with no healthy endpoint; not broadcasting into an empty room"
      } else {
        $consecutiveWakes++
        Write-Log "no target answered; sending WoL $Mac -> $BroadcastAddress (wake $consecutiveWakes/$MaxConsecutiveWakes)"
        $wakeScript = Join-Path $PSScriptRoot 'miniswan-wake.ps1'
        $wakeArgs = @(
          '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $wakeScript,
          '-Mac', $Mac, '-BroadcastAddress', $BroadcastAddress,
          '-ProbeHost', $WakeProbeHost, '-WaitSeconds', '60'
        )
        # Deliberately NOT piped. `& powershell.exe ... | Out-Null` throws
        # "Cannot run a document in the middle of a pipeline" on PS 5.1
        # (measured 2026-09-19), which aborted the pass before any packet left
        # the machine. The old form also discarded the wake script's output, so
        # a wake that never happened looked exactly like one that worked - and
        # because -AllowWake was off by default, this line had never actually
        # run in production. Capture it and log the exit code.
        $wakeOut  = & powershell.exe @wakeArgs 2>&1
        $wakeCode = $LASTEXITCODE
        $wakeText = ($wakeOut | Out-String).Trim()
        Write-Log "wol result: exit=$wakeCode $(if ($wakeText) { $wakeText } else { '(no output)' })"
        # "exit= (no output)" is AMBIGUOUS, and that ambiguity was measured to be
        # real: `& powershell.exe ...` returns in 43 ms with an empty
        # $LASTEXITCODE and no output when the spawn is silently swallowed, which
        # produces the identical log line to a wake that ran and had nothing to
        # say. Assert on the one line the helper always emits - it prints WOL_SENT
        # once per UDP port immediately after sending - so a wake that did not
        # happen cannot read as one that did. (This is also what voided the
        # 2026-09-19 TEST D result: its line was 146 ms after the wake decision,
        # and a real wake is a cold start plus a 60 s SSH probe.)
        if (-not (@($wakeOut) -match 'WOL_SENT')) {
          Write-Log "WAKE NOT PROVEN: the wake helper reported no WOL_SENT (exit=$wakeCode). Treat this wake as NOT SENT, not as a quiet success."
        }
        $lastWakeUtc = $now
        $target = Resolve-ReachableTarget -Candidates $Targets
      }
    }

    if (-not $target) {
      Write-Log 'no SSH target reachable (MiniSwan asleep or off-network); will retry'
      if ($Once) { break }
      Start-Sleep -Seconds $IntervalSeconds
      continue
    }
    Write-Log "ssh target: $target"

    # ---- periodic profile pin check (an SSH session is already open here)
    $now = Get-Date
    if ((-not $lastProfileCheckUtc) -or (($now - $lastProfileCheckUtc).TotalSeconds -ge $ProfileCheckIntervalSeconds)) {
      Invoke-ProfilePinCheck -Target $target -LocalPath $LocalProfilePath `
        -RemotePath $RemoteProfilePath -AttPath $AttestationPath | Out-Null
      $lastProfileCheckUtc = $now
    }

    # ---- make sure the model itself is up
    $status = Invoke-Remote -Target $target -Mode 'Status'
    $phase = ''
    if ($status.Json) { $phase = [string]$status.Json.status }
    # Carry the controller's `code` through every branch that reports the phase.
    # Logging `status` alone collapsed a precise refusal to a bare 'ERROR' - the
    # 2026-09-19T08:22:20Z line "controller phase 'ERROR' - attempting Start" is
    # exactly that, and it hid a RECOVERY_REQUIRED_MALFORMED_STATE for hours.
    $statusDesc = Format-RemoteResult $status

    if ($handsOff -and $phase -notin @('READY', 'ALREADY_READY')) {
      Write-Log "hands-off flag present; not starting the model (controller reports '$statusDesc'), so there is nothing to forward to"
      if ($Once) { break }
      Start-Sleep -Seconds $IntervalSeconds
      continue
    }

    if ($phase -notin @('READY', 'ALREADY_READY')) {
      Write-Log "controller reports '$statusDesc' - attempting Start"
      $start = Invoke-Remote -Target $target -Mode 'Start'
      $startPhase = if ($start.Json) { [string]$start.Json.status } else { '' }
      Write-Log ("start result: " + (Format-RemoteResult $start))

      if ($startPhase -notin @('READY', 'ALREADY_READY') -and -not $NoStateRecovery) {
        # Match the CODE too, not just the raw text: `RECOVERY_REQUIRED_MALFORMED_STATE`
        # is what Read-State's catch substitutes for PROFILE_DRIFT, so a drifted
        # profile reaches this branch looking like an ordinary recovery case.
        $stuck = ($start.Text -match 'RECOVERY_')
        if ($stuck) {
          $now = Get-Date
          $due = (-not $lastRecoveryUtc) -or (($now - $lastRecoveryUtc).TotalSeconds -ge $StateRecoveryCooldownSeconds)
          if ($due) {
            if (Test-RecoveryProvablyStale -Target $target) {
              Write-Log 'remote state is provably stale; renaming state.json and retrying Start'
              Write-Log ("reset: " + (Reset-RemoteState -Target $target))
              $lastRecoveryUtc = $now
              $retry = Invoke-Remote -Target $target -Mode 'Start'
              Write-Log ("retry result: " + (Format-RemoteResult $retry))
            } else {
              Write-Log 'RECOVERY reported but state is not provably stale; leaving MiniSwan alone. (This is also what a PROFILE_DRIFT deadlock looks like from here: the model is still alive on 18081, so the staleness predicate cannot pass. If the guard is reporting CTX_BELOW_PINNED/CTX_ABOVE_PINNED at the same time, the profile was edited and only a verified stop will apply it.)'
            }
          } else {
            Write-Log 'state recovery suppressed by cooldown'
          }
        }
      }
    }

    # ---- re-open the forward
    Write-Log "opening forward ${bind}:$LocalPort -> ${target}:127.0.0.1:18081"
    $proc = Start-Forward -Target $target -Port $LocalPort -Bind $bind

    $deadline = (Get-Date).AddSeconds($HealthTimeoutSeconds)
    $ok = $false
    while ((Get-Date) -lt $deadline) {
      if ($proc.HasExited) { Write-Log "ssh exited early with code $($proc.ExitCode)"; break }
      if (Test-LocalHealth -Port $LocalPort -Bind $bind) { $ok = $true; break }
      Start-Sleep -Seconds 3
    }

    if ($ok) { Write-Log "REPAIRED - endpoint healthy on $bind`:$LocalPort via $target" }
    else { Write-Log "repair failed; endpoint still down (remote may still be loading)" }

    if ($Once) { break }
    Start-Sleep -Seconds $IntervalSeconds
  }
  catch {
    Write-Log "unexpected error: $($_.Exception.Message)"
    if ($Once) { break }
    Start-Sleep -Seconds $IntervalSeconds
  }
}

Write-Log 'keeper exiting'
