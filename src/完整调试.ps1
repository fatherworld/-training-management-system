Write-Host "🔧 培训管理系统 - 完整调试脚本" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# 停止所有node进程
Write-Host "🛑 停止现有进程..." -ForegroundColor Yellow
taskkill /F /IM node.exe 2>$null

# 删除数据库文件强制重建
Write-Host "🗄️ 重建数据库..." -ForegroundColor Yellow
Remove-Item "training_management.db" -ErrorAction SilentlyContinue

# 启动后端
Write-Host "🚀 启动后端..." -ForegroundColor Yellow
$backend = Start-Process -FilePath "node" -ArgumentList "server.js" -PassThru -NoNewWindow
Start-Sleep 5

# 测试后端基础连接
Write-Host "🧪 测试后端连接..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000" -UseBasicParsing -TimeoutSec 5
    Write-Host "   ✅ 后端连接成功 (状态码: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ❌ 后端连接失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 测试登录
Write-Host "🔐 测试登录..." -ForegroundColor Yellow
try {
    $loginBody = '{"username":"admin","password":"admin123"}'
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 5
    Write-Host "   ✅ 登录成功" -ForegroundColor Green
    
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.token
    Write-Host "   📝 Token: $($token.Substring(0,20))..." -ForegroundColor Gray
    
    $headers = @{"Authorization" = "Bearer $token"}
    
    # 测试各个API端点
    $apis = @(
        @{name="学员管理"; url="http://localhost:5000/api/students"},
        @{name="教师管理"; url="http://localhost:5000/api/teachers"},
        @{name="课程管理"; url="http://localhost:5000/api/courses"},
        @{name="班级管理"; url="http://localhost:5000/api/classes"},
        @{name="试听管理"; url="http://localhost:5000/api/trials"},
        @{name="课程安排"; url="http://localhost:5000/api/sessions"},
        @{name="课后点评"; url="http://localhost:5000/api/evaluations"},
        @{name="通知管理"; url="http://localhost:5000/api/notifications"},
        @{name="仪表板数据"; url="http://localhost:5000/api/analytics/dashboard"}
    )
    
    Write-Host "🧪 测试所有API端点..." -ForegroundColor Yellow
    foreach ($api in $apis) {
        try {
            $response = Invoke-WebRequest -Uri $api.url -Headers $headers -UseBasicParsing -TimeoutSec 5
            Write-Host "   ✅ $($api.name): 成功 (状态码: $($response.StatusCode))" -ForegroundColor Green
        } catch {
            $errorMsg = $_.Exception.Message
            if ($_.Exception.Response) {
                $statusCode = $_.Exception.Response.StatusCode.value__
                Write-Host "   ❌ $($api.name): 失败 (状态码: $statusCode) - $errorMsg" -ForegroundColor Red
            } else {
                Write-Host "   ❌ $($api.name): 失败 - $errorMsg" -ForegroundColor Red
            }
        }
    }
    
} catch {
    Write-Host "   ❌ 登录失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 调试完成！" -ForegroundColor Cyan
Write-Host "后端进程ID: $($backend.Id)" -ForegroundColor Gray
Write-Host "如需停止后端，运行: taskkill /F /PID $($backend.Id)" -ForegroundColor Gray



