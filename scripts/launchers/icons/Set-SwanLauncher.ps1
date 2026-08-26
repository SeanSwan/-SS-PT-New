<#
.SYNOPSIS
    Give a Swan .cmd launcher a real Desktop shortcut with a real icon.

.DESCRIPTION
    A .cmd file cannot carry an icon. Windows draws the generic batch-script glyph and there
    is no way to override that from inside the file. The icon has to live on a SHORTCUT that
    points at the .cmd. This script builds that shortcut.

    It is idempotent: run it as many times as you like. It reports what it changed and what
    was already correct, and it never deletes a .cmd or touches one that is running.

    Icon art comes from swan_icon.py, which either draws the Swan mark or converts a PNG you
    supply (see README.md for the ChatGPT prompt that produces a good source PNG).

.PARAMETER Cmd
    Path to the .cmd launcher. Relative paths resolve against the Desktop.

.PARAMETER Name
    Shortcut name, without .lnk. Defaults to the .cmd's base name.

.PARAMETER Icon
    Path to an existing .ico. If omitted, one is generated with swan_icon.py.

.PARAMETER Png
    Source PNG to convert into the icon (e.g. one ChatGPT produced). Overrides -Accent.

.PARAMETER Accent
    Rim/glow colour for a generated mark: ice, gold, violet, frost. Default ice.
    Use a different accent per tool so the family is distinguishable in the taskbar.

.PARAMETER List
    Show every Swan .cmd on the Desktop and whether it has a shortcut. Changes nothing.

.EXAMPLE
    .\Set-SwanLauncher.ps1 -List

.EXAMPLE
    .\Set-SwanLauncher.ps1 -Cmd "Swan Local Video 5090.cmd" -Accent ice

.EXAMPLE
    .\Set-SwanLauncher.ps1 -Cmd "Swan Prompt Studio.cmd" -Png "$HOME\Downloads\swan.png"

.PARAMETER Force
    Overwrite a .lnk that already exists and points somewhere OTHER than this .cmd. Without it,
    such a shortcut is left alone and the script exits. See the hostile-review note below.

.NOTES
    Rule 47: read-mostly. The only writes are the .lnk, the .ico, and an icon-cache refresh.

    HOSTILE REVIEW 2026-08-26 (GLM 5.3 + GLM 5.3 Flash, independently, both CONFIRMED):
    `WScript.Shell.CreateShortcut($path)` on an EXISTING .lnk does not fail and does not start
    clean - it binds the existing shortcut for editing, and Save() keeps every field you did not
    set. So running this against a name that collides with a hand-made shortcut would silently
    repoint it at a batch file while its old Arguments and Hotkey rode along. That is how you end
    up with a hotkey that used to launch a game now launching a .cmd. Hence: read the existing
    target first, refuse unless -Force, and on -Force back the original up and recreate it clean
    rather than editing in place.
#>
#requires -Version 5.1
[CmdletBinding(DefaultParameterSetName = 'Build')]
param(
    [Parameter(ParameterSetName = 'Build', Mandatory = $true, Position = 0)]
    [string]$Cmd,

    [Parameter(ParameterSetName = 'Build')]
    [string]$Name,

    [Parameter(ParameterSetName = 'Build')]
    [string]$Icon,

    [Parameter(ParameterSetName = 'Build')]
    [string]$Png,

    [Parameter(ParameterSetName = 'Build')]
    [ValidateSet('ice', 'gold', 'violet', 'frost')]
    [string]$Accent = 'ice',

    [Parameter(ParameterSetName = 'Build')]
    [switch]$Force,

    [Parameter(ParameterSetName = 'List', Mandatory = $true)]
    [switch]$List
)

$ErrorActionPreference = 'Stop'
$Desktop = [Environment]::GetFolderPath('Desktop')
$IconDir = Join-Path $Desktop 'Swan-Icons'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$IconPy = Join-Path $ScriptDir 'swan_icon.py'

function Get-ShortcutTargets {
    # Build a lookup of every Desktop .lnk -> its target, so we can tell which .cmd files
    # already have one. Reading is cheap; guessing from file names is wrong (a shortcut may
    # be named anything).
    $sh = New-Object -ComObject WScript.Shell
    $map = @{}
    Get-ChildItem -Path (Join-Path $Desktop '*.lnk') -ErrorAction SilentlyContinue | ForEach-Object {
        try {
            $lnk = $sh.CreateShortcut($_.FullName)
            if ($lnk.TargetPath) { $map[$lnk.TargetPath.ToLower()] = $_.Name }
        } catch { }
    }
    $map
}

if ($List) {
    $targets = Get-ShortcutTargets
    Write-Host ''
    Write-Host '  Swan launchers on the Desktop' -ForegroundColor Cyan
    Write-Host '  -----------------------------'
    Get-ChildItem -Path (Join-Path $Desktop '*.cmd') | Sort-Object Name | ForEach-Object {
        $have = $targets[$_.FullName.ToLower()]
        if ($have) {
            Write-Host ('    [icon] {0,-42} -> {1}' -f $_.Name, $have) -ForegroundColor Green
        } else {
            Write-Host ('    [    ] {0,-42}    no shortcut, generic batch icon' -f $_.Name) -ForegroundColor DarkYellow
        }
    }
    Write-Host ''
    Write-Host '  Give one an icon:' -ForegroundColor Cyan
    Write-Host '    .\Set-SwanLauncher.ps1 -Cmd "Swan Local Video 5090.cmd" -Accent ice'
    Write-Host ''
    return
}

# --- resolve the .cmd -----------------------------------------------------------------------
if (-not [System.IO.Path]::IsPathRooted($Cmd)) { $Cmd = Join-Path $Desktop $Cmd }
if (-not (Test-Path -LiteralPath $Cmd)) { throw "No such launcher: $Cmd" }
$Cmd = (Resolve-Path -LiteralPath $Cmd).Path
if (-not $Name) { $Name = [System.IO.Path]::GetFileNameWithoutExtension($Cmd) }

Write-Host ''
Write-Host "  Launcher : $Cmd"

# --- icon -----------------------------------------------------------------------------------
if (-not $Icon) {
    if (-not (Test-Path -LiteralPath $IconPy)) { throw "swan_icon.py not found beside this script: $IconPy" }
    New-Item -ItemType Directory -Force -Path $IconDir | Out-Null

    # Stripping non-alphanumerics is NOT injective: "Swan - Watch" and "Swan Watch" both collapse
    # to "SwanWatch", and a name with no A-Z at all collapses to nothing at all. Either way the
    # second launcher silently overwrites the first's icon and BOTH shortcuts then show the same
    # art with no error anywhere. Both review seats found this independently. A short hash of the
    # ORIGINAL name restores uniqueness while keeping the filename readable.
    $stem = $Name -replace '[^A-Za-z0-9]', ''
    if (-not $stem) { $stem = 'SwanLauncher' }
    $md5 = [System.Security.Cryptography.MD5]::Create()
    $hash = [BitConverter]::ToString(
        $md5.ComputeHash([Text.Encoding]::UTF8.GetBytes($Name))
    ).Replace('-', '').Substring(0, 6).ToLower()
    $md5.Dispose()
    $Icon = Join-Path $IconDir "$stem-$hash.ico"

    $py = Get-Command python -ErrorAction SilentlyContinue
    if (-not $py) { throw 'python not on PATH; pass -Icon with a prebuilt .ico instead.' }

    if ($Png) {
        if (-not [System.IO.Path]::IsPathRooted($Png)) { $Png = Join-Path $Desktop $Png }
        if (-not (Test-Path -LiteralPath $Png)) { throw "No such PNG: $Png" }
        & python $IconPy convert --png $Png --out $Icon --contact-sheet ($Icon -replace '\.ico$', '-preview.png')
    } else {
        & python $IconPy build --accent $Accent --out $Icon --contact-sheet ($Icon -replace '\.ico$', '-preview.png')
    }
    if ($LASTEXITCODE -ne 0) { throw 'icon generation failed' }
} else {
    if (-not [System.IO.Path]::IsPathRooted($Icon)) { $Icon = Join-Path $Desktop $Icon }
    if (-not (Test-Path -LiteralPath $Icon)) { throw "No such icon: $Icon" }
    $Icon = (Resolve-Path -LiteralPath $Icon).Path
    # IconLocation is the positional string "path,index". A comma in the path itself makes that
    # ambiguous, and commas are legal in folder names - "Doe, John" profiles exist. The generated
    # path is safe by construction; this only guards the -Icon escape hatch.
    if ($Icon.Contains(',')) {
        throw "Icon path contains a comma, which IconLocation cannot express unambiguously: $Icon`nCopy it somewhere without a comma and pass that."
    }
}

# --- shortcut ---------------------------------------------------------------------------------
$LnkPath = Join-Path $Desktop "$Name.lnk"
$existed = Test-Path -LiteralPath $LnkPath
$sh = New-Object -ComObject WScript.Shell

if ($existed) {
    # Read what is there BEFORE touching it. CreateShortcut binds an existing shortcut for
    # editing and Save() preserves every field we do not set - so writing blind would repoint
    # someone else's shortcut at our .cmd while its Arguments and Hotkey survived.
    $prior = $sh.CreateShortcut($LnkPath)
    $priorTarget = $prior.TargetPath
    if ($priorTarget -and ($priorTarget -ne $Cmd)) {
        if (-not $Force) {
            Write-Host ''
            Write-Host "  REFUSED - a different shortcut already owns that name." -ForegroundColor Red
            Write-Host "    $LnkPath"
            Write-Host "    currently points at : $priorTarget"
            Write-Host "    would be changed to : $Cmd"
            if ($prior.Arguments)  { Write-Host "    it also carries arguments: $($prior.Arguments)" }
            if ($prior.Hotkey)     { Write-Host "    it also carries a hotkey : $($prior.Hotkey)" }
            Write-Host ''
            Write-Host "  Re-run with -Force to replace it (the original is backed up first)," -ForegroundColor DarkYellow
            Write-Host "  or pass -Name to write a differently-named shortcut instead." -ForegroundColor DarkYellow
            Write-Host ''
            return
        }
        # -Force: back up, then DELETE so the new shortcut is built clean rather than inheriting
        # stale Arguments/Hotkey/WindowStyle from whatever was there.
        $backup = "$LnkPath.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Copy-Item -LiteralPath $LnkPath -Destination $backup -Force
        Remove-Item -LiteralPath $LnkPath -Force
        Write-Host "  Replaced a foreign shortcut. Original backed up:" -ForegroundColor DarkYellow
        Write-Host "    $backup" -ForegroundColor DarkYellow
    }
}

$lnk = $sh.CreateShortcut($LnkPath)
$lnk.Arguments = ''
$lnk.Hotkey = ''
$lnk.TargetPath = $Cmd
$lnk.WorkingDirectory = Split-Path -Parent $Cmd
$lnk.IconLocation = "$Icon,0"
$lnk.WindowStyle = 1
$lnk.Description = "SwanStudios - $Name"
$lnk.Save()

Write-Host "  Icon     : $Icon"
Write-Host "  Shortcut : $LnkPath  $(if ($existed) { '(updated)' } else { '(created)' })"

# --- make Explorer notice ----------------------------------------------------------------------
# Windows caches icons aggressively. Without this the shortcut keeps showing the old glyph
# until something else invalidates the cache, which reads as "it did not work".
try {
    Start-Process -FilePath (Join-Path $env:SystemRoot 'system32\ie4uinit.exe') `
        -ArgumentList '-show' -WindowStyle Hidden -ErrorAction Stop
    # Deliberately NOT phrased as "refreshed". ie4uinit -show returns no success signal and on
    # Windows 11 flushes only part of the icon cache - it reliably picks up a new .lnk with a new
    # icon path, and often misses an icon rewritten in place at the same path. Claiming success
    # here would send the owner rebooting Explorer by trial when the script had simply no-opped.
    Write-Host '  Icon cache nudged. If the old glyph persists, restart explorer.exe' -ForegroundColor DarkGray
    Write-Host '  (Task Manager > Windows Explorer > Restart) - that always clears it.' -ForegroundColor DarkGray
} catch {
    Write-Host '  ! Icon cache not nudged. If the old icon persists, restart explorer.exe.' -ForegroundColor DarkYellow
}

Write-Host ''
Write-Host '  Done. Look at the -preview.png beside the .ico to judge the 16px end.' -ForegroundColor Green
Write-Host ''
