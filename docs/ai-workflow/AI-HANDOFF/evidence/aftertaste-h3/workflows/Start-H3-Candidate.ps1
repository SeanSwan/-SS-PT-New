$ErrorActionPreference = 'Stop'

$candidateRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$candidatePython = Join-Path $candidateRoot '.venv\Scripts\python.exe'

# ONE render library, on the big disk. 2026-08-31: output was `output-candidate` on C:, which has
# ~146 GB free and is the system drive, while Z: has ~715 GB and already held the existing 144 MB
# render library. Splitting output across two folders also hid renders from the taste brain, which
# joins renders to one directory. Falls back to the local folder if Z: is not mounted, so the
# launcher still starts when the drive is absent.
$sharedOutput = 'Z:\SwanStudios-Video\output'
$outputDir = if (Test-Path -LiteralPath (Split-Path -Parent $sharedOutput)) { $sharedOutput }
             else { Join-Path $candidateRoot 'output-candidate' }

$candidateArgs = @(
    'main.py',
    '--listen', '127.0.0.1',
    '--port', '8189',
    '--disable-auto-launch',
    '--extra-model-paths-config', (Join-Path $candidateRoot 'extra_model_paths.yaml'),
    '--user-directory', (Join-Path $candidateRoot 'user-candidate'),
    '--output-directory', $outputDir,
    '--temp-directory', (Join-Path $candidateRoot 'temp-candidate'),
    '--input-directory', (Join-Path $candidateRoot 'input-candidate'),
    '--log-stdout'
)

if (-not (Test-Path -LiteralPath $candidatePython)) {
    throw "Candidate Python is missing: $candidatePython"
}

Set-Location -LiteralPath $candidateRoot
& $candidatePython @candidateArgs
exit $LASTEXITCODE
