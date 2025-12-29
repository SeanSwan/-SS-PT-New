$token = Get-Content token.txt -Raw
$token = $token.Trim()

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$body = @{
    clientId = 3
    trainerId = 2
    status = "active"
    notes = "Test assignment - Client 3 assigned to Trainer 2"
} | ConvertTo-Json

Write-Host "Creating assignment..."
$response = Invoke-RestMethod -Uri "http://localhost:10000/api/client-trainer-assignments" -Method Post -Headers $headers -Body $body
$response | ConvertTo-Json
