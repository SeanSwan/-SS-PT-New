function Write-Step($Message) {
  Write-Host ''
  Write-Host "== $Message" -ForegroundColor Cyan
}

function Write-Ok($Message) {
  Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Warn($Message) {
  Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Test-Command($Name) {
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Ensure-Dir($Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path | Out-Null
  }
}

function Read-YesNo($Prompt, [bool]$DefaultYes = $true) {
  $suffix = if ($DefaultYes) { '[Y/n]' } else { '[y/N]' }
  $answer = Read-Host "$Prompt $suffix"
  if ([string]::IsNullOrWhiteSpace($answer)) { return $DefaultYes }
  return $answer.Trim().ToLowerInvariant().StartsWith('y')
}

function Quote-PS($Value) {
  return "'" + ($Value -replace "'", "''") + "'"
}

function Invoke-InDir($Command, [string[]]$Arguments, $WorkingDir) {
  Push-Location $WorkingDir
  try {
    Write-Host "> $Command $($Arguments -join ' ')" -ForegroundColor DarkGray
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "$Command failed with exit code $LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }
}

function Get-PythonCommand {
  if (Test-Command 'python') { return 'python' }
  if (Test-Command 'py') { return 'py' }
  return $null
}

function Refresh-ProcessPath {
  $machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = "$machinePath;$userPath;$env:Path"
  $ffmpeg = Get-ChildItem -Path (Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages') `
    -Recurse -Filter ffmpeg.exe -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($ffmpeg) {
    $ffmpegBin = Split-Path -Parent $ffmpeg.FullName
    if ($env:Path -notlike "*$ffmpegBin*") { $env:Path = "$ffmpegBin;$env:Path" }
  }
}

function Initialize-Workspace {
  Write-Step 'Preparing Swan video workspace'
  $folders = @(
    '00-inbox-raw', '01-active-projects', '02-brand-assets',
    '03-style-guides', '04-renders-ready-for-youtube',
    '05-youtube-metadata', '06-app-import-records', '99-archive', 'logs'
  )
  Ensure-Dir $WorkspaceRoot
  foreach ($folder in $folders) { Ensure-Dir (Join-Path $WorkspaceRoot $folder) }

  Copy-Item -LiteralPath (Join-Path $ScriptRoot 'README.md') `
    -Destination (Join-Path $WorkspaceRoot '03-style-guides\README-TOOLS.md') -Force
  Copy-Item -LiteralPath (Join-Path $ScriptRoot 'SWAN_VIDEO_STYLE.md') `
    -Destination (Join-Path $WorkspaceRoot '03-style-guides\SWAN_VIDEO_STYLE.md') -Force
  Copy-Item -LiteralPath (Join-Path $ScriptRoot 'WORKFLOW_PROMPTS.md') `
    -Destination (Join-Path $WorkspaceRoot '03-style-guides\WORKFLOW_PROMPTS.md') -Force
  Copy-Item -LiteralPath (Join-Path $ScriptRoot 'youtube-metadata-template.json') `
    -Destination (Join-Path $WorkspaceRoot '05-youtube-metadata\youtube-metadata-template.json') -Force

  @"
# Start Codex Here

Workspace:
$WorkspaceRoot

First prompt:

Read 03-style-guides\SWAN_VIDEO_STYLE.md and 03-style-guides\WORKFLOW_PROMPTS.md.
We are creating SwanStudios YouTube exercise videos with video-use for trimming/transcripts and HyperFrames for motion graphics.

Do not upload anything to YouTube without explicit approval.
Do not use client names, emails, phone numbers, or private health notes.
"@ | Set-Content -LiteralPath (Join-Path $WorkspaceRoot 'START-CODEX-HERE.md') -Encoding UTF8

  'Drop raw .mp4, .mov, or .mkv files here, then launch Codex from the workspace or project folder.' |
    Set-Content -LiteralPath (Join-Path $WorkspaceRoot '00-inbox-raw\DROP-RAW-VIDEOS-HERE.txt') -Encoding UTF8
  Write-Ok $WorkspaceRoot
}

function Show-EnvironmentStatus {
  Write-Step 'Checking local tools'
  Refresh-ProcessPath
  foreach ($tool in @('git', 'node', 'npm', 'python', 'py', 'ffmpeg', 'ffprobe', 'uv', 'codex', 'code', 'winget')) {
    if (Test-Command $tool) { Write-Ok "$tool found" } else { Write-Warn "$tool not found" }
  }
  if (Test-Command 'node') {
    $version = (& node --version).TrimStart('v')
    $major = [int]($version.Split('.')[0])
    if ($major -lt 22) { Write-Warn "HyperFrames currently expects Node.js 22+. Found node v$version." }
  }
}

function Install-WingetPackage($Label, $Id) {
  if ($NoToolInstall -or -not (Test-Command 'winget')) { return }
  if (Read-YesNo "Install $Label via winget package $Id?" $false) {
    & winget install --id $Id --exact --source winget
  }
}

function Offer-MissingToolInstalls {
  Write-Step 'Optional dependency installs'
  if (-not (Test-Command 'git')) { Install-WingetPackage 'Git' 'Git.Git' }
  if (-not (Test-Command 'node')) { Install-WingetPackage 'Node.js LTS' 'OpenJS.NodeJS.LTS' }
  if (-not (Test-Command 'python') -and -not (Test-Command 'py')) { Install-WingetPackage 'Python 3.12' 'Python.Python.3.12' }
  if (-not (Test-Command 'ffmpeg') -or -not (Test-Command 'ffprobe')) { Install-WingetPackage 'FFmpeg' 'Gyan.FFmpeg' }
  Refresh-ProcessPath
}

function Ensure-VideoUse {
  Write-Step 'Setting up video-use for Codex'
  if (-not (Test-Command 'git')) {
    Write-Warn 'Skipping video-use clone because git is missing.'
    return
  }
  Ensure-Dir $ToolRoot
  $videoUseRoot = Join-Path $ToolRoot 'video-use'
  try {
    if (Test-Path -LiteralPath $videoUseRoot) {
      Invoke-InDir 'git' @('pull', '--ff-only') $videoUseRoot
    } else {
      Invoke-InDir 'git' @('clone', 'https://github.com/browser-use/video-use', $videoUseRoot) $ToolRoot
    }
  } catch {
    Write-Warn "video-use clone/update failed: $($_.Exception.Message)"
    Write-Warn 'Continuing with workspace setup. Rerun the launcher when network access is available.'
    return
  }
  if (-not $NoToolInstall -and (Read-YesNo 'Install or update video-use Python dependencies now?' $true)) {
    try {
      if (Test-Command 'uv') {
        Invoke-InDir 'uv' @('sync') $videoUseRoot
      } else {
        $python = Get-PythonCommand
        if ($python) { Invoke-InDir $python @('-m', 'pip', 'install', '-e', '.') $videoUseRoot }
        else { Write-Warn 'No Python command found. Install Python, then rerun this launcher.' }
      }
    } catch {
      Write-Warn "video-use dependency install failed: $($_.Exception.Message)"
    }
  }
  Register-VideoUseSkill $videoUseRoot
  Ensure-ElevenLabsKey $videoUseRoot
}

function Register-VideoUseSkill($videoUseRoot) {
  $codexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
  $skillsRoot = Join-Path $codexHome 'skills'
  $skillTarget = Join-Path $skillsRoot 'video-use'
  Ensure-Dir $skillsRoot
  if (Test-Path -LiteralPath $skillTarget) {
    Write-Ok "Codex skill target already exists: $skillTarget"
    return
  }
  try {
    New-Item -ItemType Junction -Path $skillTarget -Target $videoUseRoot | Out-Null
    Write-Ok "Registered video-use skill junction: $skillTarget"
  } catch {
    Write-Warn 'Junction failed; copying video-use skill folder instead.'
    Copy-Item -LiteralPath $videoUseRoot -Destination $skillTarget -Recurse -Force
  }
}

function Ensure-ElevenLabsKey($videoUseRoot) {
  $envFile = Join-Path $videoUseRoot '.env'
  $hasEnvKey = [bool]$env:ELEVENLABS_API_KEY
  $hasDotEnvKey = (Test-Path -LiteralPath $envFile) -and
    [bool](Select-String -LiteralPath $envFile -Pattern '^ELEVENLABS_API_KEY=..' -Quiet)
  if ($hasEnvKey -or $hasDotEnvKey) {
    Write-Ok 'ElevenLabs key already present in env or video-use .env.'
    return
  }
  if (-not (Read-YesNo 'Add ElevenLabs API key for word-level transcription now?' $false)) {
    Write-Warn 'Skipping ElevenLabs key. Transcription will wait until a key is provided.'
    return
  }
  $secret = Read-Host 'Paste ELEVENLABS_API_KEY' -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
  try {
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    "ELEVENLABS_API_KEY=$plain" | Set-Content -LiteralPath $envFile -Encoding ASCII
    Write-Ok "Wrote ElevenLabs key to $envFile"
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }
}

function Ensure-HyperFramesCodex {
  Write-Step 'Optional HyperFrames skills'
  if (-not (Test-Command 'npx')) {
    Write-Warn 'npx command not found. Install Node.js/npm, then run: npx skills add heygen-com/hyperframes'
    return
  }
  if (Read-YesNo 'Install or update HyperFrames agent skills now?' $false) {
    try {
      Invoke-InDir 'npx' @('skills', 'add', 'heygen-com/hyperframes') $RepoRoot
      Write-Ok 'HyperFrames skills command completed.'
    } catch {
      Write-Warn "HyperFrames skills command failed: $($_.Exception.Message)"
    }
  }
}

function New-SwanVideoProject {
  if ($SetupOnly -or -not (Read-YesNo 'Create a new exercise-video project folder now?' $true)) { return }
  $name = Read-Host 'Exercise or video name'
  if ([string]::IsNullOrWhiteSpace($name)) { $name = 'untitled-workout-video' }
  $slug = ($name.ToLowerInvariant() -replace '[^a-z0-9]+', '-').Trim('-')
  if ([string]::IsNullOrWhiteSpace($slug)) { $slug = 'untitled-workout-video' }
  $projectRoot = Join-Path $WorkspaceRoot ("01-active-projects\{0}-{1}" -f (Get-Date -Format 'yyyy-MM-dd'), $slug)
  foreach ($folder in @('raw', 'assets', 'edit', 'compositions', 'renders', 'transcripts', 'youtube', 'qa')) {
    Ensure-Dir (Join-Path $projectRoot $folder)
  }
  Copy-Item -LiteralPath (Join-Path $ScriptRoot 'youtube-metadata-template.json') `
    -Destination (Join-Path $projectRoot 'youtube\metadata.json') -Force
  @"
# $name

Project type: SwanStudios exercise video
Preferred editor: video-use
Preferred motion engine: HyperFrames

Start prompt:
Read ..\..\..\03-style-guides\SWAN_VIDEO_STYLE.md and inspect raw\. Inventory footage, propose a trim plan with timecodes, and do not render until approved.
"@ | Set-Content -LiteralPath (Join-Path $projectRoot 'project.md') -Encoding UTF8
  Write-Ok "Created project: $projectRoot"
  Start-Process explorer.exe -ArgumentList @($projectRoot)
}

function Open-Workflow {
  Write-Step 'Opening workflow'
  Start-Process explorer.exe -ArgumentList @($WorkspaceRoot)
  if (Test-Command 'code') { Start-Process 'code' -ArgumentList @($WorkspaceRoot) }
  if (Test-Command 'codex' -and (Read-YesNo 'Open a new Codex terminal in the video workspace?' $false)) {
    $cmd = "Set-Location -LiteralPath $(Quote-PS $WorkspaceRoot); codex"
    Start-Process powershell.exe -ArgumentList @('-NoExit', '-Command', $cmd)
  } else {
    $cmd = "Set-Location -LiteralPath $(Quote-PS $WorkspaceRoot); Get-Content .\START-CODEX-HERE.md"
    Start-Process powershell.exe -ArgumentList @('-NoExit', '-Command', $cmd)
  }
}
