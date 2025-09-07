Write-Host "Testing Students API..." -ForegroundColor Cyan

# 先测试登录
try {
    $loginBody = '{"username":"admin","password":"admin123"}'
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
    Write-Host "Login: Success" -ForegroundColor Green
    
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.token
    Write-Host "Token: $($token.Substring(0,20))..." -ForegroundColor Yellow
    
    # 测试学员API
    $headers = @{"Authorization" = "Bearer $token"}
    $studentsResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/students" -Headers $headers -UseBasicParsing
    Write-Host "Students API: Success (Status: $($studentsResponse.StatusCode))" -ForegroundColor Green
    Write-Host "Response: $($studentsResponse.Content)" -ForegroundColor Gray
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error Body: $errorBody" -ForegroundColor Red
    }
}



