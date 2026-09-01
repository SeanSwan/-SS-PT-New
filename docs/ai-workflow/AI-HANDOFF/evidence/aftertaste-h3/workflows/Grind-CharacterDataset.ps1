# Grind-CharacterDataset.ps1 -- overnight candidate factory for the character (avatar) image set.
#
#   .\Grind-CharacterDataset.ps1 -Prompt "..."            plan only: shows what would be queued
#   .\Grind-CharacterDataset.ps1 -Prompt "..." -Go        queue the sweep for real
#
# WHY. Step 1 of the avatar pipeline is "curate 15-30 images of ONE face". Doing that by hand is
# 30 manual Runs in the ComfyUI browser. This queues N renders of the SAME prompt across a seed
# sweep in one shot; curation then starts from a folder full of candidates instead of a blank page.
# Method note: hold the prompt STILL and let only the seed vary -- a difference between two images
# is then caused by the seed, so picking a face is a fair comparison (same discipline as the H3
# Note's CRAFT-clause rule).
#
# Images land in <output>\swan\dataset_raw\  (Z:\SwanStudios-Video\output\swan\dataset_raw).
# Uses the same proven Krea 2 graph as workflow 04: 8 steps / cfg 1.0 / euler / simple.
# The server must be running (double-click 'Swan Local Video 5090.cmd' first).

param(
    [string]$Prompt = '',
    [int]$Count = 24,
    [int]$Width = 1280,
    [int]$Height = 704,
    [int]$StartSeed = 1000,
    [string]$Lora = '',
    [double]$LoraStrength = 0.8,
    [switch]$Go
)

$ErrorActionPreference = 'Stop'
$url = 'http://127.0.0.1:8189'

if (-not $Prompt) {
    Write-Host ''
    Write-Host '  A held-still prompt is required. Example:'
    Write-Host '    .\Grind-CharacterDataset.ps1 -Prompt "Portrait of a 32-year-old Black woman, short natural curls, warm brown skin, charcoal jacket, dark studio, dramatic rim light, photorealistic, 50mm" -Go'
    Write-Host ''
    Write-Host '  Describe ONE person precisely and keep the wording identical across sweeps;'
    Write-Host '  only the seed varies. Pick keepers, delete the rest, aim for 15-30 of one face.'
    Write-Host ''
    exit 1
}

try { $null = Invoke-RestMethod -Uri "$url/system_stats" -TimeoutSec 5 } catch {
    Write-Host "  Server not answering on $url -- double-click 'Swan Local Video 5090.cmd' first."
    exit 1
}

# Width/height must land on the latent stride (multiple of 32, maybe 64 -- 1280x704 is proven).
if ($Width % 32 -ne 0 -or $Height % 32 -ne 0) { throw "Width/Height must be multiples of 32 (got ${Width}x${Height})." }

Write-Host ''
Write-Host ("  prompt   {0}" -f $Prompt)
Write-Host ("  sweep    {0} seeds, {1} .. {2}" -f $Count, $StartSeed, ($StartSeed + $Count - 1))
Write-Host ("  size     {0}x{1}   output  swan/dataset_raw/" -f $Width, $Height)
if ($Lora) { Write-Host ("  lora     {0} @ {1}" -f $Lora, $LoraStrength) }
Write-Host ''

if (-not $Go) {
    Write-Host '  PLAN ONLY -- nothing queued. Re-run with -Go to queue the sweep.'
    Write-Host ''
    exit 0
}

$queued = 0
for ($i = 0; $i -lt $Count; $i++) {
    $seed = $StartSeed + $i
    $graph = [ordered]@{
        '1' = @{ class_type='UNETLoader';         inputs=@{ unet_name='krea2_turbo_fp8_scaled.safetensors'; weight_dtype='default' } }
        '2' = @{ class_type='CLIPLoader';         inputs=@{ clip_name='qwen3vl_4b_fp8_scaled.safetensors'; type='krea2'; device='default' } }
        '3' = @{ class_type='VAELoader';          inputs=@{ vae_name='qwen_image_vae.safetensors' } }
        '5' = @{ class_type='CLIPTextEncode';     inputs=@{ text=$Prompt; clip=@('2', 0) } }
        '6' = @{ class_type='ConditioningZeroOut';inputs=@{ conditioning=@('5', 0) } }
        '7' = @{ class_type='EmptyLatentImage';   inputs=@{ width=$Width; height=$Height; batch_size=1 } }
        '9' = @{ class_type='VAEDecode';          inputs=@{ samples=@('8', 0); vae=@('3', 0) } }
        '10'= @{ class_type='SaveImage';          inputs=@{ images=@('9', 0); filename_prefix='swan/dataset_raw/candidate' } }
    }
    $modelRef = @('1', 0)
    if ($Lora) {
        $graph['4'] = @{ class_type='LoraLoaderModelOnly'; inputs=@{ lora_name=$Lora; strength_model=$LoraStrength; model=@('1', 0) } }
        $modelRef = @('4', 0)
    }
    $graph['8'] = @{ class_type='KSampler'; inputs=@{
        model=$modelRef; positive=@('5', 0); negative=@('6', 0); latent_image=@('7', 0)
        seed=$seed; steps=8; cfg=1.0; sampler_name='euler'; scheduler='simple'; denoise=1.0 } }

    $body = @{ prompt = $graph } | ConvertTo-Json -Depth 8
    $r = Invoke-RestMethod -Uri "$url/prompt" -Method Post -Body $body -ContentType 'application/json'
    if (-not $r.prompt_id) { throw "queue failed at seed $seed" }
    $queued++
}

Write-Host ("  queued {0} renders (~10s each after first model load)." -f $queued)
Write-Host '  Watch progress in the browser queue, or just come back later:'
Write-Host '    Z:\SwanStudios-Video\output\swan\dataset_raw\'
Write-Host '  Then: keep 15-30 of the SAME face, delete the rest. That folder becomes the LoRA dataset.'
Write-Host ''
exit 0
