param([string]$BundleRoot = 'C:\tmp\workstation-maintenance-20260830')

$ErrorActionPreference = 'Stop'
$principal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Driver installation requires elevation.'
}

$log = Join-Path $BundleRoot 'drivers-elevated.log'
Start-Transcript -Path $log -Force | Out-Null
try {
  try {
    Enable-ComputerRestore -Drive 'C:\' -ErrorAction SilentlyContinue
    Checkpoint-Computer -Description 'Before signed motherboard drivers 2026-08-30' -RestorePointType DEVICE_DRIVER_INSTALL
  } catch {
    Write-Warning "Restore point unavailable: $($_.Exception.Message). The exported rollback bundle remains available."
  }

  $driverRoots = @(
    (Join-Path $BundleRoot 'downloads\qualcomm-bt-3.1.0.1571-extracted\payload\BT'),
    (Join-Path $BundleRoot 'downloads\qualcomm-wifi-3.1.0.1571-extracted\payload\WLAN'),
    (Join-Path $BundleRoot 'downloads\realtek-lan-11.29.50.0202-extracted\payload\mbdriver\WIN11\64'),
    (Join-Path $BundleRoot 'downloads\realtek-audio-6.0.9927.1-extracted\payload\Win64')
  )

  foreach ($root in $driverRoots) {
    if (-not (Test-Path -LiteralPath $root)) { throw "Driver payload missing: $root" }
    $catalogs = @(Get-ChildItem -LiteralPath $root -Recurse -Filter *.cat)
    if ($catalogs.Count -eq 0) { throw "No signed catalogs found under $root" }
    $invalid = @($catalogs | Where-Object {
      (Get-AuthenticodeSignature -FilePath $_.FullName).Status -ne 'Valid'
    })
    if ($invalid.Count -gt 0) { throw "Invalid catalog signature under $root" }

    Write-Host "Installing matching signed drivers from $root"
    & pnputil.exe /add-driver (Join-Path $root '*.inf') /subdirs /install | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "pnputil failed for $root with exit $LASTEXITCODE" }
  }

  try {
    Get-CimInstance Win32_PnPSignedDriver | Where-Object {
      $_.DeviceName -match 'Realtek.*(2.5GbE|Audio)|Qualcomm.*(Wi-Fi|Bluetooth)'
    } | Select-Object DeviceName, DriverVersion, DriverDate, Manufacturer |
      Export-Clixml -LiteralPath (Join-Path $BundleRoot 'pnp-drivers.after-driver-install.xml')
  } catch {
    Write-Warning "Drivers installed, but the non-critical verification export failed: $($_.Exception.Message)"
  }
  Write-Host 'Signed motherboard driver installation completed. Reboot is required.'
} finally {
  Stop-Transcript | Out-Null
}
exit 0
