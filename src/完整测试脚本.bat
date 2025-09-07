@echo off
echo 🎓 培训管理系统 - 完整启动和测试
echo =====================================
echo.

cd /d "%~dp0"

echo 📍 当前目录: %CD%
echo.

echo 🛑 停止现有服务...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo 🚀 启动后端服务器...
start "后端服务器" cmd /k "node server.js"

echo ⏳ 等待后端启动...
timeout /t 5 /nobreak >nul

echo.
echo 🌐 启动前端服务器...
cd client
start "前端服务器" cmd /k "npm start"
cd ..

echo ⏳ 等待前端启动...
timeout /t 10 /nobreak >nul

echo.
echo 🧪 开始系统测试...
echo.

echo 测试1: 后端API连接
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:5000' -UseBasicParsing; Write-Host '   ✅ 后端正常 (状态码:' $r.StatusCode ')' -ForegroundColor Green } catch { Write-Host '   ❌ 后端连接失败' -ForegroundColor Red }"

echo.
echo 测试2: 前端页面连接
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing; Write-Host '   ✅ 前端正常 (状态码:' $r.StatusCode ')' -ForegroundColor Green } catch { Write-Host '   ❌ 前端连接失败' -ForegroundColor Red }"

echo.
echo 测试3: 登录功能
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:5000/api/auth/login' -Method POST -Body '{\"username\":\"admin\",\"password\":\"admin123\"}' -ContentType 'application/json' -UseBasicParsing; Write-Host '   ✅ 登录功能正常' -ForegroundColor Green } catch { Write-Host '   ❌ 登录功能失败' -ForegroundColor Red }"

echo.
echo =====================================
echo 🎉 系统已启动！
echo.
echo 📋 访问信息:
echo    前端界面: http://localhost:3000
echo    后端API:  http://localhost:5000
echo.
echo 👤 登录账户:
echo    用户名: admin
echo    密码: admin123
echo.
echo 💡 提示: 两个服务器窗口会保持运行
echo          如需停止，请关闭对应的命令窗口
echo.
echo 按任意键打开浏览器...
pause >nul

start http://localhost:3000

echo.
echo 测试完成！
pause



