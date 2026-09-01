# Check-CharacterLora.ps1 -- A/B rig: prove a character LoRA is good BEFORE it poisons renders.
#
#   .\Check-CharacterLora.ps1 -Lora my_character.safetensors          plan only
#   .\Check-CharacterLora.ps1 -Lora my_character.safetensors -Go      render the grid
#
# WHY. A bad character LoRA fails quietly: the face drifts, or the prompt stops being obeyed, and
# you only notice 100 renders later. This renders a fixed grid -- for each test prompt: a CONTROL
# (no LoRA) plus the LoRA at 0.6 / 0.8 / 1.0 -- all on FIXED seeds, so every difference in the
# grid is caused by the LoRA and its strength, nothing else.
#
# ACCEPT when: the SAME face appears across all prompts AND each prompt is still obeyed
# (outfit/scene/lighting change on request). REJECT when the face drifts between prompts, or
# every image ignores the prompt and looks like a training photo.
#
# Also checks the LoRA file's tensor keys first: if the trainer emitted TEXT-ENCODER keys,
# LoraLoaderModelOnly silently DROPS them -- the workflow would need the full LoraLoader
# (model + clip) instead, or the LoRA appears weaker than it is.
#
# Images land in <output>\swan\lora_ab\   Server must be running.

param(
    [string]$Lora = '',
    [string[]]$Prompts = @(
        'Portrait, dark studio, dramatic rim light, photorealistic, 50mm',
        'Walking through a sunlit alpine public park, candid, photorealistic',
        'Seated at a cafe window at blue hour, warm interior light, photorealistic'
    ),
    [double[]]$Strengths = @(0.6, 0.8, 1.0),
    [int]$Seed = 7000,
    [switch]$Go
)

$ErrorActionPreference = 'Stop'
$url = 'http://127.0.0.1:8189'
$loraDir = 'Z:\AI-Weights\ComfyUI\loras'

if (-not $Lora) {
    Write-Host ''
    Write-Host "  -Lora <file> is required. Files available in ${loraDir}:"
    if (Test-Path -LiteralPath $loraDir) { Get-ChildItem -LiteralPath $loraDir -File | ForEach-Object { Write-Host ("    {0}" -f $_.Name) } }
    Write-Host ''
    exit 1
}
$loraPath = Join-Path $loraDir $Lora
if (-not (Test-Path -LiteralPath $loraPath)) { throw "LoRA not found: $loraPath" }

try { $null = Invoke-RestMethod -Uri "$url/system_stats" -TimeoutSec 5 } catch {
    Write-Host "  Server not answering on $url -- double-click 'Swan Local Video 5090.cmd' first."
    exit 1
}

# --- Key inspection: does this LoRA carry text-encoder weights? ---------------------------------
$py = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '.venv\Scripts\python.exe'
$keyCheck = & $py -c @"
import json, sys
from safetensors import safe_open
te = 0; total = 0
with safe_open(r'$loraPath', framework='pt') as f:
    for k in f.keys():
        total += 1
        if any(t in k for t in ('text_encoder', 'lora_te', 'te_', 'text_model')): te += 1
print(json.dumps({'total': total, 'te': te}))
"@
$keys = $keyCheck | ConvertFrom-Json
Write-Host ''
Write-Host ("  lora     {0}  ({1} tensors, {2} text-encoder tensors)" -f $Lora, $keys.total, $keys.te)
if ($keys.te -gt 0) {
    Write-Host '  WARNING: this LoRA carries TEXT-ENCODER weights. LoraLoaderModelOnly (used here'
    Write-Host '  and in workflow 04) silently drops them -- results will look weaker than the'
    Write-Host '  training. Use the full LoraLoader node (model + clip inputs) in the workflow.'
}
Write-Host ("  grid     {0} prompts x (control + {1} strengths) = {2} renders, fixed seeds {3}.." -f $Prompts.Count, $Strengths.Count, ($Prompts.Count * (1 + $Strengths.Count)), $Seed)
Write-Host '  output   swan/lora_ab/'
Write-Host ''

if (-not $Go) {
    Write-Host '  PLAN ONLY -- nothing queued. Re-run with -Go to render the grid.'
    Write-Host ''
    exit 0
}

function Queue-Render([string]$PromptText, [int]$RenderSeed, [double]$Strength, [string]$Prefix) {
    $graph = [ordered]@{
        '1' = @{ class_type='UNETLoader';          inputs=@{ unet_name='krea2_turbo_fp8_scaled.safetensors'; weight_dtype='default' } }
        '2' = @{ class_type='CLIPLoader';          inputs=@{ clip_name='qwen3vl_4b_fp8_scaled.safetensors'; type='krea2'; device='default' } }
        '3' = @{ class_type='VAELoader';           inputs=@{ vae_name='qwen_image_vae.safetensors' } }
        '5' = @{ class_type='CLIPTextEncode';      inputs=@{ text=$PromptText; clip=@('2', 0) } }
        '6' = @{ class_type='ConditioningZeroOut'; inputs=@{ conditioning=@('5', 0) } }
        '7' = @{ class_type='EmptyLatentImage';    inputs=@{ width=1280; height=704; batch_size=1 } }
        '9' = @{ class_type='VAEDecode';           inputs=@{ samples=@('8', 0); vae=@('3', 0) } }
        '10'= @{ class_type='SaveImage';           inputs=@{ images=@('9', 0); filename_prefix=$Prefix } }
    }
    $modelRef = @('1', 0)
    if ($Strength -gt 0) {
        $graph['4'] = @{ class_type='LoraLoaderModelOnly'; inputs=@{ lora_name=$Lora; strength_model=$Strength; model=@('1', 0) } }
        $modelRef = @('4', 0)
    }
    $graph['8'] = @{ class_type='KSampler'; inputs=@{
        model=$modelRef; positive=@('5', 0); negative=@('6', 0); latent_image=@('7', 0)
        seed=$RenderSeed; steps=8; cfg=1.0; sampler_name='euler'; scheduler='simple'; denoise=1.0 } }
    $body = @{ prompt = $graph } | ConvertTo-Json -Depth 8
    $r = Invoke-RestMethod -Uri "$url/prompt" -Method Post -Body $body -ContentType 'application/json'
    if (-not $r.prompt_id) { throw "queue failed: $Prefix" }
}

$loraTag = [System.IO.Path]::GetFileNameWithoutExtension($Lora)
$n = 0
for ($p = 0; $p -lt $Prompts.Count; $p++) {
    $s = $Seed + $p
    Queue-Render $Prompts[$p] $s 0.0 ("swan/lora_ab/{0}/p{1}_control" -f $loraTag, $p); $n++
    foreach ($st in $Strengths) {
        Queue-Render $Prompts[$p] $s $st ("swan/lora_ab/{0}/p{1}_s{2}" -f $loraTag, $p, $st); $n++
    }
}
Write-Host ("  queued {0} renders. Compare each p<N>_control against p<N>_s0.6/0.8/1.0:" -f $n)
Write-Host '    same face across ALL prompts + prompt still obeyed = ACCEPT (note the best strength)'
Write-Host '    face drifts, or every image ignores its prompt      = REJECT (retrain / adjust)'
Write-Host ''
exit 0
