const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cron = require('node-cron');
const moment = require('moment');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'training_management_secret_key_2024';

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/build')));

// 数据库初始化
const db = new sqlite3.Database('./training_management.db');

// JWT验证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '访问令牌缺失' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '无效的访问令牌' });
    }
    req.user = user;
    next();
  });
};

console.log('正在加载API路由...');

try {
  // 基础路由
  require('./routes/auth')(app, db, bcrypt, jwt, JWT_SECRET);
  console.log('✅ 认证路由加载成功');

  require('./routes/users')(app, db, bcrypt, jwt, JWT_SECRET, authenticateToken);
  console.log('✅ 用户管理路由加载成功');

  require('./routes/students')(app, db, authenticateToken);
  console.log('✅ 学员管理路由加载成功');

  require('./routes/teachers')(app, db, authenticateToken);
  console.log('✅ 教师管理路由加载成功');

  require('./routes/courses')(app, db, authenticateToken);
  console.log('✅ 课程管理路由加载成功');

  require('./routes/classes')(app, db, authenticateToken);
  console.log('✅ 班级管理路由加载成功');

  require('./routes/trials')(app, db, authenticateToken);
  console.log('✅ 试听管理路由加载成功');

  require('./routes/sessions')(app, db, authenticateToken);
  console.log('✅ 课程安排路由加载成功');

  require('./routes/evaluations')(app, db, authenticateToken);
  console.log('✅ 点评管理路由加载成功');

  require('./routes/notifications')(app, db, authenticateToken);
  console.log('✅ 通知管理路由加载成功');

  require('./routes/analytics')(app, db, authenticateToken);
  console.log('✅ 数据分析路由加载成功');

  require('./routes/teacher-api')(app, db, authenticateToken);
  console.log('✅ 教师API路由加载成功');

  require('./routes/student-api')(app, db, authenticateToken);
  console.log('✅ 学员API路由加载成功');

} catch (error) {
  console.error('❌ 路由加载失败:', error);
  process.exit(1);
}

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

// 处理React路由
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'API路由不存在' });
  } else {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  }
});

// 定时任务 - 发送上课提醒
cron.schedule('0 8 * * *', () => {
  console.log('执行每日上课提醒任务');
  // 这里可以添加自动发送提醒的逻辑
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`✅ 培训管理系统服务器运行在端口 ${PORT}`);
  console.log(`🌐 前端地址: http://localhost:3000`);
  console.log(`🔗 API地址: http://localhost:${PORT}/api`);
  console.log(`🔑 默认管理员账户: admin / admin123`);
});

module.exports = app;


