Option Explicit
Dim shell
Set shell = CreateObject("WScript.Shell")
shell.Run "wsl.exe -d Ubuntu-22.04 -- bash /mnt/c/tmp/hermes2-gateway-bg-start.sh", 0, False
WScript.Quit 0
