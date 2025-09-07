Write-Host "🧪 培训管理系统 - 功能测试脚本" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:5000/api"
$frontendUrl = "http://localhost:3000"

# 测试结果
$testResults = @()

function Test-API {
    param($name, $url, $method = "GET", $body = $null, $headers = @{})
    
    try {
        Write-Host "🔍 测试: $name" -ForegroundColor Yellow
        
        $params = @{
            Uri = $url
            Method = $method
            UseBasicParsing = $true
        }
        
        if ($body) {
            $params.Body = $body
            $params.ContentType = "application/json"
        }
        
        if ($headers.Count -gt 0) {
            $params.Headers = $headers
        }
        
        $response = Invoke-WebRequest @params
        
        if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 201) {
            Write-Host "  ✅ 成功 (状态码: $($response.StatusCode))" -ForegroundColor Green
            $script:testResults += @{Name=$name; Status="✅ 通过"; Details="状态码: $($response.StatusCode)"}
            return $response
        } else {
            Write-Host "  ❌ 失败 (状态码: $($response.StatusCode))" -ForegroundColor Red
            $script:testResults += @{Name=$name; Status="❌ 失败"; Details="状态码: $($response.StatusCode)"}
        }
    }
    catch {
        Write-Host "  ❌ 错误: $($_.Exception.Message)" -ForegroundColor Red
        $script:testResults += @{Name=$name; Status="❌ 错误"; Details=$_.Exception.Message}
    }
    
    return $null
}

Write-Host "🌐 1. 测试前后端连接性" -ForegroundColor Magenta
Write-Host "-----------------------------------"

# 测试前端
Test-API "前端页面访问" $frontendUrl

# 测试后端根路径
Test-API "后端API服务器" "$baseUrl/../"

Write-Host ""
Write-Host "🔑 2. 测试用户认证功能" -ForegroundColor Magenta
Write-Host "-----------------------------------"

# 测试登录
$loginBody = '{"username":"admin","password":"admin123"}'
$loginResponse = Test-API "管理员登录" "$baseUrl/auth/login" "POST" $loginBody

$token = $null
if ($loginResponse) {
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.token
    Write-Host "  📝 获取到Token: $($token.Substring(0,20))..." -ForegroundColor Gray
}

# 设置认证头
$authHeaders = @{}
if ($token) {
    $authHeaders["Authorization"] = "Bearer $token"
}

Write-Host ""
Write-Host "👥 3. 测试学员管理功能" -ForegroundColor Magenta
Write-Host "-----------------------------------"

# 测试获取学员列表
Test-API "获取学员列表" "$baseUrl/students" "GET" $null $authHeaders

# 测试创建学员
$studentBody = '{"name":"测试学员","phone":"13800138001","email":"test@example.com","age":25}'
Test-API "创建学员" "$baseUrl/students" "POST" $studentBody $authHeaders

Write-Host ""
Write-Host "👨‍🏫 4. 测试教师管理功能" -ForegroundColor Magenta
Write-Host "-----------------------------------"

# 测试获取教师列表
Test-API "获取教师列表" "$baseUrl/teachers" "GET" $null $authHeaders

# 测试创建教师
$teacherBody = '{"name":"测试教师","phone":"13800138002","email":"teacher@example.com","specialties":"JavaScript,React","hourly_rate":200}'
Test-API "创建教师" "$baseUrl/teachers" "POST" $teacherBody $authHeaders

Write-Host ""
Write-Host "📚 5. 测试课程管理功能" -ForegroundColor Magenta
Write-Host "-----------------------------------"

# 测试获取课程列表
Test-API "获取课程列表" "$baseUrl/courses" "GET" $null $authHeaders

# 测试创建课程
$courseBody = '{"name":"JavaScript基础","description":"学习JavaScript编程基础","duration":40,"price":2000,"max_students":20}'
Test-API "创建课程" "$baseUrl/courses" "POST" $courseBody $authHeaders

Write-Host ""
Write-Host "🏫 6. 测试班级管理功能" -ForegroundColor Magenta
Write-Host "-----------------------------------"

# 测试获取班级列表
Test-API "获取班级列表" "$baseUrl/classes" "GET" $null $authHeaders

Write-Host ""
Write-Host "🎧 7. 测试试听管理功能" -ForegroundColor Magenta
Write-Host "-----------------------------------"

# 测试获取试听记录
Test-API "获取试听记录" "$baseUrl/trials" "GET" $null $authHeaders

Write-Host ""
Write-Host "📅 8. 测试课程安排功能" -ForegroundColor Magenta
Write-Host "-----------------------------------"

# 测试获取课程安排
Test-API "获取课程安排" "$baseUrl/sessions" "GET" $null $authHeaders

Write-Host ""
Write-Host "⭐ 9. 测试课后点评功能" -ForegroundColor Magenta
Write-Host "-----------------------------------"

# 测试获取点评记录
Test-API "获取点评记录" "$baseUrl/evaluations" "GET" $null $authHeaders

Write-Host ""
Write-Host "🔔 10. 测试通知管理功能" -ForegroundColor Magenta
Write-Host "-----------------------------------"

# 测试获取通知记录
Test-API "获取通知记录" "$baseUrl/notifications" "GET" $null $authHeaders

Write-Host ""
Write-Host "📊 11. 测试数据分析功能" -ForegroundColor Magenta
Write-Host "-----------------------------------"

# 测试获取仪表板数据
Test-API "获取仪表板数据" "$baseUrl/analytics/dashboard" "GET" $null $authHeaders

# 测试获取学员分析数据
Test-API "获取学员分析数据" "$baseUrl/analytics/students" "GET" $null $authHeaders

Write-Host ""
Write-Host "📋 测试结果汇总" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

$passCount = ($testResults | Where-Object {$_.Status -like "*通过*"}).Count
$failCount = ($testResults | Where-Object {$_.Status -like "*失败*" -or $_.Status -like "*错误*"}).Count
$totalCount = $testResults.Count

foreach ($result in $testResults) {
    Write-Host "  $($result.Status) $($result.Name)" -ForegroundColor White
}

Write-Host ""
Write-Host "📊 统计:" -ForegroundColor Cyan
Write-Host "  总测试数: $totalCount" -ForegroundColor White
Write-Host "  通过: $passCount" -ForegroundColor Green
Write-Host "  失败: $failCount" -ForegroundColor Red
Write-Host "  成功率: $([math]::Round($passCount/$totalCount*100,1))%" -ForegroundColor Yellow

if ($failCount -eq 0) {
    Write-Host ""
    Write-Host "🎉 所有功能测试通过！系统运行正常！" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠️  有 $failCount 个测试失败，需要检查相关功能" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "💡 接下来您可以:" -ForegroundColor Cyan
Write-Host "  1. 打开浏览器访问 http://localhost:3000" -ForegroundColor White
Write-Host "  2. 使用账户 admin/admin123 登录" -ForegroundColor White
Write-Host "  3. 测试各个功能模块的界面操作" -ForegroundColor White



