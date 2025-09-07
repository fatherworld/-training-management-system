module.exports = (app, db, authenticateToken) => {
  // 获取所有课程
  app.get('/api/courses', authenticateToken, (req, res) => {
    const { page = 1, limit = 20, search, status } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM courses WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    db.all(query, params, (err, courses) => {
      if (err) {
        return res.status(500).json({ error: '获取课程列表失败' });
      }

      // 获取总数
      let countQuery = 'SELECT COUNT(*) as total FROM courses WHERE 1=1';
      const countParams = [];

      if (search) {
        countQuery += ' AND name LIKE ?';
        countParams.push(`%${search}%`);
      }

      if (status) {
        countQuery += ' AND status = ?';
        countParams.push(status);
      }

      db.get(countQuery, countParams, (err, count) => {
        if (err) {
          return res.status(500).json({ error: '获取课程总数失败' });
        }

        res.json({
          courses,
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

  // 获取单个课程详情
  app.get('/api/courses/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM courses WHERE id = ?', [id], (err, course) => {
      if (err) {
        return res.status(500).json({ error: '获取课程信息失败' });
      }

      if (!course) {
        return res.status(404).json({ error: '课程不存在' });
      }

      // 获取课程的班级信息
      db.all(`
        SELECT c.*, t.name as teacher_name
        FROM classes c
        LEFT JOIN teachers t ON c.teacher_id = t.id
        WHERE c.course_id = ?
      `, [id], (err, classes) => {
        if (err) {
          return res.status(500).json({ error: '获取课程班级信息失败' });
        }

        res.json({ course, classes });
      });
    });
  });

  // 创建课程
  app.post('/api/courses', authenticateToken, (req, res) => {
    const { name, description, duration, price, max_students } = req.body;

    if (!name) {
      return res.status(400).json({ error: '课程名称不能为空' });
    }

    db.run(
      'INSERT INTO courses (name, description, duration, price, max_students) VALUES (?, ?, ?, ?, ?)',
      [name, description, duration, price, max_students || 20],
      function(err) {
        if (err) {
          return res.status(500).json({ error: '创建课程失败' });
        }

        res.status(201).json({
          message: '课程创建成功',
          course: {
            id: this.lastID,
            name,
            description,
            duration,
            price,
            max_students: max_students || 20
          }
        });
      }
    );
  });

  // 更新课程信息
  app.put('/api/courses/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { name, description, duration, price, max_students, status } = req.body;

    if (!name) {
      return res.status(400).json({ error: '课程名称不能为空' });
    }

    db.run(
      'UPDATE courses SET name = ?, description = ?, duration = ?, price = ?, max_students = ?, status = ? WHERE id = ?',
      [name, description, duration, price, max_students, status, id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: '更新课程信息失败' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: '课程不存在' });
        }

        res.json({ message: '课程信息更新成功' });
      }
    );
  });

  // 删除课程
  app.delete('/api/courses/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    // 检查是否有关联的班级
    db.get('SELECT COUNT(*) as count FROM classes WHERE course_id = ?', [id], (err, result) => {
      if (err) {
        return res.status(500).json({ error: '检查课程关联信息失败' });
      }

      if (result.count > 0) {
        return res.status(400).json({ error: '该课程还有关联的班级，无法删除' });
      }

      db.run('DELETE FROM courses WHERE id = ?', [id], function(err) {
        if (err) {
          return res.status(500).json({ error: '删除课程失败' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: '课程不存在' });
        }

        res.json({ message: '课程删除成功' });
      });
    });
  });
};

