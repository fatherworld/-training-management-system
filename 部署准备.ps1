# 培训管理系统 - 部署准备脚本

Write-Host "🚀 培训管理系统 - 部署准备" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

# 检查Node.js
Write-Host "📋 检查环境..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 请先安装Node.js: https://nodejs.org" -ForegroundColor Red
    exit 1
}

# 检查npm
try {
    $npmVersion = npm --version
    Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm未安装" -ForegroundColor Red
    exit 1
}

# 检查Git
try {
    $gitVersion = git --version
    Write-Host "✅ Git: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 请先安装Git: https://git-scm.com" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 安装依赖
Write-Host "📦 安装依赖..." -ForegroundColor Yellow

Write-Host "安装后端依赖..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 后端依赖安装失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 后端依赖安装完成" -ForegroundColor Green

Write-Host "安装前端依赖..." -ForegroundColor Cyan
Set-Location "src/client"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 前端依赖安装失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 前端依赖安装完成" -ForegroundColor Green

# 构建前端
Write-Host "🔨 构建前端..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 前端构建失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 前端构建完成" -ForegroundColor Green

Set-Location "../.."

Write-Host ""
Write-Host "✨ 部署准备完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📝 下一步部署流程：" -ForegroundColor Yellow
Write-Host ""
Write-Host "1️⃣  后端部署到Railway：" -ForegroundColor Cyan
Write-Host "   • 访问 https://railway.app" -ForegroundColor White
Write-Host "   • 使用GitHub登录" -ForegroundColor White
Write-Host "   • 选择 'Deploy from GitHub repo'" -ForegroundColor White
Write-Host "   • 选择这个项目仓库" -ForegroundColor White
Write-Host ""
Write-Host "2️⃣  前端部署到Netlify：" -ForegroundColor Cyan
Write-Host "   • 访问 https://netlify.com" -ForegroundColor White
Write-Host "   • 使用GitHub登录" -ForegroundColor White
Write-Host "   • 选择 'New site from Git'" -ForegroundColor White
Write-Host "   • 基础目录设置为: src/client" -ForegroundColor White
Write-Host ""
Write-Host "3️⃣  配置环境变量：" -ForegroundColor Cyan
Write-Host "   • 获取Railway分配的URL" -ForegroundColor White
Write-Host "   • 更新 src/client/env.production 文件" -ForegroundColor White
Write-Host "   • 重新部署Netlify" -ForegroundColor White
Write-Host ""
Write-Host "📖 详细说明请查看《部署指南.md》" -ForegroundColor Yellow
Write-Host ""
Write-Host "🎯 部署完成后访问Netlify提供的URL即可使用系统！" -ForegroundColor Green

Write-Host ""
Write-Host "按任意键退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

