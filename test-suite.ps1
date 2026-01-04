# SwanStudios PT Platform - Comprehensive Testing Suite
# This script tests all major endpoints and functionality

Write-Host "🧪 Starting SwanStudios PT Platform Testing Suite" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:10000"
$testResults = @()

function Test-Endpoint {
    param(
        [string]$name,
        [string]$url,
        [string]$method = "GET",
        [hashtable]$headers = @{},
        [string]$body = $null,
        [int]$expectedStatus = 200
    )

    try {
        Write-Host "Testing $name..." -ForegroundColor Yellow

        $params = @{
            Uri = $url
            Method = $method
            Headers = $headers
            UseBasicParsing = $true
        }

        if ($body) {
            $params.Body = $body
            $params.ContentType = "application/json"
        }

        $response = Invoke-WebRequest @params
        $status = $response.StatusCode

        if ($status -eq $expectedStatus) {
            Write-Host "✅ $name - PASSED ($status)" -ForegroundColor Green
            $testResults += @{Name=$name; Status="PASSED"; Code=$status; Error=$null}
        } else {
            Write-Host "⚠️  $name - UNEXPECTED STATUS ($status, expected $expectedStatus)" -ForegroundColor Yellow
            $testResults += @{Name=$name; Status="UNEXPECTED"; Code=$status; Error="Expected $expectedStatus"}
        }
    }
    catch {
        Write-Host "❌ $name - FAILED ($($_.Exception.Message))" -ForegroundColor Red
        $testResults += @{Name=$name; Status="FAILED"; Code=$null; Error=$_.Exception.Message}
    }
}

# Wait for server to start
Write-Host "Waiting for server to start..." -ForegroundColor Gray
Start-Sleep -Seconds 8

# Test 1: Health Check
Test-Endpoint -name "Health Check" -url "$baseUrl/health"

# Test 2: Available Sessions (Public)
Test-Endpoint -name "Available Sessions" -url "$baseUrl/api/sessions/available"

# Test 3: Storefront Items
Test-Endpoint -name "Storefront Items" -url "$baseUrl/api/storefront"

# Test 4: Login Attempt (should fail without credentials)
Test-Endpoint -name "Login (No Credentials)" -url "$baseUrl/api/auth/login" -method "POST" -expectedStatus 400

# Test 5: Register Attempt (should fail with invalid data)
Test-Endpoint -name "Register (Invalid)" -url "$baseUrl/api/auth/register" -method "POST" -body '{"email":"test"}' -expectedStatus 400

# Test 6: Admin Login (using known credentials)
$adminLogin = @{
    email = "admin@swanstudios.com"
    password = "AdminPass123!"
} | ConvertTo-Json

Test-Endpoint -name "Admin Login" -url "$baseUrl/api/auth/login" -method "POST" -body $adminLogin -expectedStatus 200

# Test 7: Trainer Login
$trainerLogin = @{
    email = "trainer@swanstudios.com"
    password = "TrainerPass123!"
} | ConvertTo-Json

Test-Endpoint -name "Trainer Login" -url "$baseUrl/api/auth/login" -method "POST" -body $trainerLogin -expectedStatus 200

# Test 8: Client Login
$clientLogin = @{
    email = "client@swanstudios.com"
    password = "ClientPass123!"
} | ConvertTo-Json

Test-Endpoint -name "Client Login" -url "$baseUrl/api/auth/login" -method "POST" -body $clientLogin -expectedStatus 200

# Test 9: Invalid Login
$invalidLogin = @{
    email = "invalid@test.com"
    password = "wrongpass"
} | ConvertTo-Json

Test-Endpoint -name "Invalid Login" -url "$baseUrl/api/auth/login" -method "POST" -body $invalidLogin -expectedStatus 401

# Test 10: Contact Form
$contactData = @{
    name = "Test User"
    email = "test@example.com"
    message = "Test message"
} | ConvertTo-Json

Test-Endpoint -name "Contact Form" -url "$baseUrl/api/contact" -method "POST" -body $contactData -expectedStatus 200

# Test 11: Food Scan (should require auth)
Test-Endpoint -name "Food Scan (No Auth)" -url "$baseUrl/api/food/scan" -method "POST" -expectedStatus 401

# Test 12: Workout Plans (should require auth)
Test-Endpoint -name "Workout Plans (No Auth)" -url "$baseUrl/api/workouts/plans" -expectedStatus 401

# Test 13: Gamification Stats (should require auth)
Test-Endpoint -name "Gamification Stats (No Auth)" -url "$baseUrl/api/gamification/stats" -expectedStatus 401

# Test 14: Admin Dashboard (should require admin auth)
Test-Endpoint -name "Admin Dashboard (No Auth)" -url "$baseUrl/api/admin/dashboard" -expectedStatus 401

# Test 15: Session Booking (should require auth)
Test-Endpoint -name "Session Booking (No Auth)" -url "$baseUrl/api/sessions/book" -method "POST" -expectedStatus 401

Write-Host "`n📊 Test Results Summary" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

$passed = ($testResults | Where-Object { $_.Status -eq "PASSED" }).Count
$failed = ($testResults | Where-Object { $_.Status -eq "FAILED" }).Count
$unexpected = ($testResults | Where-Object { $_.Status -eq "UNEXPECTED" }).Count
$total = $testResults.Count

Write-Host "Total Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host "Unexpected Status: $unexpected" -ForegroundColor Yellow

$successRate = [math]::Round(($passed / $total) * 100, 1)
Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 80) { "Green" } elseif ($successRate -ge 60) { "Yellow" } else { "Red" })

Write-Host "`n🔍 Detailed Results:" -ForegroundColor Cyan
foreach ($result in $testResults) {
    $color = switch ($result.Status) {
        "PASSED" { "Green" }
        "FAILED" { "Red" }
        "UNEXPECTED" { "Yellow" }
    }
    Write-Host "$($result.Name): $($result.Status)" -ForegroundColor $color
    if ($result.Error) {
        Write-Host "   Error: $($result.Error)" -ForegroundColor Red
    }
}

Write-Host "`n🏁 Testing Suite Complete!" -ForegroundColor Cyan