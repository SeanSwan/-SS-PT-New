<#
.SYNOPSIS
Starts the verified MiniSwan llama.cpp server for one explicitly selected GGUF model.

.DESCRIPTION
This is an on-demand worker launcher, not a public service manager. It resolves relative
model names under C:\swan\models, refuses missing/non-GGUF files, refuses a busy port, and
binds llama-server to loopback only. Remote callers must use an SSH tunnel; the launcher
never handles API keys or platform credentials.

.EXAMPLE
.\miniswan-llama-server.ps1 -Model qwen3.6-35b-q4_k_m.gguf

.EXAMPLE
.\miniswan-llama-server.ps1 -Model C:\swan\models\probe.gguf -Foreground
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateNotNullOrEmpty()]
  [string]$Model,

  [ValidateRange(1, 65535)]
  [int]$Port = 8080,

  [ValidateRange(1, 262144)]
  [int]$Context = 32768,

  [ValidateRange(0, 999)]
  [int]$GpuLayers = 999,

  [ValidateNotNullOrEmpty()]
  [string]$Root = 'C:\swan',

  [switch]$Foreground
)

$ErrorActionPreference = 'Stop'
$LlamaServer = 'C:\llama\bin\llama-server.exe'

function Resolve-ModelPath {
  param([string]$RequestedModel)

  $modelRoot = [IO.Path]::GetFullPath((Join-Path $Root 'models'))
  $candidate = if ([System.IO.Path]::IsPathRooted($RequestedModel)) {
    $RequestedModel
  } else {
    Join-Path $modelRoot $RequestedModel
  }

  if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
    throw "MODEL_NOT_FOUND: $candidate"
  }

  $resolved = (Resolve-Path -LiteralPath $candidate -ErrorAction Stop).Path
  $modelPrefix = $modelRoot + [IO.Path]::DirectorySeparatorChar
  if (-not $resolved.StartsWith($modelPrefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw "MODEL_PATH_OUTSIDE_ROOT: expected a model under $modelRoot, got $resolved"
  }
  if ([System.IO.Path]::GetExtension($resolved).ToLowerInvariant() -ne '.gguf') {
    throw "MODEL_FORMAT_UNSUPPORTED: expected a .gguf file, got $resolved"
  }
  return $resolved
}

function Get-PortListener {
  param([int]$ListenPort)

  try {
    return @(Get-NetTCPConnection -LocalPort $ListenPort -State Listen -ErrorAction Stop)
  } catch {
    return @()
  }
}

$modelPath = Resolve-ModelPath -RequestedModel $Model
if (-not (Test-Path -LiteralPath $LlamaServer -PathType Leaf)) {
  throw "LLAMA_BINARY_NOT_FOUND: $LlamaServer"
}

$listeners = Get-PortListener -ListenPort $Port
if ($listeners.Count -gt 0) {
  $owners = ($listeners | Select-Object -ExpandProperty OwningProcess -Unique) -join ','
  throw "LLAMA_PORT_IN_USE: port $Port is already listening (pid $owners)"
}

$logDir = Join-Path $Root 'logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$stdoutLog = Join-Path $logDir ("llama-server-$Port.out.log")
$stderrLog = Join-Path $logDir ("llama-server-$Port.err.log")
$pidFile = Join-Path $Root ("llama-server-$Port.json")

$nativeArgs = @(
  '--model', $modelPath,
  '--host', '127.0.0.1',
  '--port', [string]$Port,
  '--ctx-size', [string]$Context,
  '--n-gpu-layers', [string]$GpuLayers,
  '--metrics'
)

if ($Foreground) {
  & $LlamaServer @nativeArgs
  exit $LASTEXITCODE
}

# Start-Process receives one command line, so quote only arguments that need it.
$processArgs = ($nativeArgs | ForEach-Object {
  $value = [string]$_
  if ($value -match '[\s"]') { '"' + $value.Replace('"', '\"') + '"' } else { $value }
}) -join ' '

$process = Start-Process -FilePath $LlamaServer -ArgumentList $processArgs -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog -WindowStyle Hidden -PassThru

@{
  pid = $process.Id
  model = $modelPath
  host = '127.0.0.1'
  port = $Port
  context = $Context
  gpu_layers = $GpuLayers
  started_at = (Get-Date).ToString('o')
} | ConvertTo-Json | Set-Content -LiteralPath $pidFile -Encoding utf8

Start-Sleep -Milliseconds 750
$process.Refresh()
if ($process.HasExited) {
  $errorTail = if (Test-Path -LiteralPath $stderrLog) {
    (Get-Content -LiteralPath $stderrLog -Tail 20 -ErrorAction SilentlyContinue) -join ' '
  } else {
    ''
  }
  throw "LLAMA_START_FAILED: process exited with code $($process.ExitCode). $errorTail"
}

Write-Output "LLAMA_STARTED pid=$($process.Id) bind=127.0.0.1 port=$Port model=$modelPath"
