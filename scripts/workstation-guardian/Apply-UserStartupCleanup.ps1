param([string]$BundleRoot = 'C:\tmp\workstation-maintenance-20260830')

$ErrorActionPreference = 'Stop'
$run = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$backup = 'HKCU:\Software\SwanWorkstationGuardian\DisabledStartup\HKCU-Run'
New-Item -Path $backup -Force | Out-Null

foreach ($name in @(
  'Docker Desktop', 'electron.app.LM Studio', 'EpicGamesLauncher', 'EADM',
  'CanvaAutoLaunchAvailabilityCheckAgent', 'AdobeBridge', 'NVIDIA Broadcast',
  'Parsec.App.0', 'BingWallpaperDaemon', 'WallpaperEngine'
)) {
  $property = (Get-ItemProperty -LiteralPath $run).PSObject.Properties[$name]
  if ($null -eq $property) { continue }
  Set-ItemProperty -LiteralPath $backup -Name $name -Value ([string]$property.Value)
  Remove-ItemProperty -LiteralPath $run -Name $name
  Write-Host "Disabled user startup value: $name"
}

$disabled = Join-Path $BundleRoot 'startup-disabled'
New-Item -ItemType Directory -Path $disabled -Force | Out-Null
$startup = [Environment]::GetFolderPath('Startup')
foreach ($name in @('DisplayWidgetCenterLauncher.lnk', 'Luminar Neo.lnk')) {
  $path = Join-Path $startup $name
  if (Test-Path -LiteralPath $path) {
    Move-Item -LiteralPath $path -Destination (Join-Path $disabled $name) -Force
    Write-Host "Disabled user startup shortcut: $name"
  }
}

foreach ($name in @('wallpaper64', 'Docker Desktop', 'LM Studio', 'EpicGamesLauncher', 'EADesktop', 'FireStorm', 'MSIAfterburner')) {
  Get-Process -Name $name -ErrorAction SilentlyContinue | Stop-Process -Force
}

Write-Host 'User-level startup cleanup completed. Values and shortcuts are recoverable from the rollback bundle/backup registry key.'
