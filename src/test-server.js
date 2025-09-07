console.log('开始测试服务器...');

try {
  console.log('1. 加载依赖...');
  const express = require('express');
  const cors = require('cors');
  const path = require('path');
  const sqlite3 = require('sqlite3').verbose();
  const bcrypt = require('bcryptjs');
  const jwt = require('jsonwebtoken');
  console.log('✅ 依赖加载成功');

  console.log('2. 创建Express应用...');
  const app = express();
  console.log('✅ Express应用创建成功');

  console.log('3. 连接数据库...');
  const db = new sqlite3.Database('./training_management.db');
  console.log('✅ 数据库连接成功');

  console.log('4. 测试数据库查询...');
  db.get('SELECT COUNT(*) as count FROM users', (err, result) => {
    if (err) {
      console.error('❌ 数据库查询失败:', err);
    } else {
      console.log('✅ 数据库查询成功，用户数:', result.count);
    }

    console.log('5. 测试用户路由加载...');
    try {
      require('./routes/users')(app, db, bcrypt, jwt, 'test_secret', () => {});
      console.log('✅ 用户路由加载成功');
    } catch (error) {
      console.error('❌ 用户路由加载失败:', error);
    }

    console.log('6. 测试教师API路由加载...');
    try {
      require('./routes/teacher-api')(app, db, () => {});
      console.log('✅ 教师API路由加载成功');
    } catch (error) {
      console.error('❌ 教师API路由加载失败:', error);
    }

    console.log('7. 测试学员API路由加载...');
    try {
      require('./routes/student-api')(app, db, () => {});
      console.log('✅ 学员API路由加载成功');
    } catch (error) {
      console.error('❌ 学员API路由加载失败:', error);
    }

    db.close();
    console.log('\n✅ 所有测试完成');
  });

} catch (error) {
  console.error('❌ 服务器测试失败:', error);
}


