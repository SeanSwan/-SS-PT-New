param([string]$BundleRoot = 'C:\tmp\workstation-maintenance-20260830')

$ErrorActionPreference = 'Stop'
$principal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Gaming system settings require elevation.'
}

$log = Join-Path $BundleRoot 'gaming-settings-elevated.log'
Start-Transcript -Path $log -Force | Out-Null
try {
  Write-Host 'Disabling Parsec virtual display adapter ROOT\DISPLAY\0000'
  & pnputil.exe /disable-device 'ROOT\DISPLAY\0000' | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "Parsec VDA disable failed with exit $LASTEXITCODE" }

  Write-Host 'Activating Windows Balanced power plan for Ryzen X3D scheduling.'
  & powercfg.exe /setactive SCHEME_BALANCED | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "Power plan change failed with exit $LASTEXITCODE" }

  New-Item -Path 'HKCU:\System\GameConfigStore' -Force | Out-Null
  Set-ItemProperty -Path 'HKCU:\System\GameConfigStore' -Name GameDVR_Enabled -Type DWord -Value 0
  New-Item -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR' -Force | Out-Null
  Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR' -Name AppCaptureEnabled -Type DWord -Value 0

  $adapter = Get-NetAdapter -Name 'Ethernet 2' -ErrorAction Stop
  Set-NetAdapterAdvancedProperty -Name $adapter.Name -RegistryKeyword EnableGreenEthernet -RegistryValue 0 -NoRestart
  Set-NetAdapterAdvancedProperty -Name $adapter.Name -RegistryKeyword PowerSavingMode -RegistryValue 0 -NoRestart
  Restart-NetAdapter -Name $adapter.Name -Confirm:$false

  & powercfg.exe /getactivescheme | Set-Content -LiteralPath (Join-Path $BundleRoot 'active-power.after.txt')
  Get-NetAdapterAdvancedProperty -Name $adapter.Name |
    Select-Object DisplayName, DisplayValue, RegistryKeyword, RegistryValue |
    Export-Clixml -LiteralPath (Join-Path $BundleRoot 'ethernet2-advanced.after.xml')
  Write-Host 'Gaming display, power, capture, and NIC settings completed.'
} finally {
  Stop-Transcript | Out-Null
}
