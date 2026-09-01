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
    # The workflow Notes say "NEVER use partner/ nodes - they bill MiniMax credits per run."
    # This flag makes that structural instead of advisory: API nodes are not even loaded,
    # so a paid call cannot be queued by accident. Remove the flag only if Sean explicitly
    # decides to use hosted partner nodes.
    '--disable-api-nodes',
    '--log-stdout'
)

if (-not (Test-Path -LiteralPath $candidatePython)) {
    throw "Candidate Python is missing: $candidatePython"
}

Set-Location -LiteralPath $candidateRoot
& $candidatePython @candidateArgs
exit $LASTEXITCODE
