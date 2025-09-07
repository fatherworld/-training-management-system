Write-Host "🎓 培训管理系统 - 启动脚本" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# 获取脚本所在目录
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition

# 设置工作目录
Set-Location $scriptPath

Write-Host "📍 当前目录: $scriptPath" -ForegroundColor Green
Write-Host ""

# 检查依赖
Write-Host "🔍 检查依赖..." -ForegroundColor Yellow
if (!(Test-Path "node_modules")) {
    Write-Host "⚠️  后端依赖缺失，正在安装..." -ForegroundColor Red
    npm install
}

if (!(Test-Path "client/node_modules")) {
    Write-Host "⚠️  前端依赖缺失，正在安装..." -ForegroundColor Red
    Set-Location "client"
    npm install
    Set-Location ".."
}

Write-Host "✅ 依赖检查完成" -ForegroundColor Green
Write-Host ""

# 启动后端
Write-Host "🚀 启动后端服务器..." -ForegroundColor Yellow
$backend = Start-Process -FilePath "node" -ArgumentList "server.js" -PassThru -WindowStyle Normal

Start-Sleep 3

# 启动前端  
Write-Host "🌐 启动前端服务器..." -ForegroundColor Yellow
Set-Location "client"
$frontend = Start-Process -FilePath "npm" -ArgumentList "start" -PassThru -WindowStyle Normal
Set-Location ".."

Start-Sleep 5

Write-Host ""
Write-Host "🎉 系统启动完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📋 访问地址:" -ForegroundColor Cyan
Write-Host "  🌐 前端界面: http://localhost:3000" -ForegroundColor White
Write-Host "  🔌 后端API: http://localhost:5000" -ForegroundColor White
Write-Host ""
Write-Host "👤 默认登录账户:" -ForegroundColor Cyan
Write-Host "  用户名: admin" -ForegroundColor White
Write-Host "  密码: admin123" -ForegroundColor White
Write-Host ""
Write-Host "💡 提示: 按 Ctrl+C 停止此脚本，然后手动关闭服务器窗口" -ForegroundColor Yellow
Write-Host ""

# 等待用户输入停止
Write-Host "按任意键停止服务器..." -ForegroundColor Red
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# 停止服务
Write-Host "🛑 正在停止服务器..." -ForegroundColor Red
try {
    Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue
    # 也尝试停止所有node进程
    Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}
catch {
    Write-Host "⚠️  停止服务时出现错误，请手动关闭服务器窗口" -ForegroundColor Yellow
}

Write-Host "✅ 服务器已停止" -ForegroundColor Green



