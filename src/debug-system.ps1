Write-Host "Training Management System - Debug Script" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Stop all node processes
Write-Host "Stopping existing processes..." -ForegroundColor Yellow
taskkill /F /IM node.exe 2>$null

# Remove database to force rebuild
Write-Host "Rebuilding database..." -ForegroundColor Yellow
Remove-Item "training_management.db" -ErrorAction SilentlyContinue

# Start backend
Write-Host "Starting backend..." -ForegroundColor Yellow
$backend = Start-Process -FilePath "node" -ArgumentList "server.js" -PassThru -NoNewWindow
Start-Sleep 5

# Test backend connection
Write-Host "Testing backend connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000" -UseBasicParsing -TimeoutSec 5
    Write-Host "   Backend OK (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   Backend FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test login
Write-Host "Testing login..." -ForegroundColor Yellow
try {
    $loginBody = '{"username":"admin","password":"admin123"}'
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 5
    Write-Host "   Login OK" -ForegroundColor Green
    
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.token
    Write-Host "   Token: $($token.Substring(0,20))..." -ForegroundColor Gray
    
    $headers = @{"Authorization" = "Bearer $token"}
    
    # Test API endpoints
    $endpoints = @(
        "students",
        "teachers", 
        "courses",
        "classes",
        "trials",
        "sessions",
        "evaluations",
        "notifications"
    )
    
    Write-Host "Testing API endpoints..." -ForegroundColor Yellow
    foreach ($endpoint in $endpoints) {
        try {
            $url = "http://localhost:5000/api/$endpoint"
            $response = Invoke-WebRequest -Uri $url -Headers $headers -UseBasicParsing -TimeoutSec 5
            Write-Host "   $endpoint API: OK (Status: $($response.StatusCode))" -ForegroundColor Green
        } catch {
            $errorMsg = $_.Exception.Message
            if ($_.Exception.Response) {
                $statusCode = $_.Exception.Response.StatusCode.value__
                Write-Host "   $endpoint API: FAILED (Status: $statusCode) - $errorMsg" -ForegroundColor Red
            } else {
                Write-Host "   $endpoint API: FAILED - $errorMsg" -ForegroundColor Red
            }
        }
    }
    
} catch {
    Write-Host "   Login FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Debug complete!" -ForegroundColor Cyan
Write-Host "Backend PID: $($backend.Id)" -ForegroundColor Gray



