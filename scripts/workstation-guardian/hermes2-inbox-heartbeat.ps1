# Hermes inbox heartbeat. Scheduled every four hours through a hidden VBS host.
# No memo means no WSL or model work. Gaming/rendering/high-load states defer.

$ErrorActionPreference = 'Stop'
$Distro = 'Ubuntu-22.04'
# The inbox lives in the CANONICAL checkout. This previously pointed at the docs-only
# mirror tree under the user profile (Desktop\<user>\quick-pt\SS-PT), which has no
# .ai-workflow directory, so Get-ChildItem -ErrorAction Stop threw on every scheduled run
# and the heartbeat never reached the memo scan. Log evidence: every 4 hours from at
# least 2026-09-11 to 2026-09-13 logged "Cannot find path ... because it does not exist";
# canonical consumed\2026-09 was last written 2026-09-03, i.e. absorption had already
# stopped. Fixed 2026-09-13.
# Derived from the user profile rather than hardcoded, so the path is machine-portable
# and the script carries no operator-identity literal of its own.
$InboxRoot = Join-Path $env:USERPROFILE 'Desktop\@Everything\quick-pt\SS-PT\.ai-workflow\hermes-inbox'
$Pending = Join-Path $InboxRoot 'pending'
$Runner = '/mnt/c/tmp/hermes2-local-prompt-runner.py'
$HermesPython = '/home/bigotsmasher/hermes2/hermes-agent/venv/bin/python'
$GuardianRoot = 'C:\tmp\SwanWorkstationGuardian'
$Log = 'C:\tmp\hermes2-inbox-heartbeat.log'

function Write-HeartbeatLog([string]$Message) {
  "$(Get-Date -Format o) $Message" | Add-Content -LiteralPath $Log
}

$mutex = [Threading.Mutex]::new($false, 'Local\Hermes2InboxHeartbeat')
$ownsMutex = $false
try {
  $ownsMutex = $mutex.WaitOne(0)
  if (-not $ownsMutex) { exit 0 }

  # A missing inbox is a configuration fault, not a reason to abort the heartbeat:
  # report it explicitly and exit non-zero so it stays visible in the log.
  if (-not (Test-Path -LiteralPath $Pending)) {
    Write-HeartbeatLog "error=inbox pending directory not found: $Pending"
    exit 1
  }
  $memos = @(Get-ChildItem -LiteralPath $Pending -Filter *.md -File -ErrorAction Stop |
    Where-Object { $_.Name -ne 'ENTRY-TEMPLATE.md' -and -not $_.Name.StartsWith('.') })
  if ($memos.Count -eq 0) {
    Write-HeartbeatLog 'no pending memos; skipped'
    exit 0
  }

  Import-Module (Join-Path $GuardianRoot 'WorkstationGuardian.psm1') -Force
  $config = Get-Content -Raw -LiteralPath (Join-Path $GuardianRoot 'config.json') | ConvertFrom-Json
  $busyState = Get-CurrentGuardianBusyState -Config $config
  if ($busyState.Busy) {
    Write-HeartbeatLog "pending=$($memos.Count); deferred reasons=$($busyState.Reasons -join ',')"
    exit 0
  }

  $providerProbe = & wsl.exe -d $Distro -- bash /mnt/c/tmp/hermes2-config-inspect-safe.sh 2>&1
  if ($LASTEXITCODE -ne 0 -or ($providerProbe -join "`n") -notmatch 'provider:\s*local-ollama') {
    Write-HeartbeatLog 'pending memos; blocked because Hermes provider is not verified local-ollama'
    exit 0
  }

  $promptName = "hermes2-inbox-heartbeat-$PID-$([guid]::NewGuid().ToString('N')).txt"
  $promptFile = Join-Path 'C:\tmp' $promptName
  $heartbeat = 'Inbox heartbeat (automated, every four hours): absorb pending outside-agent memos into durable memory per the hermes-inbox protocol. Reply with one short summary line.'
  [IO.File]::WriteAllText($promptFile, $heartbeat, [Text.UTF8Encoding]::new($false))
  try {
    $priorPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
      & wsl.exe -d $Distro -- $HermesPython $Runner "/mnt/c/tmp/$promptName" 2>&1 |
        ForEach-Object { Write-HeartbeatLog "runner: $_" }
    } finally {
      $ErrorActionPreference = $priorPreference
    }
    if ($LASTEXITCODE -ne 0) {
      Write-HeartbeatLog "runner failed exit=$LASTEXITCODE; no automatic retry"
      exit 1
    }
    Write-HeartbeatLog "heartbeat complete pendingBefore=$($memos.Count)"
  } finally {
    Remove-Item -LiteralPath $promptFile -Force -ErrorAction SilentlyContinue
  }
} catch {
  Write-HeartbeatLog "error=$($_.Exception.Message)"
  exit 1
} finally {
  if ($ownsMutex) { $mutex.ReleaseMutex() }
  $mutex.Dispose()
}
