# Trim-Clip.ps1 -- cut a section out of ANY video and land it in ComfyUI's input dropdown.
#
#   .\Trim-Clip.ps1 -In "C:\path\to\full-video.mp4" -From 7:00 -To 7:20
#   .\Trim-Clip.ps1 -In phone.mp4 -From 95 -To 115        (plain seconds work too)
#
# WHY THIS EXISTS. Workflow '06 - Video to Character' decodes the WHOLE video into memory, so it
# needs short clips (~20s). This is the default protocol for long videos: point at the full file,
# name the window, and the trimmed clip appears in workflow 06's video dropdown (refresh the
# browser tab). Times accept h:mm:ss, mm:ss, or seconds.
#
# WHY IT RE-ENCODES (deliberate): phone/downloaded videos are often variable-framerate. A fast
# stream-copy would keep that, silently breaking exact cut points AND the frame-pick arithmetic
# (index = seconds x 24) that workflow 06 teaches. Re-encoding to constant 24fps h264 makes both
# exact, and a 20s clip takes only a few seconds. Audio is dropped - frames are all 06 uses.

param(
    [Parameter(Mandatory=$true)][string]$In,
    [Parameter(Mandatory=$true)][string]$From,
    [Parameter(Mandatory=$true)][string]$To
)

$ErrorActionPreference = 'Stop'
$inputDir = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'input-candidate'

function To-Seconds([string]$t) {
    $parts = $t.Trim() -split ':'
    switch ($parts.Count) {
        1 { return [double]$parts[0] }
        2 { return [double]$parts[0] * 60 + [double]$parts[1] }
        3 { return [double]$parts[0] * 3600 + [double]$parts[1] * 60 + [double]$parts[2] }
        default { throw "Cannot read time '$t' - use seconds, mm:ss, or h:mm:ss." }
    }
}

if (-not (Test-Path -LiteralPath $In)) { throw "Video not found: $In" }
$fromS = To-Seconds $From
$toS   = To-Seconds $To
if ($toS -le $fromS) { throw "End time must be after start time ($From .. $To)." }
$lenS = $toS - $fromS
if ($lenS -gt 30) {
    Write-Host ("  [!] {0:N0}s is longer than the ~20s law for workflow 06. Trimming anyway - expect heavy memory use." -f $lenS)
}

$stem = [System.IO.Path]::GetFileNameWithoutExtension($In) -replace '[^A-Za-z0-9_-]', '_'
$tag  = ('{0}s-{1}s' -f [math]::Round($fromS), [math]::Round($toS))
$dest = Join-Path $inputDir ("clip_{0}_{1}.mp4" -f $stem, $tag)

Write-Host ''
Write-Host ("  trimming {0}" -f (Split-Path -Leaf $In))
Write-Host ("  window   {0} -> {1}  ({2:N1}s)" -f $From, $To, $lenS)
Write-Host ("  output   {0}" -f $dest)
Write-Host ''

& ffmpeg -v error -ss $fromS -to $toS -i "$In" -vf "fps=24" -c:v libx264 -preset veryfast -crf 18 -an -y "$dest"
if ($LASTEXITCODE -ne 0) { throw 'ffmpeg failed - is the input a real video file?' }

# Verify what actually landed - a trimmer that never checks its output is the size-not-identity
# mistake all over again.
$probe = & ffprobe -v error -select_streams v -show_entries "stream=r_frame_rate:format=duration" -of csv=p=0 "$dest"
$fps = ($probe | Select-Object -First 1)
$dur = [double]($probe | Select-Object -Last 1)
if ([math]::Abs($dur - $lenS) -gt 1.0) { throw ("Trimmed duration {0:N1}s does not match the requested {1:N1}s window." -f $dur, $lenS) }
Write-Host ("  verified: {0:N1}s at {1} fps" -f $dur, $fps)
Write-Host ''
Write-Host '  Done. In ComfyUI: refresh the browser tab, open workflow 06, and pick this clip'
Write-Host ("  in the video dropdown: {0}" -f (Split-Path -Leaf $dest))
Write-Host '  Frame-pick arithmetic: index = seconds INTO THE CLIP x 24.'
Write-Host ''
exit 0
