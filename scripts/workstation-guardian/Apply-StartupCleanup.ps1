param([string]$BundleRoot = 'C:\tmp\workstation-maintenance-20260830')

$ErrorActionPreference = 'Stop'
$principal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Machine startup cleanup requires elevation.'
}

function Move-StartupValue([string]$Path, [string]$Name, [string]$BackupKey) {
  if (-not (Test-Path -LiteralPath $Path)) { return }
  $property = (Get-ItemProperty -LiteralPath $Path).PSObject.Properties[$Name]
  if ($null -eq $property) { return }
  New-Item -Path $BackupKey -Force | Out-Null
  Set-ItemProperty -LiteralPath $BackupKey -Name $Name -Value ([string]$property.Value)
  Remove-ItemProperty -LiteralPath $Path -Name $Name
  Write-Host "Disabled startup value: $Name"
}

function Move-StartupShortcut([string]$Path, [string]$BackupDirectory) {
  if (-not (Test-Path -LiteralPath $Path)) { return }
  New-Item -ItemType Directory -Path $BackupDirectory -Force | Out-Null
  Move-Item -LiteralPath $Path -Destination (Join-Path $BackupDirectory (Split-Path -Leaf $Path)) -Force
  Write-Host "Disabled startup shortcut: $(Split-Path -Leaf $Path)"
}

$log = Join-Path $BundleRoot 'startup-cleanup-elevated.log'
Start-Transcript -Path $log -Force | Out-Null
try {
  & reg.exe export 'HKLM\Software\Microsoft\Windows\CurrentVersion\Run' (Join-Path $BundleRoot 'hklm-run.reg') /y | Out-Host
  & reg.exe export 'HKLM\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Run' (Join-Path $BundleRoot 'hklm-run32.reg') /y | Out-Host

  $run = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
  foreach ($name in @(
    'Docker Desktop', 'electron.app.LM Studio', 'EpicGamesLauncher', 'EADM',
    'CanvaAutoLaunchAvailabilityCheckAgent', 'AdobeBridge', 'NVIDIA Broadcast',
    'Parsec.App.0', 'BingWallpaperDaemon', 'WallpaperEngine'
  )) { Move-StartupValue $run $name 'HKCU:\Software\SwanWorkstationGuardian\DisabledStartup\HKCU-Run' }

  Move-StartupValue 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Run' 'iTunesHelper' `
    'HKLM:\Software\SwanWorkstationGuardian\DisabledStartup\HKLM-Run'
  foreach ($name in @('Adobe CCXProcess', 'Adobe Creative Cloud', 'PMBVolumeWatcher', 'FireStormStartUpAutoRun')) {
    Move-StartupValue 'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Run' $name `
      'HKLM:\Software\SwanWorkstationGuardian\DisabledStartup\HKLM-Run32'
  }

  $disabled = Join-Path $BundleRoot 'startup-disabled'
  $userStartup = [Environment]::GetFolderPath('Startup')
  $commonStartup = [Environment]::GetFolderPath('CommonStartup')
  foreach ($name in @('DisplayWidgetCenterLauncher.lnk', 'Luminar Neo.lnk')) {
    Move-StartupShortcut (Join-Path $userStartup $name) $disabled
  }
  foreach ($name in @('Imaging Edge Desktop.lnk', 'RustDesk Tray.lnk')) {
    Move-StartupShortcut (Join-Path $commonStartup $name) $disabled
  }

  Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object {
    $_.TaskName -match 'MSI Afterburner|FireStorm'
  } | Disable-ScheduledTask | Out-Host

  foreach ($name in @('wallpaper64', 'Docker Desktop', 'LM Studio', 'EpicGamesLauncher', 'EADesktop', 'FireStorm', 'MSIAfterburner')) {
    Get-Process -Name $name -ErrorAction SilentlyContinue | Stop-Process -Force
  }
  Write-Host 'Conservative startup cleanup completed. GPU Tweak, cooling/RGB, security, Tailscale, PostgreSQL, and coding agents were preserved.'
} finally {
  Stop-Transcript | Out-Null
}
