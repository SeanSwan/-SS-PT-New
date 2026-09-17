<#
.SYNOPSIS
Sends a Wake-on-LAN packet to miniswan and optionally waits for SSH.

.DESCRIPTION
This helper is intentionally narrow. It does not suspend, hibernate, change a
power plan, alter NIC settings, or stop processes. The caller supplies the
adapter MAC and local broadcast address, so the packet is explicit and auditable.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateNotNullOrEmpty()]
  [string]$Mac,

  [ValidateNotNullOrEmpty()]
  [string]$BroadcastAddress = '192.168.50.255',

  [ValidateRange(1, 65535)]
  [int]$SshPort = 22,

  [ValidateNotNullOrEmpty()]
  [string]$ProbeHost = 'miniswan',

  [ValidateRange(1, 300)]
  [int]$WaitSeconds = 30,

  [int[]]$Ports = @(9, 7),

  [switch]$NoWait,

  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function Convert-MacToBytes {
  param([string]$Value)

  $compact = $Value -replace '[:-]', ''
  if ($compact -notmatch '^[0-9A-Fa-f]{12}$') {
    throw "INVALID_MAC: expected twelve hexadecimal digits, got $Value"
  }
  return [byte[]]@(0..5 | ForEach-Object {
    [Convert]::ToByte($compact.Substring($_ * 2, 2), 16)
  })
}

function New-WakeOnLanPacket {
  param([byte[]]$MacBytes)

  $packet = New-Object byte[] 102
  for ($i = 0; $i -lt 6; $i++) { $packet[$i] = 0xFF }
  for ($offset = 6; $offset -lt 102; $offset += 6) {
    for ($i = 0; $i -lt 6; $i++) { $packet[$offset + $i] = $MacBytes[$i] }
  }
  return ,$packet
}

$macBytes = Convert-MacToBytes -Value $Mac
if ($Ports.Count -eq 0) { throw 'INVALID_PORTS: at least one UDP port is required' }
if (@($Ports | Where-Object { $_ -lt 1 -or $_ -gt 65535 }).Count -gt 0) {
  throw "INVALID_PORTS: UDP ports must be between 1 and 65535"
}

if ($DryRun) {
  Write-Output "WOL_DRY_RUN mac=$Mac broadcast=$BroadcastAddress ports=$($Ports -join ',') probe=$ProbeHost ssh_port=$SshPort"
  exit 0
}

$packet = New-WakeOnLanPacket -MacBytes $macBytes
$udp = New-Object System.Net.Sockets.UdpClient
$udp.EnableBroadcast = $true
try {
  foreach ($port in $Ports) {
    $udp.Send($packet, $packet.Length, $BroadcastAddress, $port) | Out-Null
    Write-Output "WOL_SENT mac=$Mac target=$BroadcastAddress`:$port"
  }
}
catch {
  throw "WOL_SEND_FAILED: $($_.Exception.Message)"
}
finally {
  $udp.Dispose()
}

if ($NoWait) { exit 0 }

$deadline = (Get-Date).AddSeconds($WaitSeconds)
while ((Get-Date) -lt $deadline) {
  $ready = Test-NetConnection -ComputerName $ProbeHost -Port $SshPort -InformationLevel Quiet -WarningAction SilentlyContinue
  if ($ready) {
    Write-Output "MINISWAN_READY host=$ProbeHost ssh_port=$SshPort"
    exit 0
  }
  Start-Sleep -Seconds 2
}

throw "SSH_NOT_READY: $ProbeHost`:$SshPort did not accept a connection within ${WaitSeconds}s"
