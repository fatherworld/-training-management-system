module.exports = (app, db, bcrypt, jwt, JWT_SECRET, authenticateToken) => {
  // 获取所有用户（仅管理员）
  app.get('/api/users', authenticateToken, (req, res) => {
    // 检查是否为管理员
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

  // 为学员创建用户账户
  app.post('/api/users/student', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: '权限不足' });
    }

    const { student_id, username, password } = req.body;

    if (!student_id || !username || !password) {
      return res.status(400).json({ error: '学员ID、用户名和密码不能为空' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少6位' });
    }

    // 检查学员是否存在
    db.get('SELECT * FROM students WHERE id = ?', [student_id], (err, student) => {
      if (err) {
        return res.status(500).json({ error: '查询学员信息失败' });
      }

      if (!student) {
        return res.status(404).json({ error: '学员不存在' });
      }

      if (student.user_id) {
        return res.status(400).json({ error: '该学员已有用户账户' });
      }

      // 创建用户账户
      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          return res.status(500).json({ error: '密码加密失败' });
        }

        db.run(
          'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
          [username, hashedPassword, 'student'],
          function(err) {
            if (err) {
              if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: '用户名已存在' });
              }
              return res.status(500).json({ error: '创建用户账户失败' });
            }

            const userId = this.lastID;

            // 更新学员表，关联用户账户
            db.run(
              'UPDATE students SET user_id = ? WHERE id = ?',
              [userId, student_id],
              function(err) {
                if (err) {
                  // 如果关联失败，删除刚创建的用户
                  db.run('DELETE FROM users WHERE id = ?', [userId]);
                  return res.status(500).json({ error: '关联学员账户失败' });
                }

                res.status(201).json({
                  message: '学员账户创建成功',
                  user: {
                    id: userId,
                    username,
                    role: 'student',
                    student_id,
                    student_name: student.name
                  }
                });
              }
            );
          }
        );
      });
    });
  });

  // 删除用户账户
  app.delete('/api/users/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: '权限不足' });
    }

    const { id } = req.params;

    // 获取用户信息
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
      if (err) {
        return res.status(500).json({ error: '查询用户信息失败' });
      }

      if (!user) {
        return res.status(404).json({ error: '用户不存在' });
      }

      if (user.role === 'admin') {
        return res.status(400).json({ error: '不能删除管理员账户' });
      }

      // 删除用户账户
      db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
        if (err) {
          return res.status(500).json({ error: '删除用户账户失败' });
        }

        // 更新关联表，移除用户关联
        if (user.role === 'teacher') {
          db.run('UPDATE teachers SET user_id = NULL WHERE user_id = ?', [id]);
        } else if (user.role === 'student') {
          db.run('UPDATE students SET user_id = NULL WHERE user_id = ?', [id]);
        }

        res.json({ message: '用户账户删除成功' });
      });
    });
  });

  // 重置用户密码
  app.put('/api/users/:id/password', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: '权限不足' });
    }

    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: '新密码不能为空' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少6位' });
    }

    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        return res.status(500).json({ error: '密码加密失败' });
      }

      db.run(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, id],
        function(err) {
          if (err) {
            return res.status(500).json({ error: '密码重置失败' });
          }

          if (this.changes === 0) {
            return res.status(404).json({ error: '用户不存在' });
          }

          res.json({ message: '密码重置成功' });
        }
      );
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
          return res.status(500).json({ error: '获取学员列表失败' });
        }

        res.json({ students });
      }
    );
  });
};


