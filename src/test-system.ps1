Write-Host "Testing Training Management System" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:5000/api"
$frontendUrl = "http://localhost:3000"

# Test frontend
Write-Host "1. Testing Frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $frontendUrl -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "   Frontend OK (Status: $($response.StatusCode))" -ForegroundColor Green
    }
} catch {
    Write-Host "   Frontend Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test backend
Write-Host "2. Testing Backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "   Backend OK (Status: $($response.StatusCode))" -ForegroundColor Green
    }
} catch {
    Write-Host "   Backend Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test login
Write-Host "3. Testing Login..." -ForegroundColor Yellow
try {
    $loginBody = '{"username":"admin","password":"admin123"}'
    $response = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "   Login OK (Status: $($response.StatusCode))" -ForegroundColor Green
        $loginData = $response.Content | ConvertFrom-Json
        $token = $loginData.token
        
        # Test authenticated request
        Write-Host "4. Testing Authenticated API..." -ForegroundColor Yellow
        $headers = @{"Authorization" = "Bearer $token"}
        $studentsResponse = Invoke-WebRequest -Uri "$baseUrl/students" -Headers $headers -UseBasicParsing
        if ($studentsResponse.StatusCode -eq 200) {
            Write-Host "   Students API OK (Status: $($studentsResponse.StatusCode))" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "   Login Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "System is ready!" -ForegroundColor Green
Write-Host "Open browser and go to: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Login: admin / admin123" -ForegroundColor Cyan
