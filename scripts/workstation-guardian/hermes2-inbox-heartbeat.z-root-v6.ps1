# Hermes inbox heartbeat v6 (Z:\HermesInbox canonical root). Scheduled every four hours
# through a hidden VBS host.
#
# WHY v6 EXISTS -- AND WHY IT IS A MERGE, NOT A REWRITE
# ----------------------------------------------------
# Two agent sessions repaired this pipeline within minutes of each other on 2026-09-19 and
# picked CONTRADICTORY canonical roots. The result was a split-brain: the drain hook read
# Z:, the heartbeat and the producer read C:. Every component passed its own test and the
# system as a whole was incoherent. v6 exists to end that with ONE declared root.
#
# v6 keeps the best work from BOTH lines and records which is which:
#
#   FROM v3/v4/v5 (the C: line) -- kept, because they were right and this file was not:
#     * Get-LegacyPendingDirs globs 'pending' AND 'RETIRED-*-pending'. v3 watched only
#       '<legacy>\pending'; the migration had renamed those children to
#       'RETIRED-20260919-pending', so v3's adoption net matched NOTHING at all three roots.
#       A safety net that cannot see what it protects is worse than none, because it is
#       trusted. This was a real defect in v3 and it is fixed here.
#     * Get-Health falls back to C:\tmp\hermes2-inbox-heartbeat.HEALTH.json when the in-root
#       record is absent. Without this the failure counter is 0 on EVERY run while the root
#       is unreachable -- the in-root file is exactly what cannot be written -- so
#       consecutive_failures could only ever reach 1 and the alert threshold of 2 was
#       UNREACHABLE BY CONSTRUCTION. The heartbeat failed 30 consecutive runs and never
#       once alerted. This was a real defect in v3 and it is fixed here.
#     * A stray that is BYTE-IDENTICAL to a memo already in pending/ is dropped, not
#       adopted under a synthetic GUID name. v3's collision guard would have re-delivered a
#       memo Hermes already had, under a name that hides the duplication.
#
#   FROM THIS LINE (Z:) -- the canonical root, on the operator's explicit instruction:
#     * Z: is a LOCAL FIXED NTFS volume (DriveType=Fixed, 3726 GB, 677 GB free), not a
#       network mapping: HKCU:\Network holds only 'W'. There is no availability penalty
#       versus C:.
#     * WSL reads and writes /mnt/z -- proven, not inferred: Z:\mobbin-library\milk-loop.log
#       carries a Linux traceback ('/usr/lib/python3.10/urllib/request.py'), written by
#       Ubuntu's python on 2026-09-18. The drain hook runs in WSL and can reach this root.
#     * C: is 99% full (12.7 GB free of 930 GB). The archive does not belong there.
#
# v6 CHANGES OVER v3:
#   1. Canonical root is Z:\HermesInbox. ONE root, declared once, no candidate list. An
#      empty inbox and an unreadable inbox are different states and render differently.
#   2. NO '-File' OR '-Directory' ANYWHERE. These are FileSystem-provider DYNAMIC
#      parameters. When a path's drive cannot be resolved they are absent from the
#      parameter set, so binding fails with ParameterBindingException -- and -ErrorAction
#      CANNOT suppress that, because binding happens before the cmdlet runs. Filter on
#      PSIsContainer instead. Verified: with -ErrorAction Stop the enumeration still
#      throws DriveNotFoundException on a vanished drive, so loudness is preserved.
#   3. An enumeration failure is COUNTED (legacy_scan_faults), never rendered as an empty
#      result. A bare 'catch { }' or 'SilentlyContinue' around a directory scan converts
#      "I could not look" into "there was nothing there" -- the exact conflation that let
#      this pipeline die unnoticed for twelve days.
#   4. legacy_duplicate is actually threaded through and reported (v5 computed it and then
#      dropped it: it was passed as a ninth positional argument to an eight-parameter
#      function, which PowerShell discards silently, so the key was always null).
#
# Preserved from v1..v5: single-instance mutex, no-memo short circuit, workstation busy
# deferral, local-only privacy contract, structured provider gate that fails CLOSED,
# prompt-file cleanup, append-only log, UNREACHABLE as its own outcome, a fallback health
# record outside the root, alerting after consecutive failures.
#
# Keep this file ASCII-only. PowerShell 5.1 reads BOM-less files as ANSI; non-ASCII bytes
# in a .ps1 break parsing on this machine (hit repeatedly in the v4.7 campaign).

$ErrorActionPreference = 'Stop'

$Distro       = 'Ubuntu-22.04'
$Runner       = '/mnt/c/tmp/hermes2-local-prompt-runner.py'
$Probe        = '/mnt/c/tmp/hermes2-inbox-provider-probe.sh'
$HermesPython = '/home/bigotsmasher/hermes2/hermes-agent/venv/bin/python'
$GuardianRoot = 'C:\tmp\SwanWorkstationGuardian'
$Log          = 'C:\tmp\hermes2-inbox-heartbeat.log'
$AlertFile    = 'C:\tmp\hermes2-inbox-heartbeat.ALERT'
$FallbackHealth = 'C:\tmp\hermes2-inbox-heartbeat.HEALTH.json'
$AlertAfter   = 2

# THE inbox. One root, declared once. Nothing else is ever read or written.
# Z: is a local fixed NTFS volume. WSL mounts it at /mnt/z (proven by WSL-written logs).
$InboxRoot    = 'Z:\HermesInbox'

# Roots the pipeline USED to live at. Never used for reading or writing; only watched, so
# a memo aimed at a retired path is adopted instead of lost. Each entry is a PARENT whose
# 'pending' child may carry either its original name or a RETIRED-* rename.
# Add a line here whenever a root is retired -- a retired root nobody watches is how
# memos disappear.
$LegacyRoots = @(
  'C:\Users\BigotSmasher\Desktop\@Everything\quick-pt\SS-PT\.ai-workflow\hermes-inbox',
  'C:\tmp\.ai-workflow\hermes-inbox',
  'C:\tmp\.ai-workflow\RETIRED-20260919-hermes-inbox',
  'C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\.ai-workflow\hermes-inbox'
)

# Incremented whenever a legacy scan cannot be performed. Reported in HEALTH.json so that
# "no strays found" can never be confused with "could not look for strays".
$script:LegacyScanFaults = 0

function Write-HeartbeatLog([string]$Message) {
  "$(Get-Date -Format o) $Message" | Add-Content -LiteralPath $Log
}

function Resolve-InboxRoot {
  # HERMES_INBOX_ROOT is AUTHORITATIVE when set (tests, relocation). It is never a
  # "prefer it if it happens to exist" hint: naming one inbox and quietly reading
  # another is the silent-substitution bug that started this whole failure chain.
  if ($env:HERMES_INBOX_ROOT -and $env:HERMES_INBOX_ROOT.Trim() -ne '') {
    return $env:HERMES_INBOX_ROOT.Trim()
  }
  return $InboxRoot
}

function Initialize-InboxRoot([string]$Root) {
  # Returns $true only if the canonical root is actually usable. A failure here is
  # UNREACHABLE, not EMPTY, and the caller must not fall back to another root.
  try {
    foreach ($d in @('pending', 'consumed', 'outbox\pending', 'outbox\consumed')) {
      New-Item -ItemType Directory -Force -Path (Join-Path $Root $d) -ErrorAction Stop | Out-Null
    }
    $probe = Join-Path $Root '.write-probe'
    [IO.File]::WriteAllText($probe, 'ok')
    # The probe is left in place and NEVER deleted. A host-level 'safe-delete' guard vetoes
    # Remove-Item with a terminating error that escapes BOTH -ErrorAction SilentlyContinue
    # and a surrounding try/catch, which made this function report UNREACHABLE for a root
    # that had just accepted a successful write (measured 2026-09-19T01:36:23:
    # [safe-delete][SAFE_DELETE_BULK_GUARD_ERROR] bulk delete guard blocked deletion).
    # Not deleting removes the failure mode instead of trying to catch it. The probe is a
    # dot-file, so every memo filter skips it, and it is overwritten on each run.
    return $true
  } catch {
    Write-HeartbeatLog "unreachable: canonical inbox root $Root is not usable: $($_.Exception.Message)"
    return $false
  }
}

function Get-MemoFiles([string]$Dir, [switch]$Strict) {
  # Memos in a directory. Deliberately does NOT use -File: that is a FileSystem-provider
  # dynamic parameter and is ABSENT from the parameter set when the drive cannot be
  # resolved, so it raises ParameterBindingException that -ErrorAction cannot suppress.
  # Filtering on PSIsContainer leaves the enumeration as the only failure mode, which
  # -ErrorAction does govern. Verified: -Strict throws DriveNotFoundException on a
  # vanished drive, so a mid-run drive loss is loud rather than an empty result.
  $ea = 'Continue'
  if ($Strict) { $ea = 'Stop' }
  return @(Get-ChildItem -LiteralPath $Dir -Filter *.md -ErrorAction $ea |
    Where-Object {
      -not $_.PSIsContainer -and
      $_.Name -ne 'ENTRY-TEMPLATE.md' -and
      -not $_.Name.StartsWith('.')
    })
}

function Get-LegacyPendingDirs([string]$LegacyRoot) {
  # A retired root's pending dir may carry its original name OR a RETIRED-* rename.
  # v3 watched only 'pending' and so matched nothing after the migration renamed it.
  $dirs = @()
  $plain = Join-Path $LegacyRoot 'pending'
  if (Test-Path -LiteralPath $plain -PathType Container) { $dirs += $plain }
  try {
    $dirs += @(Get-ChildItem -LiteralPath $LegacyRoot -ErrorAction Stop |
      Where-Object { $_.PSIsContainer -and $_.Name -like 'RETIRED-*-pending' } |
      ForEach-Object { $_.FullName })
  } catch {
    $script:LegacyScanFaults = $script:LegacyScanFaults + 1
    Write-HeartbeatLog "fault: cannot enumerate legacy root $LegacyRoot : $($_.Exception.Message)"
  }
  return $dirs
}

function Adopt-LegacyMemos([string]$PendingDir) {
  # Move strays from retired roots into the canonical pending/. Logged per memo, and
  # counted in HEALTH.json -- visible repair, never a silent substitution.
  # Returns @{ Found; Adopted; Duplicate; Pending; Faults }.
  $adopted = 0
  $found = 0
  $duplicate = 0
  foreach ($legacy in $LegacyRoots) {
    if (-not (Test-Path -LiteralPath $legacy -PathType Container)) { continue }
    foreach ($lp in (Get-LegacyPendingDirs $legacy)) {
      $strays = @()
      try {
        $strays = @(Get-MemoFiles -Dir $lp -Strict)
      } catch {
        # "could not look" is NOT "there was nothing there".
        $script:LegacyScanFaults = $script:LegacyScanFaults + 1
        Write-HeartbeatLog "fault: cannot list strays in $lp : $($_.Exception.Message)"
        continue
      }
      foreach ($s in $strays) {
        $found = $found + 1
        try {
          $target = Join-Path $PendingDir $s.Name
          if (Test-Path -LiteralPath $target) {
            # A stray that is BYTE-IDENTICAL to one already in pending/ is the same memo
            # seen twice (copied into both roots, not a new packet). Adopting it under a
            # synthetic name would inflate pending_count with junk and re-deliver a memo
            # Hermes already has. Identical -> drop the stray (zero information loss).
            # Different -> keep BOTH, under a distinct name: a same-named memo with
            # different content is two claims, and discarding one would lose a packet.
            $identical = $false
            try {
              $h1 = (Get-FileHash -LiteralPath $s.FullName -Algorithm SHA256).Hash
              $h2 = (Get-FileHash -LiteralPath $target   -Algorithm SHA256).Hash
              $identical = ($h1 -eq $h2)
            } catch { $identical = $false }
            if ($identical) {
              # Do NOT delete. A host-level 'safe-delete' guard vetoes Remove-Item with a
              # terminating error that escapes BOTH -ErrorAction and try/catch (measured
              # 2026-09-19T01:36:23). A veto here would abort the entire adoption net --
              # the one mechanism that keeps a memo from being lost while the root is
              # contested. Move the stray aside instead: a rename is not a deletion, the
              # bytes survive for audit, and the stray still leaves the legacy pending dir.
              $dupeDir = Join-Path (Split-Path $PendingDir -Parent) '.dupes'
              if (-not (Test-Path -LiteralPath $dupeDir -PathType Container)) {
                New-Item -ItemType Directory -Force -Path $dupeDir | Out-Null
              }
              Move-Item -LiteralPath $s.FullName -Destination (Join-Path $dupeDir $s.Name) -Force -ErrorAction Stop
              $duplicate = $duplicate + 1
              Write-HeartbeatLog "legacy stray is a byte-identical copy of a pending memo; stray moved to .dupes: $($s.Name)"
              continue
            }
            $target = Join-Path $PendingDir ("{0}-{1}" -f [guid]::NewGuid().ToString('N').Substring(0, 8), $s.Name)
            Write-HeartbeatLog "WARN legacy stray differs from same-named pending memo; adopting BOTH: $($s.Name)"
          }
          Move-Item -LiteralPath $s.FullName -Destination $target -Force -ErrorAction Stop
          $adopted = $adopted + 1
          Write-HeartbeatLog "WARN legacy memo adopted from $lp : $($s.Name)"
        } catch {
          Write-HeartbeatLog "WARN could not adopt legacy memo $($s.FullName): $($_.Exception.Message)"
        }
      }
    }
  }
  # Anything still sitting in a retired root after the move attempt. Non-zero is a fault.
  $leftover = 0
  foreach ($legacy in $LegacyRoots) {
    if (-not (Test-Path -LiteralPath $legacy -PathType Container)) { continue }
    foreach ($lp in (Get-LegacyPendingDirs $legacy)) {
      try {
        $leftover += @(Get-MemoFiles -Dir $lp -Strict).Count
      } catch {
        $script:LegacyScanFaults = $script:LegacyScanFaults + 1
        Write-HeartbeatLog "fault: cannot recount strays in $lp : $($_.Exception.Message)"
      }
    }
  }
  if ($leftover -gt 0) {
    Write-HeartbeatLog "WARN legacy_pending=$leftover memo(s) still in retired roots after adoption"
  }
  return @{
    Found     = $found
    Adopted   = $adopted
    Duplicate = $duplicate
    Pending   = $leftover
    Faults    = $script:LegacyScanFaults
  }
}

function Get-Health([string]$Root) {
  $f = Join-Path $Root 'HEALTH.json'
  $prev = $null
  if (Test-Path -LiteralPath $f) {
    try { $prev = Get-Content -Raw -LiteralPath $f | ConvertFrom-Json } catch { $prev = $null }
  }
  # The counter must outlive the failure it is counting.
  # When the canonical root is the thing that is UNREACHABLE, the in-root HEALTH.json
  # cannot be written at all -- so a counter that only reads from the root is 0 on every
  # single run, and the alert threshold (>= 2) is unreachable by construction. This is not
  # hypothetical: the heartbeat failed 30 consecutive runs (2026-09-14 00:05 through
  # 2026-09-18 20:05, every four hours) against a stale root and never once alerted,
  # because Complete-Run could only ever compute fails = 0 + 1 = 1.
  # A fallback copy outside the root is the record of the failure the primary record could
  # not survive. Read it.
  if (-not $prev) {
    if (Test-Path -LiteralPath $FallbackHealth) {
      try { $prev = Get-Content -Raw -LiteralPath $FallbackHealth | ConvertFrom-Json } catch { $prev = $null }
    }
  }
  return $prev
}

function Write-Health([string]$Root, [hashtable]$Data) {
  $f = Join-Path $Root 'HEALTH.json'
  try {
    $json = $Data | ConvertTo-Json -Depth 4
    [IO.File]::WriteAllText($f, $json, [Text.UTF8Encoding]::new($false))
  } catch {
    Write-HeartbeatLog "warn: could not write HEALTH.json: $($_.Exception.Message)"
  }
}

# Emit the terminal state of this run: log line, health record, alert bookkeeping.
function Complete-Run([string]$Root, [string]$Outcome, [string]$Detail, [int]$Pending, [int]$ExitCode, [int]$LegacyAdopted, [int]$LegacyFound = 0, [int]$LegacyLeft = 0, [int]$LegacyDuplicate = 0, [int]$LegacyScanFaults = 0) {
  $prev = Get-Health $Root
  $priorFails = 0
  if ($prev -and ($prev.PSObject.Properties.Name -contains 'consecutive_failures')) {
    $priorFails = [int]$prev.consecutive_failures
  }
  # deferred/no_memos/ok are all HEALTHY: the pipeline ran and the inbox is genuinely
  # empty. Only failed and unreachable mean the pipeline did not do its job.
  $healthy = ($Outcome -eq 'ok' -or $Outcome -eq 'no_memos' -or $Outcome -eq 'deferred')

  # 'blocked' is a THIRD state, and it is neither healthy nor failed. It means the
  # environment refused to let this run verify anything -- wsl.exe denied, a non-local
  # provider, no local model. The pipeline state is UNKNOWN.
  #   * It must NOT count as a failure. MEASURED 2026-09-19T01:38:56 on the C: line: three
  #     agent-driven runs reported 'blocked' (wsl.exe: Access is denied, blocked by the
  #     agent sandbox) and tripped an "INBOX HEARTBEAT FAILING (3 consecutive)" alert while
  #     the pipeline was fine. The alert misattributed an environment limit to the pipeline.
  #   * It must NOT count as health either. Nothing was verified, so resetting the counter
  #     would let an unverifiable pipeline render as recovered.
  $blocked = ($Outcome -eq 'blocked')
  $priorBlocked = 0
  if ($prev -and ($prev.PSObject.Properties.Name -contains 'blocked_runs')) {
    $priorBlocked = [int]$prev.blocked_runs
  }
  if ($healthy)     { $fails = 0 }
  elseif ($blocked) { $fails = $priorFails }
  else              { $fails = $priorFails + 1 }
  $blockedRuns = 0
  if ($blocked) { $blockedRuns = $priorBlocked + 1 }

  $now = (Get-Date).ToString('o')

  # Carry forward the previous good/bad timestamps; overwrite only the one this run proves.
  $lastOk = $null
  $lastErr = $null
  $lastBlocked = $null
  if ($prev) {
    if ($prev.PSObject.Properties.Name -contains 'last_ok')      { $lastOk      = $prev.last_ok }
    if ($prev.PSObject.Properties.Name -contains 'last_error')   { $lastErr     = $prev.last_error }
    if ($prev.PSObject.Properties.Name -contains 'last_blocked') { $lastBlocked = $prev.last_blocked }
  }
  # A blocked run proves nothing about the pipeline, so it writes neither timestamp: it is
  # not a success, and its detail is not an error either.
  if ($healthy)          { $lastOk  = $now }
  elseif (-not $blocked) { $lastErr = $Detail }
  if ($blocked)          { $lastBlocked = $now }

  $health = @{
    last_run             = $now
    last_ok              = $lastOk
    last_error           = $lastErr
    last_outcome         = $Outcome
    last_detail          = $Detail
    pending_count        = $Pending
    legacy_found         = $LegacyFound
    legacy_adopted       = $LegacyAdopted
    legacy_duplicate     = $LegacyDuplicate
    legacy_pending       = $LegacyLeft
    legacy_scan_faults   = $LegacyScanFaults
    consecutive_failures = $fails
    blocked_runs         = $blockedRuns
    last_blocked         = $lastBlocked
    inbox_root           = $Root
    script_version       = 'v6'
  }

  Write-Health $Root $health

  # Fallback health record. If the canonical root is the thing that failed, the primary
  # HEALTH.json cannot be written there -- so the ONE state we most need recorded would be
  # the only one with no machine-readable record. Keep a copy outside the root, always.
  # Get-Health reads this back, which is what makes the failure counter survive.
  try {
    [IO.File]::WriteAllText(
      $FallbackHealth,
      ($health | ConvertTo-Json -Depth 4),
      [Text.UTF8Encoding]::new($false)
    )
  } catch { }

  # A blocked run must never write the FAILING message: it would misattribute an
  # environment limitation to the pipeline. It gets its own wording, and it is tested
  # FIRST, so that a counter inherited from a blocked streak cannot fire the wrong alert.
  if ($blocked) {
    if ($blockedRuns -ge $AlertAfter) {
      $msg = "INBOX HEARTBEAT UNVERIFIED ($blockedRuns consecutive blocked, outcome=$Outcome): $Detail"
      try { [IO.File]::WriteAllText($AlertFile, "$now`n$msg`n", [Text.UTF8Encoding]::new($false)) } catch { }
      Write-HeartbeatLog "ALERT $msg"
    }
  } elseif ($fails -ge $AlertAfter) {
    $msg = "INBOX HEARTBEAT FAILING ($fails consecutive, outcome=$Outcome): $Detail"
    try { [IO.File]::WriteAllText($AlertFile, "$now`n$msg`n", [Text.UTF8Encoding]::new($false)) } catch { }
    Write-HeartbeatLog "ALERT $msg"
  } elseif ($fails -eq 0 -and (Test-Path -LiteralPath $AlertFile) -and ((Get-Item -LiteralPath $AlertFile).Length -gt 0)) {
    # Blank the alert IN PLACE; do not delete it. A host-level 'safe-delete' guard vetoes
    # Remove-Item with a terminating error that escapes -ErrorAction and try/catch
    # (measured 2026-09-19T01:36:23), and an alert that cannot be cleared is worse than no
    # alert at all -- it becomes permanent noise that hides the next real one.
    try { [IO.File]::WriteAllText($AlertFile, '', [Text.UTF8Encoding]::new($false)) } catch { }
    Write-HeartbeatLog 'alert cleared; heartbeat healthy again'
  }

  exit $ExitCode
}

$mutex = [Threading.Mutex]::new($false, 'Local\Hermes2InboxHeartbeat')
$ownsMutex = $false
$root = $null
try {
  $ownsMutex = $mutex.WaitOne(0)
  if (-not $ownsMutex) { exit 0 }

  $root = Resolve-InboxRoot

  # UNREACHABLE is its own outcome. A pipeline that cannot read its inbox must never
  # report "0 pending" -- that is the bug this whole family exists to kill.
  if (-not (Initialize-InboxRoot $root)) {
    Complete-Run $root 'unreachable' "canonical inbox root not usable: $root" -1 1 0
  }

  $pendingDir = Join-Path $root 'pending'
  $legacy = Adopt-LegacyMemos $pendingDir
  $adopted   = $legacy.Adopted
  $legacyFound = $legacy.Found
  $legacyLeft  = $legacy.Pending
  $legacyDup   = $legacy.Duplicate
  $legacyFaults = $legacy.Faults

  # -Strict: if the canonical pending dir cannot be enumerated, that is a failure, not an
  # empty inbox.
  $memos = @(Get-MemoFiles -Dir $pendingDir -Strict)
  if ($memos.Count -eq 0) {
    Write-HeartbeatLog "no pending memos; skipped (root=$root adopted=$adopted faults=$legacyFaults)"
    Complete-Run $root 'no_memos' 'no pending memos' 0 0 $adopted $legacyFound $legacyLeft $legacyDup $legacyFaults
  }

  Import-Module (Join-Path $GuardianRoot 'WorkstationGuardian.psm1') -Force
  $config = Get-Content -Raw -LiteralPath (Join-Path $GuardianRoot 'config.json') | ConvertFrom-Json
  $busyState = Get-CurrentGuardianBusyState -Config $config
  if ($busyState.Busy) {
    Write-HeartbeatLog "pending=$($memos.Count); deferred reasons=$($busyState.Reasons -join ',')"
    Complete-Run $root 'deferred' "busy: $($busyState.Reasons -join ',')" $memos.Count 0 $adopted $legacyFound $legacyLeft $legacyDup $legacyFaults
  }

  # Provider gate. Structured, and it fails CLOSED on anything it cannot classify.
  $probeOut = & wsl.exe -d $Distro -- bash $Probe 2>&1
  $probeRc = $LASTEXITCODE
  $provider = ''
  $model = ''
  foreach ($line in @($probeOut)) {
    $s = "$line".Trim()
    if ($s -match '^PROVIDER=(.*)$') { $provider = $Matches[1].Trim() }
    if ($s -match '^MODEL=(.*)$')    { $model    = $Matches[1].Trim() }
  }
  if ($probeRc -ne 0 -or $provider -eq '') {
    Write-HeartbeatLog "pending memos; blocked: provider probe failed rc=$probeRc"
    Complete-Run $root 'blocked' "provider probe failed rc=$probeRc" $memos.Count 0 $adopted $legacyFound $legacyLeft $legacyDup $legacyFaults
  }
  if ($provider -notmatch '^local') {
    Write-HeartbeatLog "pending memos; blocked: effective provider '$provider' is not local (cloud guard)"
    Complete-Run $root 'blocked' "provider '$provider' is not local" $memos.Count 0 $adopted $legacyFound $legacyLeft $legacyDup $legacyFaults
  }
  if ($model -eq '' -or $model -eq 'UNKNOWN') {
    Write-HeartbeatLog "pending memos; blocked: could not resolve a local model (provider=$provider)"
    Complete-Run $root 'blocked' 'local model unresolved' $memos.Count 0 $adopted $legacyFound $legacyLeft $legacyDup $legacyFaults
  }

  $promptName = "hermes2-inbox-heartbeat-$PID-$([guid]::NewGuid().ToString('N')).txt"
  $promptFile = Join-Path 'C:\tmp' $promptName
  $heartbeat = 'Inbox heartbeat (automated, every four hours): absorb pending outside-agent memos into durable memory per the hermes-inbox protocol. Reply with one short summary line.'
  [IO.File]::WriteAllText($promptFile, $heartbeat, [Text.UTF8Encoding]::new($false))
  try {
    $priorPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
      # HERMES2_LOCAL_MODEL is passed INLINE: cmd -> wsl.exe drops host env vars.
      & wsl.exe -d $Distro -- env "HERMES2_LOCAL_MODEL=$model" $HermesPython $Runner "/mnt/c/tmp/$promptName" 2>&1 |
        ForEach-Object { Write-HeartbeatLog "runner: $_" }
    } finally {
      $ErrorActionPreference = $priorPreference
    }
    if ($LASTEXITCODE -ne 0) {
      Write-HeartbeatLog "runner failed exit=$LASTEXITCODE model=$model; no automatic retry"
      Complete-Run $root 'failed' "runner exit=$LASTEXITCODE model=$model" $memos.Count 1 $adopted $legacyFound $legacyLeft $legacyDup $legacyFaults
    }
    Write-HeartbeatLog "heartbeat complete pendingBefore=$($memos.Count) provider=$provider model=$model root=$root adopted=$adopted"
    Complete-Run $root 'ok' "drained $($memos.Count) memo(s)" $memos.Count 0 $adopted $legacyFound $legacyLeft $legacyDup $legacyFaults
  } finally {
    Remove-Item -LiteralPath $promptFile -Force -ErrorAction SilentlyContinue
  }
} catch {
  $msg = $_.Exception.Message
  Write-HeartbeatLog "error=$msg"
  if ($root) { Complete-Run $root 'failed' $msg 0 1 0 }
  exit 1
} finally {
  if ($ownsMutex) { $mutex.ReleaseMutex() }
  $mutex.Dispose()
}
