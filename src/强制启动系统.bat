@echo off
chcp 65001 >nul
echo 🎓 培训管理系统 - 强制启动脚本
echo =====================================
echo.

cd /d "%~dp0"

echo 📍 当前目录: %CD%
echo.

echo 🛑 强制停止所有相关进程...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM npm.exe >nul 2>&1
echo    ✅ 进程清理完成

echo.
echo 📦 检查并安装依赖...
if not exist "node_modules" (
    echo    正在安装后端依赖...
    npm install
)

if not exist "client\node_modules" (
    echo    正在安装前端依赖...
    cd client
    npm install
    cd ..
)

echo    ✅ 依赖检查完成

echo.
echo 🚀 启动后端服务器...
start "后端服务器" cmd /k "echo 启动后端... && node server.js"

echo ⏳ 等待后端启动完成...
ping 127.0.0.1 -n 6 >nul

echo.
echo 🌐 启动前端服务器...
cd client
start "前端服务器" cmd /k "echo 启动前端... && set BROWSER=none && npm start"
cd ..

echo ⏳ 等待前端启动完成...
ping 127.0.0.1 -n 15 >nul

echo.
echo 🧪 测试系统连接...

:test_backend
echo 测试后端连接...
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:5000' -UseBasicParsing -TimeoutSec 5; Write-Host '   ✅ 后端连接成功 (状态码:' $r.StatusCode ')' -ForegroundColor Green; exit 0 } catch { Write-Host '   ⏳ 后端启动中...' -ForegroundColor Yellow; exit 1 }"
if errorlevel 1 (
    ping 127.0.0.1 -n 3 >nul
    goto test_backend
)

:test_frontend
echo 测试前端连接...
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 5; Write-Host '   ✅ 前端连接成功 (状态码:' $r.StatusCode ')' -ForegroundColor Green; exit 0 } catch { Write-Host '   ⏳ 前端启动中...' -ForegroundColor Yellow; exit 1 }"
if errorlevel 1 (
    ping 127.0.0.1 -n 3 >nul
    goto test_frontend
)

echo.
echo 🎉 系统启动成功！
echo.
echo 📋 访问信息:
echo    前端界面: http://localhost:3000
echo    后端API:  http://localhost:5000
echo.
echo 👤 登录账户:
echo    用户名: admin
echo    密码: admin123
echo.
echo 💡 提示: 两个服务器窗口会保持运行状态
echo          如需停止，请关闭对应的命令窗口
echo.

echo 🌐 自动打开浏览器...
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo.
echo ✅ 启动完成！请在浏览器中使用系统
echo.
pause



