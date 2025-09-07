@echo off
echo 培训管理系统 - 开发环境启动脚本
echo =====================================

echo.
echo 1. 启动后端服务器...
cd "%~dp0"
start "后端服务器" cmd /k "npm start"

echo.
echo 2. 等待3秒...
timeout /t 3 /nobreak >nul

echo.
echo 3. 启动前端服务器...
cd client
start "前端服务器" cmd /k "npm start"

echo.
echo 4. 等待5秒让服务器启动...
timeout /t 5 /nobreak >nul

echo.
echo =====================================
echo 系统启动完成！
echo.
echo 请打开浏览器访问：
echo - 前端界面: http://localhost:3000
echo - 后端API: http://localhost:5000
echo.
echo 默认登录账户：admin / admin123
echo.
echo 按任意键关闭此窗口...
pause >nul



