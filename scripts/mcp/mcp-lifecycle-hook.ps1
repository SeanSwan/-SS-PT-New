<#
===============================================================================
FILE: mcp-lifecycle-hook.ps1
PURPOSE: Fence Claude lifecycle hook workers with Windows mutexes and Job Objects.
AUTHOR: Codex | LAST MODIFIED: 2026-08-09
AI VILLAGE VALIDATED: Not run (permission-gated)
===============================================================================

This wrapper owns lock and child lifetimes. It never inspects or terminates MCP
processes; the Node manager retains the exact ownership and mutation proof.
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][ValidateSet('SessionStart','SessionEnd','Keep','Rearm')][string]$Event,
  [Parameter(Mandatory=$true)][ValidateSet('audit')][string]$Mode,
  [ValidateSet('none','playwright')][string]$Keep = 'none',
  [switch]$SelfTest,
  [switch]$SelfTestCrash,
  [string]$SelfTestPidFile
)

$ErrorActionPreference = 'Stop'
$script:Clock = [Diagnostics.Stopwatch]::StartNew()
$script:BudgetMs = if ($Event -eq 'SessionStart') { 43000 } else { 58000 }
$HookJson = [Console]::In.ReadToEnd()
$Repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$Manager = Join-Path $Repo 'scripts\mcp\mcp-lifecycle-manager.mjs'

Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
public static class SwanMcpJob {
  [StructLayout(LayoutKind.Sequential)] public struct Basic {
    public long PerProcessUserTimeLimit;
    public long PerJobUserTimeLimit;
    public uint LimitFlags;
    public IntPtr MinimumWorkingSetSize;
    public IntPtr MaximumWorkingSetSize;
    public uint ActiveProcessLimit;
    public IntPtr Affinity;
    public uint PriorityClass;
    public uint SchedulingClass;
  }
  [StructLayout(LayoutKind.Sequential)] public struct Io {
    public ulong ReadOperationCount;
    public ulong WriteOperationCount;
    public ulong OtherOperationCount;
    public ulong ReadTransferCount;
    public ulong WriteTransferCount;
    public ulong OtherTransferCount;
  }
  [StructLayout(LayoutKind.Sequential)] public struct Extended {
    public Basic BasicLimitInformation;
    public Io IoInfo;
    public IntPtr ProcessMemoryLimit;
    public IntPtr JobMemoryLimit;
    public IntPtr PeakProcessMemoryUsed;
    public IntPtr PeakJobMemoryUsed;
  }
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
  private static extern IntPtr CreateJobObject(IntPtr attributes, string name);
  [DllImport("kernel32.dll", SetLastError=true)]
  private static extern bool SetInformationJobObject(IntPtr job, int infoClass, IntPtr info, uint length);
  [DllImport("kernel32.dll", SetLastError=true)]
  private static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
  [DllImport("kernel32.dll", SetLastError=true)]
  private static extern bool CloseHandle(IntPtr handle);
  public const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000;
  public static IntPtr CreateKillOnClose() {
    IntPtr job = CreateJobObject(IntPtr.Zero, null);
    if (job == IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error());
    IntPtr buffer = IntPtr.Zero;
    try {
      var info = new Extended();
      info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
      int length = Marshal.SizeOf(typeof(Extended));
      buffer = Marshal.AllocHGlobal(length);
      Marshal.StructureToPtr(info, buffer, false);
      if (!SetInformationJobObject(job, 9, buffer, (uint)length))
        throw new Win32Exception(Marshal.GetLastWin32Error());
      return job;
    } catch {
      CloseHandle(job);
      throw;
    } finally {
      if (buffer != IntPtr.Zero) Marshal.FreeHGlobal(buffer);
    }
  }
  public static void Assign(IntPtr job, IntPtr process) {
    if (!AssignProcessToJobObject(job, process))
      throw new Win32Exception(Marshal.GetLastWin32Error());
  }
  public static void Close(IntPtr job) {
    if (job != IntPtr.Zero && !CloseHandle(job))
      throw new Win32Exception(Marshal.GetLastWin32Error());
  }
}
'@

function Remaining-Ms {
  return [Math]::Max(0, $script:BudgetMs - [int]$script:Clock.ElapsedMilliseconds)
}

function Owner-Key {
  $items = Get-CimInstance Win32_Process | Select-Object Name,ProcessId,ParentProcessId,CreationDate,CommandLine
  $byPid = @{}; foreach ($item in $items) { $byPid[[int]$item.ProcessId] = $item }
  $cursor = $byPid[[int]$PID]; $seen = @{}
  while ($null -ne $cursor -and -not $seen.ContainsKey([int]$cursor.ProcessId)) {
    $seen[[int]$cursor.ProcessId] = $true
    if ($cursor.Name -ieq 'claude.exe' -or $cursor.Name -ieq 'claude') {
      $match = [regex]::Match([string]$cursor.CommandLine, '^\s*(?:"([^"]+)"|(\S+))')
      $invoked = if ($match.Success) { [IO.Path]::GetFileName(($match.Groups[1].Value + $match.Groups[2].Value)) } else { '' }
      if ($invoked -ine 'claude.exe' -and $invoked -ine 'claude') { throw 'Claude owner command unavailable' }
      $created = ([DateTimeOffset]$cursor.CreationDate.ToUniversalTime()).ToUnixTimeMilliseconds()
      $bytes = [Text.Encoding]::UTF8.GetBytes("$($cursor.ProcessId):$created")
      $sha = [Security.Cryptography.SHA256]::Create()
      try { return ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-','').ToLowerInvariant().Substring(0,20) }
      finally { $sha.Dispose() }
    }
    $parent = $byPid[[int]$cursor.ParentProcessId]
    if ($null -eq $parent) { break }
    $childCreated = ([DateTimeOffset]$cursor.CreationDate.ToUniversalTime()).ToUnixTimeMilliseconds()
    $parentCreated = ([DateTimeOffset]$parent.CreationDate.ToUniversalTime()).ToUnixTimeMilliseconds()
    if ($parentCreated -gt $childCreated) { throw 'owner ancestry ambiguous' }
    $cursor = $parent
  }
  throw 'Claude owner unavailable'
}

function Acquire-Mutex([string]$OwnerKey, [string]$Purpose) {
  $mutex = [System.Threading.Mutex]::new($false, "Local\SwanMcp-$OwnerKey-$Purpose")
  try {
    try { $acquired = $mutex.WaitOne([Math]::Max(1, (Remaining-Ms))) }
    catch [System.Threading.AbandonedMutexException] { $acquired = $true }
    if (-not $acquired) { throw 'mutex timeout' }
    return $mutex
  } catch { $mutex.Dispose(); throw }
}

function Release-Mutex($Mutex) {
  if ($null -ne $Mutex) { $Mutex.ReleaseMutex(); $Mutex.Dispose() }
}

function Invoke-Worker([string]$Command, [switch]$SafeSelfTest, [switch]$CrashTest) {
  $remaining = Remaining-Ms
  if ($remaining -lt 2000) { throw 'hook budget exhausted' }
  $job = [SwanMcpJob]::CreateKillOnClose()
  $psi = [Diagnostics.ProcessStartInfo]::new()
  $psi.FileName = if ($CrashTest) { 'powershell.exe' } elseif ($SafeSelfTest) { 'cmd.exe' } else { 'node.exe' }
  $psi.Arguments = if ($CrashTest) { '-NoProfile -NonInteractive -Command "Start-Sleep -Seconds 30"' } elseif ($SafeSelfTest) { '/d /c exit 0' } else { '"' + $Manager + '" ' + $Command + ' --mode=' + $Mode }
  $psi.UseShellExecute = $false
  $psi.RedirectStandardInput = $true; $psi.RedirectStandardOutput = $true; $psi.RedirectStandardError = $true
  $psi.EnvironmentVariables['SWAN_MCP_BUDGET_MS'] = [string]$remaining
  $psi.EnvironmentVariables['SWAN_MCP_COORDINATED'] = '1'
  $child = [Diagnostics.Process]::new(); $child.StartInfo = $psi
  try {
    if (-not $child.Start()) { throw 'worker start failed' }
    [SwanMcpJob]::Assign($job, $child.Handle)
    $stdoutTask = $child.StandardOutput.ReadToEndAsync()
    $stderrTask = $child.StandardError.ReadToEndAsync()
    if ($CrashTest) { [IO.File]::WriteAllText($SelfTestPidFile, [string]$child.Id) }
    if (-not $SafeSelfTest -and -not $CrashTest) { $child.StandardInput.Write($HookJson) }
    $child.StandardInput.Close()
    if (-not $child.WaitForExit([Math]::Max(1, (Remaining-Ms)))) { throw 'worker timeout' }
    $output = $stdoutTask.GetAwaiter().GetResult()
    [void]$stderrTask.GetAwaiter().GetResult()
    if ($child.ExitCode -ne 0) { throw 'worker refused' }
    if ($output) { [Console]::Out.Write($output) }
  } finally {
    $child.Dispose(); [SwanMcpJob]::Close($job)
  }
}

try {
  if (($SelfTest -or $SelfTestCrash) -and $env:SWAN_MCP_SELF_TEST -ne '1') {
    throw 'self-test environment gate missing'
  }
  if ($SelfTestCrash) {
    if ([string]::IsNullOrWhiteSpace($SelfTestPidFile)) { throw 'self-test PID file required' }
    $testMutex = Acquire-Mutex ("crashtest-$PID") 'lifecycle'
    try { Invoke-Worker '' -CrashTest } finally { Release-Mutex $testMutex }
    exit 0
  }
  if ($SelfTest) {
    $testMutex = Acquire-Mutex ("selftest-$PID") 'lifecycle'
    try { Invoke-Worker '' -SafeSelfTest } finally { Release-Mutex $testMutex }
    [Console]::Out.Write("self-test=pass\n")
    exit 0
  }
  $ownerKey = if ($Event -eq 'Rearm') { $null } else { Owner-Key }
  if ($Event -eq 'SessionStart') {
    $global = Acquire-Mutex 'host' 'global-state'
    try {
      $startup = Acquire-Mutex $ownerKey 'startup'
      try { Invoke-Worker 'hook-start-publish' } finally { Release-Mutex $startup }
    } finally { Release-Mutex $global }
    $global = Acquire-Mutex 'host' 'global-state'
    try {
      $lifecycle = Acquire-Mutex $ownerKey 'lifecycle'
      try {
        $startup = Acquire-Mutex $ownerKey 'startup'
        try { Invoke-Worker 'hook-start-register' } finally { Release-Mutex $startup }
      } finally { Release-Mutex $lifecycle }
    } finally { Release-Mutex $global }
  } elseif ($Event -eq 'Rearm') {
    $global = Acquire-Mutex 'host' 'global-state'
    try { Invoke-Worker 'rearm --confirm' } finally { Release-Mutex $global }
  } else {
    $global = Acquire-Mutex 'host' 'global-state'
    try {
      $lifecycle = Acquire-Mutex $ownerKey 'lifecycle'
      try {
        $startup = Acquire-Mutex $ownerKey 'startup'
        $workerCommand = if ($Event -eq 'Keep') { "keep --keep=$Keep" } else { 'hook-end --confirm' }
        try { Invoke-Worker $workerCommand } finally { Release-Mutex $startup }
      } finally { Release-Mutex $lifecycle }
    } finally { Release-Mutex $global }
  }
} catch {
  [Console]::Out.Write("[mcp-hygiene] coordinator refused safely; mode=audit.\n")
}
