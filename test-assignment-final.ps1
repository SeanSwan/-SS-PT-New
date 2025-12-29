$token = (Get-Content token.txt -Raw).Trim()

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$body = @{
    clientId = 3
    trainerId = 2
    status = "active"
    notes = "Test assignment - Client 3 assigned to Trainer 2 (POST verification)"
} | ConvertTo-Json

Write-Host "Testing POST /api/client-trainer-assignments..."
Write-Host "Body: $body"
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:10000/api/client-trainer-assignments" -Method Post -Headers $headers -Body $body
    Write-Host "SUCCESS! Assignment created:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "FAILED! Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host $_.ErrorDetails.Message
}
