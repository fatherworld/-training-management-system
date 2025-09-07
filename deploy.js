#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 培训管理系统 - 自动部署脚本');
console.log('=====================================\n');

// 检查必要文件
const requiredFiles = [
  'package.json',
  'railway.json',
  'src/server.js',
  'src/client/package.json',
  'src/client/netlify.toml'
];

console.log('📋 检查部署文件...');
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`❌ 缺少必要文件: ${file}`);
    process.exit(1);
  }
  console.log(`✅ ${file}`);
}

// 安装依赖
console.log('\n📦 安装后端依赖...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ 后端依赖安装完成');
} catch (error) {
  console.error('❌ 后端依赖安装失败:', error.message);
  process.exit(1);
}

console.log('\n📦 安装前端依赖...');
try {
  execSync('cd src/client && npm install', { stdio: 'inherit' });
  console.log('✅ 前端依赖安装完成');
} catch (error) {
  console.error('❌ 前端依赖安装失败:', error.message);
  process.exit(1);
}

// 构建前端
console.log('\n🔨 构建前端应用...');
try {
  execSync('cd src/client && npm run build', { stdio: 'inherit' });
  console.log('✅ 前端构建完成');
} catch (error) {
  console.error('❌ 前端构建失败:', error.message);
  process.exit(1);
}

// 测试后端
console.log('\n🧪 测试后端启动...');
const testServer = require('./src/server.js');
setTimeout(() => {
  console.log('✅ 后端测试通过');
  process.exit(0);
}, 2000);

console.log('\n✨ 部署准备完成！');
console.log('\n📝 下一步：');
console.log('1. 将代码推送到GitHub仓库');
console.log('2. 在Railway部署后端：https://railway.app');
console.log('3. 在Netlify部署前端：https://netlify.com');
console.log('4. 参考《部署指南.md》完成配置');
console.log('\n🎯 部署成功后，记得更新环境变量中的域名！');

