module.exports = (app, db, bcrypt, jwt, JWT_SECRET) => {
  // 用户登录
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

  // 用户注册
  app.post('/api/auth/register', (req, res) => {
    const { username, password, role = 'admin' } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少6位' });
    }

    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        return res.status(500).json({ error: '密码加密错误' });
      }

      db.run(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [username, hashedPassword, role],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              return res.status(400).json({ error: '用户名已存在' });
            }
            return res.status(500).json({ error: '用户创建失败' });
          }

          res.status(201).json({
            message: '用户创建成功',
            user: {
              id: this.lastID,
              username,
              role
            }
          });
        }
      );
    });
  });

  // 获取当前用户信息
  app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: '访问令牌缺失' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: '无效的访问令牌' });
      }

      db.get('SELECT id, username, role, created_at FROM users WHERE id = ?', [user.id], (err, userData) => {
        if (err) {
          return res.status(500).json({ error: '数据库查询错误' });
        }

        if (!userData) {
          return res.status(404).json({ error: '用户不存在' });
        }

        res.json({ user: userData });
      });
    });
  });
};

