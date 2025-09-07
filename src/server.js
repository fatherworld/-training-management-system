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
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://training-management-backend-c9qq.onrender.com',
    /https:\/\/.*\.netlify\.app$/
  ],
  credentials: true
}));
app.use(express.json());

// 生产环境不提供静态文件服务，由Netlify托管前端

// 数据库初始化
const db = new sqlite3.Database('./training_management.db');

// 创建数据库表
db.serialize(() => {
  // 用户表
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 学员表
  db.run(`CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT,
    age INTEGER,
    status TEXT DEFAULT 'active',
    enrollment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    user_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // 教师表
  db.run(`CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT,
    specialties TEXT,
    hourly_rate DECIMAL(10,2),
    status TEXT DEFAULT 'active',
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // 课程表
  db.run(`CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    duration INTEGER,
    price DECIMAL(10,2),
    max_students INTEGER DEFAULT 20,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 班级表
  db.run(`CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER,
    teacher_id INTEGER,
    name TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    schedule_days TEXT,
    schedule_time TEXT,
    max_students INTEGER DEFAULT 20,
    current_students INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses (id),
    FOREIGN KEY (teacher_id) REFERENCES teachers (id)
  )`);

  // 学员课程关联表
  db.run(`CREATE TABLE IF NOT EXISTS student_courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    class_id INTEGER,
    enrollment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    remaining_hours INTEGER DEFAULT 0,
    total_hours INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    FOREIGN KEY (student_id) REFERENCES students (id),
    FOREIGN KEY (class_id) REFERENCES classes (id)
  )`);

  // 试听记录表
  db.run(`CREATE TABLE IF NOT EXISTS trial_classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_name TEXT NOT NULL,
    student_phone TEXT NOT NULL,
    class_id INTEGER,
    trial_date DATETIME,
    status TEXT DEFAULT 'scheduled',
    feedback TEXT,
    result TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes (id)
  )`);

  // 课时记录表
  db.run(`CREATE TABLE IF NOT EXISTS class_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER,
    session_date DATETIME,
    duration INTEGER,
    attendance TEXT,
    notes TEXT,
    status TEXT DEFAULT 'scheduled',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes (id)
  )`);

  // 点评记录表
  db.run(`CREATE TABLE IF NOT EXISTS student_evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    session_id INTEGER,
    rating INTEGER,
    strengths TEXT,
    improvements TEXT,
    homework TEXT,
    teacher_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students (id),
    FOREIGN KEY (session_id) REFERENCES class_sessions (id)
  )`);

  // 通知记录表
  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    recipient_type TEXT,
    recipient_id INTEGER,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    send_time DATETIME,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 插入默认管理员账户
  const defaultPassword = bcrypt.hashSync('admin123', 10);
  db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin', '${defaultPassword}', 'admin')`);
});

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

// API路由
require('./routes/auth')(app, db, bcrypt, jwt, JWT_SECRET);
require('./routes/users')(app, db, bcrypt, jwt, JWT_SECRET, authenticateToken);
require('./routes/students')(app, db, authenticateToken);
require('./routes/teachers')(app, db, authenticateToken);
require('./routes/courses')(app, db, authenticateToken);
require('./routes/classes')(app, db, authenticateToken);
require('./routes/trials')(app, db, authenticateToken);
require('./routes/sessions')(app, db, authenticateToken);
require('./routes/evaluations')(app, db, authenticateToken);
require('./routes/notifications')(app, db, authenticateToken);
require('./routes/analytics')(app, db, authenticateToken);
require('./routes/teacher-api')(app, db, authenticateToken);
require('./routes/student-api')(app, db, authenticateToken);

// 定时任务 - 发送上课提醒
cron.schedule('0 8 * * *', () => {
  console.log('执行每日上课提醒任务');
  // 获取今日课程并发送提醒
  const today = moment().format('YYYY-MM-DD');
  db.all(`
    SELECT cs.*, c.name as class_name, t.name as teacher_name, t.phone as teacher_phone
    FROM class_sessions cs
    JOIN classes c ON cs.class_id = c.id
    JOIN teachers t ON c.teacher_id = t.id
    WHERE DATE(cs.session_date) = ?
    AND cs.status = 'scheduled'
  `, [today], (err, sessions) => {
    if (err) {
      console.error('获取今日课程失败:', err);
      return;
    }

    sessions.forEach(session => {
      // 创建上课提醒通知
      db.run(`
        INSERT INTO notifications (type, recipient_type, recipient_id, title, message, send_time, status)
        VALUES ('class_reminder', 'teacher', ?, ?, ?, ?, 'pending')
      `, [
        session.teacher_id,
        '今日上课提醒',
        `您今天有课程：${session.class_name}，时间：${moment(session.session_date).format('HH:mm')}`,
        new Date(),
      ]);
    });
  });
});

// API服务器根路由
app.get('/', (req, res) => {
    res.json({ 
      message: '培训管理系统API服务器运行中', 
      version: '1.0.0',
      environment: 'development',
      frontend: 'Deployed on Netlify',
      api_docs: '/api'
    });
});

app.listen(PORT, () => {
  console.log(`培训管理系统服务器运行在端口 ${PORT}`);
  console.log(`数据库文件: training_management.db`);
  console.log(`默认管理员账户: admin / admin123`);
});

module.exports = app;
