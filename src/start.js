#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('\n🎓 培训管理系统 - 启动脚本\n');

function startServer() {
  console.log('🚀 启动后端服务器...');
  
  const server = spawn('node', ['server.js'], {
    cwd: process.cwd(),
    stdio: 'inherit'
  });
  
  server.on('error', (error) => {
    console.error('❌ 后端启动失败:', error.message);
    process.exit(1);
  });
  
  server.on('close', (code) => {
    console.log(`\n📴 后端服务器已停止 (退出码: ${code})`);
  });
  
  return server;
}

function startClient() {
  const clientPath = path.join(process.cwd(), 'client');
  
  console.log('🌐 启动前端应用...');
  console.log('📍 前端目录:', clientPath);
  
  const client = spawn('npm', ['start'], {
    cwd: clientPath,
    stdio: 'inherit',
    shell: true
  });
  
  client.on('error', (error) => {
    console.error('❌ 前端启动失败:', error.message);
    console.log('提示: 请确保已在client目录下运行 npm install');
  });
  
  client.on('close', (code) => {
    console.log(`\n📴 前端应用已停止 (退出码: ${code})`);
  });
  
  return client;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('使用方法:');
    console.log('  node start.js          # 启动后端服务器');
    console.log('  node start.js --all    # 同时启动前后端');
    console.log('  node start.js --client # 仅启动前端');
    console.log('  node start.js --help   # 显示帮助');
    return;
  }
  
  if (args.includes('--all')) {
    console.log('🔥 启动完整系统（前端 + 后端）...\n');
    
    // 先启动后端
    const server = startServer();
    
    // 等待2秒后启动前端
    setTimeout(() => {
      const client = startClient();
      
      // 处理退出信号
      process.on('SIGINT', () => {
        console.log('\n\n🛑 正在停止服务...');
        server.kill('SIGTERM');
        client.kill('SIGTERM');
        process.exit(0);
      });
    }, 2000);
    
  } else if (args.includes('--client')) {
    console.log('🌐 仅启动前端应用...\n');
    startClient();
    
  } else {
    console.log('🚀 启动后端服务器...\n');
    startServer();
  }
  
  console.log('\n📋 快速访问:');
  console.log('- 前端界面: http://localhost:3000');
  console.log('- 后端API: http://localhost:5000');
  console.log('- 默认账户: admin / admin123');
  console.log('\n💡 提示: 按 Ctrl+C 停止服务\n');
}

if (require.main === module) {
  main();
}



