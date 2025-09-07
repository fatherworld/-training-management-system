const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 5000;
const JWT_SECRET = 'training_management_secret_key_2024';

// 中间件
app.use(cors());
app.use(express.json());

// 数据库连接
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

// 基础路由
app.get('/api/test', (req, res) => {
  res.json({ message: '服务器运行正常' });
});

// 登录路由
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: '数据库查询错误' });
    }

    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        return res.status(500).json({ error: '密码验证错误' });
      }

      if (!isMatch) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        message: '登录成功',
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    });
  });
});

// 获取当前用户信息
app.get('/api/auth/me', authenticateToken, (req, res) => {
  db.get('SELECT id, username, role, created_at FROM users WHERE id = ?', [req.user.id], (err, userData) => {
    if (err) {
      return res.status(500).json({ error: '数据库查询错误' });
    }

    if (!userData) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({ user: userData });
  });
});

// 用户管理路由
app.get('/api/users', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '权限不足' });
  }

  const { page = 1, limit = 20, role } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT u.id, u.username, u.role, u.created_at,
           CASE 
             WHEN u.role = 'teacher' THEN t.name
             WHEN u.role = 'student' THEN s.name
             ELSE u.username
           END as display_name,
           CASE 
             WHEN u.role = 'teacher' THEN t.phone
             WHEN u.role = 'student' THEN s.phone
             ELSE NULL
           END as phone
    FROM users u
    LEFT JOIN teachers t ON u.id = t.user_id AND u.role = 'teacher'
    LEFT JOIN students s ON u.id = s.user_id AND u.role = 'student'
    WHERE 1=1
  `;
  const params = [];

  if (role) {
    query += ' AND u.role = ?';
    params.push(role);
  }

  query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, users) => {
    if (err) {
      console.error('获取用户列表失败:', err);
      return res.status(500).json({ error: '获取用户列表失败' });
    }

    // 获取总数
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const countParams = [];

    if (role) {
      countQuery += ' AND role = ?';
      countParams.push(role);
    }

    db.get(countQuery, countParams, (err, count) => {
      if (err) {
        console.error('获取用户总数失败:', err);
        return res.status(500).json({ error: '获取用户总数失败' });
      }

      res.json({
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count.total,
          pages: Math.ceil(count.total / limit)
        }
      });
    });
  });
});

// 获取没有用户账户的教师列表
app.get('/api/users/teachers-without-account', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '权限不足' });
  }

  db.all(
    'SELECT * FROM teachers WHERE user_id IS NULL AND status = "active"',
    [],
    (err, teachers) => {
      if (err) {
        console.error('获取教师列表失败:', err);
        return res.status(500).json({ error: '获取教师列表失败' });
      }

      res.json({ teachers });
    }
  );
});

// 获取没有用户账户的学员列表
app.get('/api/users/students-without-account', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '权限不足' });
  }

  db.all(
    'SELECT * FROM students WHERE user_id IS NULL AND status = "active"',
    [],
    (err, students) => {
      if (err) {
        console.error('获取学员列表失败:', err);
        return res.status(500).json({ error: '获取学员列表失败' });
      }

      res.json({ students });
    }
  );
});

// 为教师创建用户账户
app.post('/api/users/teacher', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '权限不足' });
  }

  const { teacher_id, username, password } = req.body;

  if (!teacher_id || !username || !password) {
    return res.status(400).json({ error: '教师ID、用户名和密码不能为空' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: '密码长度至少6位' });
  }

  // 检查教师是否存在
  db.get('SELECT * FROM teachers WHERE id = ?', [teacher_id], (err, teacher) => {
    if (err) {
      return res.status(500).json({ error: '查询教师信息失败' });
    }

    if (!teacher) {
      return res.status(404).json({ error: '教师不存在' });
    }

    if (teacher.user_id) {
      return res.status(400).json({ error: '该教师已有用户账户' });
    }

    // 创建用户账户
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        return res.status(500).json({ error: '密码加密失败' });
      }

      db.run(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [username, hashedPassword, 'teacher'],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              return res.status(400).json({ error: '用户名已存在' });
            }
            return res.status(500).json({ error: '创建用户账户失败' });
          }

          const userId = this.lastID;

          // 更新教师表，关联用户账户
          db.run(
            'UPDATE teachers SET user_id = ? WHERE id = ?',
            [userId, teacher_id],
            function(err) {
              if (err) {
                // 如果关联失败，删除刚创建的用户
                db.run('DELETE FROM users WHERE id = ?', [userId]);
                return res.status(500).json({ error: '关联教师账户失败' });
              }

              res.status(201).json({
                message: '教师账户创建成功',
                user: {
                  id: userId,
                  username,
                  role: 'teacher',
                  teacher_id,
                  teacher_name: teacher.name
                }
              });
            }
          );
        }
      );
    });
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`✅ 简化服务器运行在端口 ${PORT}`);
  console.log(`🌐 API地址: http://localhost:${PORT}/api`);
  console.log(`🔑 默认管理员账户: admin / admin123`);
});

module.exports = app;


