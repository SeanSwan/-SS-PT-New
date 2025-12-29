$token = (Get-Content token.txt -Raw).Trim()

$headers = @{
    "Authorization" = "Bearer $token"
}

Write-Host "Testing GET /api/client-trainer-assignments..."
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:10000/api/client-trainer-assignments" -Method Get -Headers $headers
    Write-Host "SUCCESS! Retrieved assignments:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "FAILED! Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
