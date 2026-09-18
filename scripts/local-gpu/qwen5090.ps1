<#
.SYNOPSIS
Load / unload the uncensored Qwen on this PC's RTX 5090, on demand.

.DESCRIPTION
BLUEPRINT (rule 5)
- intent: one-double-click VRAM control for the uncensored Qwen 27B stack so the
  5090 can be freed for gaming / video work, and restored just as easily.
- reality on this box (verified 2026-09-17): the SAME uncensored model is served
  through TWO backends that can never both hold VRAM -
    * Ollama   (127.0.0.1:11434)  model qwen3.8-uncensored:latest  ~27 GB loaded,
      Hermes aux-compression provider, stays up as a server even when idle
    * NInfer   (172.26.128.1:18080 from WSL)  model qwen3.8-uncensored-ninfer
      ~27 GB budget, Hermes' ACTIVE chat provider (ninfer_config.py -> local-ninfer)
  Which one "load" restores is decided by Hermes' own routing (`selected`),
  never by guessing. NInfer is started/stopped only through its OWN owned
  script (Start-NInfer.ps1), which handles GPU gates and bookkeeping.
- contract: "unload" evicts every Ollama model AND stops ninfer-serve through
  the owned script - that is what actually returns ~30 GB to the desktop.
  The Ollama SERVER process itself is never killed (Hermes aux compression
  depends on it and will reload its model on demand). No scheduled task or
  watchdog restarts either backend (schtasks sweep 2026-09-17), so an unload
  stays unloaded. -KeepNInfer opts out of touching NInfer.
- failure modes: owned NInfer start/stop failure -> its own error catalog row
  plus a non-zero exit here; ollama down on load -> started once, then hard error.

MODES
  load    restore the model on whichever backend Hermes is routed to
  unload  evict all loaded VRAM (Ollama models + ninfer-serve), report freed GB
  status  full "what is eating my GPU" report - changes nothing

.EXAMPLE
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\local-gpu\qwen5090.ps1 -Mode unload
#>
[CmdletBinding()]
param(
  [ValidateSet('load', 'unload', 'status')]
  [string]$Mode = 'status',

  # The uncensored 27B already installed on this box (ollama list, 2026-09-17).
  [ValidateNotNullOrEmpty()]
  [string]$Model = 'qwen3.8-uncensored:latest',

  [ValidateNotNullOrEmpty()]
  [string]$BaseUrl = 'http://127.0.0.1:11434',

  [ValidateNotNullOrEmpty()]
  [string]$NInferStartScript = 'Z:\AI-Runtimes\ninfer-0.5.0\Start-NInfer.ps1',

  [ValidateNotNullOrEmpty()]
  [string]$NInferRoutingProbe = '/home/bigotsmasher/hermes2/hermes-agent/venv/bin/python /mnt/z/AI-Runtimes/ninfer-0.5.0/migration/ninfer_config.py selected',

  # keep_alive applied when loading into Ollama: hours after the LAST prompt
  # before Ollama evicts. Bounded (not -1) so a forgotten load cannot silently
  # hold 27 GB mid-game - the freeze scenario this script exists to prevent.
  [ValidateRange(1, 168)]
  [int]$KeepAliveHours = 4,

  [ValidateRange(30, 900)]
  [int]$OllamaLoadTimeoutSeconds = 240,

  # UNLOAD opt-out: leave ninfer-serve running (its ~22-27 GB stays resident).
  [switch]$KeepNInfer
)

$ErrorActionPreference = 'Stop'

function Write-Step([string]$Text) { Write-Host "  $Text" }

function Get-Vram {
  try {
    $csv = (& nvidia-smi --query-gpu=memory.used,memory.total --format=csv,noheader,nounits) | Select-Object -First 1
    $p = $csv -split '\s*,\s*'
    return @{ UsedMiB = [int]$p[0]; TotalMiB = [int]$p[1] }
  } catch { return $null }
}

function Show-Vram([hashtable]$Vram) {
  if (-not $Vram) { Write-Step 'vram            : nvidia-smi unavailable'; return }
  $freeMiB = $Vram.TotalMiB - $Vram.UsedMiB
  Write-Step ("vram            : {0:N1} / {1:N1} GB used, {2:N1} GB free" -f ($Vram.UsedMiB / 1024), ($Vram.TotalMiB / 1024), ($freeMiB / 1024))
}

function Get-NInferProc {
  return @(Get-Process -Name 'ninfer-serve' -ErrorAction SilentlyContinue)
}

function Get-Routing {
  # -> 'local-ninfer' | 'local-ollama' | 'unknown'  (Hermes' own selection)
  try {
    $out = & wsl.exe -d Ubuntu-22.04 -- sh -c $NInferRoutingProbe 2>$null
    $t = ($out | Out-String).Trim()
    if ($t -eq 'local-ninfer' -or $t -eq 'local-ollama') { return $t }
  } catch { }
  return 'unknown'
}

function Test-Ollama {
  try { Invoke-RestMethod -Uri "$BaseUrl/api/version" -TimeoutSec 3 | Out-Null; return $true } catch { return $false }
}

function Get-LoadedModels {
  try {
    $r = Invoke-RestMethod -Uri "$BaseUrl/api/ps" -TimeoutSec 5
    # PS 5.1 turns an empty JSON array into $null, and @($null).Count is 1 -
    # which read as "a model is still loaded" during the exactly-empty case.
    return @($r.models | Where-Object { $_ })
  } catch { return @() }
}

function Show-OllamaSide {
  if (-not (Test-Ollama)) { Write-Step 'ollama server   : DOWN'; return }
  Write-Step "ollama server   : up ($BaseUrl)"
  $loaded = Get-LoadedModels
  if (-not $loaded) { Write-Step 'ollama models   : none in memory' }
  foreach ($m in $loaded) {
    $until = '?'
    try { if ($m.expires_at) { $until = ([datetimeoffset]::Parse($m.expires_at)).LocalDateTime.ToString('h:mm tt') } } catch { }
    Write-Step ("ollama model    : {0}  {1:N1} GB in VRAM, evicts ~{2}" -f $m.name, ($m.size_vram / 1e9), $until)
  }
}

function Stop-NInferOwned {
  if (-not (Test-Path -LiteralPath $NInferStartScript)) {
    Write-Step "NInfer start script missing ($NInferStartScript) - falling back to direct stop"
    Get-NInferProc | Stop-Process -Force -ErrorAction SilentlyContinue
    return
  }
  Write-Step 'stopping ninfer-serve via its owned Start-NInfer.ps1 -Stop...'
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $NInferStartScript -Stop 2>&1 | ForEach-Object { Write-Step "  ninfer: $_" }
}

# ------------------------------------------------------------------------ status
if ($Mode -eq 'status') {
  Write-Host 'Qwen 5090 status'
  Write-Step ("hermes routing  : " + (Get-Routing))
  Show-OllamaSide
  $ninfer = Get-NInferProc
  Write-Step ("ninfer-serve    : " + $(if ($ninfer) { "RUNNING (pid $($ninfer.Id -join ',')) - holds ~22-27 GB" } else { 'not running' }))
  Show-Vram (Get-Vram)
  exit 0
}

# ------------------------------------------------------------------------ unload
if ($Mode -eq 'unload') {
  Write-Host 'Qwen 5090 unload'
  $before = Get-Vram

  if (Test-Ollama) {
    $loaded = Get-LoadedModels
    foreach ($m in $loaded) {
      Write-Step "evicting $($m.name) ($([math]::Round($m.size_vram / 1e9, 1)) GB) from Ollama..."
      try {
        Invoke-RestMethod -Uri "$BaseUrl/api/generate" -Method Post -TimeoutSec 30 `
          -ContentType 'application/json' -Body (@{ model = $m.name; keep_alive = 0 } | ConvertTo-Json) | Out-Null
      } catch { Write-Step "  (evict request for $($m.name) errored: $($_.Exception.Message))" }
    }
    if (-not $loaded) { Write-Step 'Ollama: no models in memory' }
  } else {
    Write-Step 'Ollama server down - nothing to evict there'
  }

  $ninfer = Get-NInferProc
  if ($KeepNInfer) {
    if ($ninfer) { Write-Step 'ninfer-serve left running per -KeepNInfer' }
  } elseif ($ninfer) {
    Stop-NInferOwned
  } else {
    Write-Step 'ninfer-serve already stopped'
  }

  # Both evictions are async - poll until VRAM truth is stable, not sleep-and-hope.
  # 180s: a 26 GB / 256K-ctx eviction under VRAM pressure is measured-slow.
  $deadline = (Get-Date).AddSeconds(180)
  do {
    Start-Sleep -Seconds 3
    $stillOllama = @(Get-LoadedModels)
    $stillNInfer = Get-NInferProc
  } while (($stillOllama.Count -gt 0 -or $stillNInfer.Count -gt 0) -and (Get-Date) -lt $deadline)

  if ($stillOllama.Count -gt 0 -or $stillNInfer.Count -gt 0) {
    Write-Step ("WARNING: still resident after 180s -> ollama: " + (($stillOllama | ForEach-Object { $_.name }) -join ', ') + " | ninfer pids: " + (($stillNInfer | ForEach-Object { $_.Id }) -join ', '))
    exit 4
  }

  # LIVE-CLIENT RELOAD CHECK (the tug-of-war): a running Hermes gateway pulls the
  # model back on demand with its own keep_alive (observed live 2026-09-17).
  # Verify VRAM actually STAYS free for a few seconds before claiming victory.
  Start-Sleep -Seconds 8
  $reloaded = @(Get-LoadedModels)
  if ($reloaded.Count -gt 0) {
    Write-Step ("UNLOADED, but a live client re-loaded: " + (($reloaded | ForEach-Object { $_.name }) -join ', '))
    Write-Step 'A running Hermes gateway (WSL) reloads this model on demand - VRAM will not stay free while it runs.'
    Write-Step 'Close/stop the Hermes session, then run UNLOAD again.'
    Show-Vram (Get-Vram)
    exit 3
  }

  $after = Get-Vram
  Write-Step 'loaded          : nothing - both backends released'
  if ($before -and $after) {
    Write-Step ("freed           : {0:N1} GB" -f (($before.UsedMiB - $after.UsedMiB) / 1024))
  }
  Show-Vram $after
  Write-Host ''
  Write-Host '  5090 VRAM is free for gaming / video.'
  Write-Host '  Note: a Hermes request (chat or compression) reloads a model on demand -'
  Write-Host '  run UNLOAD again if something re-loaded it mid-session.'
  exit 0
}

# ------------------------------------------------------------------------- load
Write-Host 'Qwen 5090 load'
$routing = Get-Routing
Write-Step "hermes routing  : $routing"

if ($routing -eq 'local-ninfer') {
  if (-not (Test-Path -LiteralPath $NInferStartScript)) { throw "NINFER_SCRIPT_MISSING: $NInferStartScript" }
  if (Get-NInferProc) {
    Write-Step 'ninfer-serve already running - NInfer loads on first request'
  } else {
    Write-Step 'starting NInfer via its owned script (its internal acceptance clock is ~180s)...'
    # Synchronous on purpose: the owned script streams its own decision-table
    # output and enforces its own acceptance timeout before exiting.
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $NInferStartScript 2>&1 |
      ForEach-Object { Write-Step "  ninfer: $_" }
    if (-not (Get-NInferProc)) { throw 'NINFER_START_FAILED: no ninfer-serve process after the owned start script ran' }
  }
  Write-Step 'NInfer is up - Hermes chat backend restored (it loads the GPU on first use).'
}
else {
  if ($routing -eq 'local-ollama') { Write-Step '(Hermes is routed to Ollama - loading there)' }
  else { Write-Step 'routing probe failed - defaulting to the Ollama backend' }
  if (-not (Test-Ollama)) {
    Write-Step 'ollama server down - starting it...'
    $ollama = @(Get-Command 'ollama' -ErrorAction SilentlyContinue).Source
    if (-not $ollama) { foreach ($p in @("$env:LOCALAPPDATA\Programs\Ollama\ollama.exe", "$env:ProgramFiles\Ollama\ollama.exe")) { if (Test-Path $p) { $ollama = $p; break } } }
    if (-not $ollama) { throw 'OLLAMA_NOT_FOUND: ollama CLI not on PATH or in the usual install locations' }
    Start-Process -FilePath $ollama -ArgumentList 'serve' -WindowStyle Hidden
    $ready = $false
    for ($i = 0; $i -lt 15; $i++) { if (Test-Ollama) { $ready = $true; break }; Start-Sleep -Seconds 2 }
    if (-not $ready) { throw 'OLLAMA_START_FAILED: server did not answer within 30s' }
  }
  Write-Step "loading $Model (stays ${KeepAliveHours}h after your last prompt; first load can take a minute)..."
  $deadline = (Get-Date).AddSeconds($OllamaLoadTimeoutSeconds)
  $loadedOk = $false
  while ((Get-Date) -lt $deadline) {
    try {
      Invoke-RestMethod -Uri "$BaseUrl/api/generate" -Method Post -TimeoutSec 30 `
        -ContentType 'application/json' `
        -Body (@{ model = $Model; prompt = ''; stream = $false; keep_alive = "${KeepAliveHours}h"; options = @{ num_predict = 1 } } | ConvertTo-Json) | Out-Null
      $loadedOk = $true
      break
    } catch { Start-Sleep -Seconds 3 }
  }
  if (-not $loadedOk) { throw "LOAD_TIMEOUT: $Model not answering within ${OllamaLoadTimeoutSeconds}s" }
  Show-OllamaSide
}

Show-Vram (Get-Vram)
Write-Host ''
Write-Host '  Qwen uncensored is available. To free the GPU for gaming:'
Write-Host '  run "Qwen Uncensored - UNLOAD.cmd"'
exit 0
