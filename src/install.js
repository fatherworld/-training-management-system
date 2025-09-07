#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n🎓 培训管理系统 - 自动安装脚本\n');

function runCommand(command, description) {
  console.log(`📦 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description}完成\n`);
  } catch (error) {
    console.error(`❌ ${description}失败:`, error.message);
    process.exit(1);
  }
}

function checkNodeVersion() {
  console.log('🔍 检查Node.js版本...');
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 14) {
    console.error('❌ 需要Node.js 14.0或更高版本，当前版本:', nodeVersion);
    console.log('请访问 https://nodejs.org 下载最新版本');
    process.exit(1);
  }
  
  console.log(`✅ Node.js版本检查通过: ${nodeVersion}\n`);
}

function main() {
  // 检查Node.js版本
  checkNodeVersion();
  
  // 安装后端依赖
  console.log('📍 当前目录:', process.cwd());
  runCommand('npm install', '安装后端依赖');
  
  // 检查client目录是否存在
  const clientPath = path.join(process.cwd(), 'client');
  if (fs.existsSync(clientPath)) {
    // 安装前端依赖
    console.log('📍 进入前端目录:', clientPath);
    process.chdir(clientPath);
    runCommand('npm install', '安装前端依赖');
    
    // 返回根目录
    process.chdir('..');
  } else {
    console.log('⚠️  未找到client目录，跳过前端依赖安装');
  }
  
  console.log('🎉 安装完成！\n');
  console.log('📋 启动步骤:');
  console.log('1. 启动后端: npm start');
  console.log('2. 启动前端: cd client && npm start');
  console.log('3. 访问系统: http://localhost:3000');
  console.log('4. 默认账户: admin / admin123\n');
  console.log('📖 详细说明请查看 README.md 或 启动说明.md');
}

if (require.main === module) {
  main();
}



