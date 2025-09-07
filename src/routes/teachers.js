module.exports = (app, db, authenticateToken) => {
  // 获取所有教师
  app.get('/api/teachers', authenticateToken, (req, res) => {
    const { page = 1, limit = 20, search, status } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM teachers WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (name LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    db.all(query, params, (err, teachers) => {
      if (err) {
        return res.status(500).json({ error: '获取教师列表失败' });
      }

      // 获取总数
      let countQuery = 'SELECT COUNT(*) as total FROM teachers WHERE 1=1';
      const countParams = [];

      if (search) {
        countQuery += ' AND (name LIKE ? OR phone LIKE ?)';
        countParams.push(`%${search}%`, `%${search}%`);
      }

      if (status) {
        countQuery += ' AND status = ?';
        countParams.push(status);
      }

      db.get(countQuery, countParams, (err, count) => {
        if (err) {
          return res.status(500).json({ error: '获取教师总数失败' });
        }

        res.json({
          teachers,
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

  // 获取单个教师详情
  app.get('/api/teachers/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM teachers WHERE id = ?', [id], (err, teacher) => {
      if (err) {
        return res.status(500).json({ error: '获取教师信息失败' });
      }

      if (!teacher) {
        return res.status(404).json({ error: '教师不存在' });
      }

      // 获取教师的班级信息
      db.all(`
        SELECT c.*, co.name as course_name
        FROM classes c
        JOIN courses co ON c.course_id = co.id
        WHERE c.teacher_id = ?
      `, [id], (err, classes) => {
        if (err) {
          return res.status(500).json({ error: '获取教师班级信息失败' });
        }

        res.json({ teacher, classes });
      });
    });
  });

  // 创建教师
  app.post('/api/teachers', authenticateToken, (req, res) => {
    const { name, phone, email, specialties, hourly_rate } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: '姓名和电话不能为空' });
    }

    db.run(
      'INSERT INTO teachers (name, phone, email, specialties, hourly_rate) VALUES (?, ?, ?, ?, ?)',
      [name, phone, email, specialties, hourly_rate],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: '电话号码已存在' });
          }
          return res.status(500).json({ error: '创建教师失败' });
        }

        res.status(201).json({
          message: '教师创建成功',
          teacher: {
            id: this.lastID,
            name,
            phone,
            email,
            specialties,
            hourly_rate
          }
        });
      }
    );
  });

  // 更新教师信息
  app.put('/api/teachers/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { name, phone, email, specialties, hourly_rate, status } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: '姓名和电话不能为空' });
    }

    db.run(
      'UPDATE teachers SET name = ?, phone = ?, email = ?, specialties = ?, hourly_rate = ?, status = ? WHERE id = ?',
      [name, phone, email, specialties, hourly_rate, status, id],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: '电话号码已存在' });
          }
          return res.status(500).json({ error: '更新教师信息失败' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: '教师不存在' });
        }

        res.json({ message: '教师信息更新成功' });
      }
    );
  });

  // 删除教师
  app.delete('/api/teachers/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    // 检查是否有关联的班级
    db.get('SELECT COUNT(*) as count FROM classes WHERE teacher_id = ?', [id], (err, result) => {
      if (err) {
        return res.status(500).json({ error: '检查教师关联信息失败' });
      }

      if (result.count > 0) {
        return res.status(400).json({ error: '该教师还有关联的班级，无法删除' });
      }

      db.run('DELETE FROM teachers WHERE id = ?', [id], function(err) {
        if (err) {
          return res.status(500).json({ error: '删除教师失败' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: '教师不存在' });
        }

        res.json({ message: '教师删除成功' });
      });
    });
  });

  // 获取教师课程表
  app.get('/api/teachers/:id/schedule', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    let query = `
      SELECT cs.*, c.name as class_name, co.name as course_name
      FROM class_sessions cs
      JOIN classes c ON cs.class_id = c.id
      JOIN courses co ON c.course_id = co.id
      WHERE c.teacher_id = ?
    `;
    const params = [id];

    if (start_date) {
      query += ' AND DATE(cs.session_date) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND DATE(cs.session_date) <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY cs.session_date ASC';

    db.all(query, params, (err, schedule) => {
      if (err) {
        return res.status(500).json({ error: '获取教师课程表失败' });
      }

      res.json({ schedule });
    });
  });
};

