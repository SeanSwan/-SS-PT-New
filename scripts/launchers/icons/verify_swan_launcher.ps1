<#
.SYNOPSIS
    Regression tests for Set-SwanLauncher.ps1 using an isolated fake Desktop.

.DESCRIPTION
    Runs the public script in a child PowerShell process so exit codes and COM
    shortcut behavior are observed exactly as an operator or automation caller
    sees them. Every filesystem write stays under a GUID directory in OS temp.
#>
#requires -Version 5.1
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$Launcher = Join-Path $PSScriptRoot 'Set-SwanLauncher.ps1'
$HostExe = (Get-Process -Id $PID).Path
$TempRoot = [IO.Path]::GetFullPath((Join-Path ([IO.Path]::GetTempPath()) ("swan-launcher-test-" + [guid]::NewGuid().ToString('N'))))
$ExpectedTempPrefix = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$EscapedPath = Join-Path (Split-Path -Parent $TempRoot) ((Split-Path -Leaf $TempRoot) + '-escaped.lnk')
$script:Passes = 0
$script:Failures = 0

function Assert-True([bool]$Condition, [string]$Message) {
    if ($Condition) {
        $script:Passes++
        Write-Host "PASS: $Message"
    } else {
        $script:Failures++
        Write-Host "FAIL: $Message" -ForegroundColor Red
    }
}

function Invoke-Launcher([string[]]$LauncherArgs) {
    $priorPreference = $ErrorActionPreference
    try {
        # Windows PowerShell 5.1 promotes native stderr to a terminating
        # NativeCommandError under Stop; the child exit code is the evidence.
        $ErrorActionPreference = 'Continue'
        & $HostExe -NoProfile -ExecutionPolicy Bypass -File $Launcher @LauncherArgs 2>&1 | Out-Null
        return $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $priorPreference
    }
}

function New-TestShortcut(
    [string]$Path,
    [AllowEmptyString()][string]$Target,
    [string]$Arguments = '',
    [string]$Hotkey = '',
    [string]$WorkingDirectory = '',
    [int]$WindowStyle = 1
) {
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($Path)
    if ($Target) { $shortcut.TargetPath = $Target }
    $shortcut.Arguments = $Arguments
    $shortcut.Hotkey = $Hotkey
    $shortcut.WorkingDirectory = $WorkingDirectory
    $shortcut.WindowStyle = $WindowStyle
    $shortcut.Save()
}

function Get-TestShortcut([string]$Path) {
    (New-Object -ComObject WScript.Shell).CreateShortcut($Path)
}

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class SwanShellIconProbe {
    [DllImport("shell32.dll", CharSet=CharSet.Unicode)]
    public static extern uint ExtractIconEx(string file, int index, IntPtr[] large, IntPtr[] small, uint count);
    [DllImport("user32.dll")]
    public static extern bool DestroyIcon(IntPtr icon);
}
'@

function Test-ShellIcon([string]$Path) {
    $large = New-Object IntPtr[] 1
    $small = New-Object IntPtr[] 1
    $count = [SwanShellIconProbe]::ExtractIconEx($Path, 0, $large, $small, 1)
    try { $count -eq 1 -and $large[0] -ne [IntPtr]::Zero -and $small[0] -ne [IntPtr]::Zero }
    finally {
        if ($large[0] -ne [IntPtr]::Zero) { [SwanShellIconProbe]::DestroyIcon($large[0]) | Out-Null }
        if ($small[0] -ne [IntPtr]::Zero) { [SwanShellIconProbe]::DestroyIcon($small[0]) | Out-Null }
    }
}

try {
    [IO.Directory]::CreateDirectory($TempRoot) | Out-Null
    $Cmd = Join-Path $TempRoot 'sample.cmd'
    $Icon = Join-Path $TempRoot 'sample.ico'
    [IO.File]::WriteAllText($Cmd, "@echo off`r`nexit /b 0`r`n")
    & python (Join-Path $PSScriptRoot 'swan_icon.py') build --out $Icon | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'fixture icon generation failed' }
    Assert-True (Test-ShellIcon $Icon) 'Windows Shell32 extracts large and small frames from the generated ICO'

    $exit = Invoke-Launcher @(
        '-Cmd', $Cmd,
        '-Name', 'Injected Desktop',
        '-Icon', $Icon,
        '-DesktopPath', $TempRoot,
        '-NoIconCacheRefresh'
    )

    Assert-True ($exit -eq 0) 'accepts an isolated DesktopPath for deterministic tests'
    $fresh = Get-TestShortcut (Join-Path $TempRoot 'Injected Desktop.lnk')
    Assert-True ($fresh.TargetPath -eq $Cmd) 'writes the shortcut inside the injected Desktop'
    Assert-True ($fresh.IconLocation -eq "$Icon,0") 'fresh shortcut receives the requested icon location'

    $samePath = Join-Path $TempRoot 'Same Target.lnk'
    New-TestShortcut $samePath $Cmd '/mode preserved' 'CTRL+ALT+S' $env:SystemRoot 7
    $before = Get-TestShortcut $samePath
    $before.Description = 'preserved description'
    $before.Save()
    $expectedHotkey = (Get-TestShortcut $samePath).Hotkey
    $exit = Invoke-Launcher @('-Cmd', $Cmd, '-Name', 'Same Target', '-Icon', $Icon, '-DesktopPath', $TempRoot, '-NoIconCacheRefresh')
    $same = Get-TestShortcut $samePath
    Assert-True ($exit -eq 0) 'same-target icon refresh succeeds'
    Assert-True ($same.Arguments -eq '/mode preserved') 'same-target icon refresh preserves arguments'
    Assert-True ($same.Hotkey -eq $expectedHotkey) 'same-target icon refresh preserves hotkey'
    Assert-True ($same.WorkingDirectory -eq $env:SystemRoot) 'same-target icon refresh preserves working directory'
    Assert-True ($same.WindowStyle -eq 7) 'same-target icon refresh preserves window style'
    Assert-True ($same.Description -eq 'preserved description') 'same-target icon refresh preserves description'
    Assert-True ($same.IconLocation -eq "$Icon,0") 'same-target refresh updates the requested icon location'

    $escapedName = "..\$((Split-Path -Leaf $TempRoot))-escaped"
    $exit = Invoke-Launcher @('-Cmd', $Cmd, '-Name', $escapedName, '-Icon', $Icon, '-DesktopPath', $TempRoot, '-NoIconCacheRefresh')
    Assert-True ($exit -eq 2) 'rejects shortcut names that escape the Desktop'
    Assert-True (-not (Test-Path -LiteralPath $EscapedPath)) 'path traversal creates no shortcut outside the Desktop'

    $exit = Invoke-Launcher @('-Cmd', $Cmd, '-Name', 'CON', '-Icon', $Icon, '-DesktopPath', $TempRoot, '-NoIconCacheRefresh')
    Assert-True ($exit -eq 2) 'rejects reserved Windows device names before writing'

    $foreignPath = Join-Path $TempRoot 'Foreign Target.lnk'
    New-TestShortcut $foreignPath (Join-Path $env:SystemRoot 'System32\notepad.exe')
    $exit = Invoke-Launcher @('-Cmd', $Cmd, '-Name', 'Foreign Target', '-DesktopPath', $TempRoot, '-NoIconCacheRefresh')
    Assert-True ($exit -eq 3) 'foreign-target collision returns a nonzero refusal status'
    Assert-True ((Get-TestShortcut $foreignPath).TargetPath -ne $Cmd) 'foreign-target collision is not overwritten'
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $TempRoot 'Swan-Icons'))) 'foreign-target refusal performs no icon writes'

    $forcePath = Join-Path $TempRoot 'Forced Foreign Target.lnk'
    New-TestShortcut $forcePath (Join-Path $env:SystemRoot 'System32\notepad.exe') '/old mode'
    $exit = Invoke-Launcher @('-Cmd', $Cmd, '-Name', 'Forced Foreign Target', '-Icon', $Icon, '-DesktopPath', $TempRoot, '-NoIconCacheRefresh', '-Force')
    $forced = Get-TestShortcut $forcePath
    Assert-True ($exit -eq 0) 'Force replaces a foreign-target collision'
    Assert-True ($forced.TargetPath -eq $Cmd -and [string]::IsNullOrEmpty($forced.Arguments)) 'Force replacement starts with clean shortcut semantics'
    Assert-True (@(Get-ChildItem -LiteralPath $TempRoot -Filter 'Forced Foreign Target.lnk.bak-*').Count -eq 1) 'Force creates exactly one backup of the foreign shortcut'

    $blankPath = Join-Path $TempRoot 'Blank Target.lnk'
    New-TestShortcut $blankPath ''
    $exit = Invoke-Launcher @('-Cmd', $Cmd, '-Name', 'Blank Target', '-Icon', $Icon, '-DesktopPath', $TempRoot, '-NoIconCacheRefresh')
    Assert-True ($exit -eq 3) 'blank-target collision fails closed without Force'
    Assert-True ([string]::IsNullOrEmpty((Get-TestShortcut $blankPath).TargetPath)) 'blank-target collision is not overwritten'

    $commaDesktop = Join-Path $TempRoot 'Folder, With Comma'
    [IO.Directory]::CreateDirectory($commaDesktop) | Out-Null
    $commaIcon = Join-Path $commaDesktop 'icon, source.ico'
    [IO.File]::Copy($Icon, $commaIcon)
    $exit = Invoke-Launcher @('-Cmd', $Cmd, '-Name', 'Comma Path', '-Icon', $commaIcon, '-DesktopPath', $commaDesktop, '-NoIconCacheRefresh')
    $commaShortcut = Get-TestShortcut (Join-Path $commaDesktop 'Comma Path.lnk')
    Assert-True ($exit -eq 0) 'accepts an explicit icon path containing a comma'
    Assert-True ($commaShortcut.IconLocation -eq "$commaIcon,0") 'comma-bearing icon location round-trips through WScript.Shell'

    $emptyDesktop = Join-Path $TempRoot 'Empty Desktop'
    [IO.Directory]::CreateDirectory($emptyDesktop) | Out-Null
    $exit = Invoke-Launcher @('-List', '-DesktopPath', $emptyDesktop, '-NoIconCacheRefresh')
    Assert-True ($exit -eq 0) 'List succeeds when the Desktop contains no cmd launchers'

    Write-Host "Set-SwanLauncher: $($script:Passes) passed, $($script:Failures) failed"
    if ($script:Failures) { throw 'Set-SwanLauncher regression failures' }
} finally {
    if ([IO.File]::Exists($EscapedPath)) { [IO.File]::Delete($EscapedPath) }
    if ($TempRoot.StartsWith($ExpectedTempPrefix, [StringComparison]::OrdinalIgnoreCase) -and [IO.Directory]::Exists($TempRoot)) {
        [IO.Directory]::Delete($TempRoot, $true)
    }
}
