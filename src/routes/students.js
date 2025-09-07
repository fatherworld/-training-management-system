module.exports = (app, db, authenticateToken) => {
  // 获取所有学员
  app.get('/api/students', authenticateToken, (req, res) => {
    const { page = 1, limit = 20, search, status } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM students WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (name LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY enrollment_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    db.all(query, params, (err, students) => {
      if (err) {
        return res.status(500).json({ error: '获取学员列表失败' });
      }

      // 获取总数
      let countQuery = 'SELECT COUNT(*) as total FROM students WHERE 1=1';
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
          return res.status(500).json({ error: '获取学员总数失败' });
        }

        res.json({
          students,
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

  // 获取单个学员详情
  app.get('/api/students/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM students WHERE id = ?', [id], (err, student) => {
      if (err) {
        return res.status(500).json({ error: '获取学员信息失败' });
      }

      if (!student) {
        return res.status(404).json({ error: '学员不存在' });
      }

      // 获取学员的课程信息
      db.all(`
        SELECT sc.*, c.name as course_name, cl.name as class_name, t.name as teacher_name
        FROM student_courses sc
        JOIN classes cl ON sc.class_id = cl.id
        JOIN courses c ON cl.course_id = c.id
        JOIN teachers t ON cl.teacher_id = t.id
        WHERE sc.student_id = ?
      `, [id], (err, courses) => {
        if (err) {
          return res.status(500).json({ error: '获取学员课程信息失败' });
        }

        res.json({ student, courses });
      });
    });
  });

  // 创建学员
  app.post('/api/students', authenticateToken, (req, res) => {
    const { name, phone, email, age, notes } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: '姓名和电话不能为空' });
    }

    db.run(
      'INSERT INTO students (name, phone, email, age, notes) VALUES (?, ?, ?, ?, ?)',
      [name, phone, email, age, notes],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: '电话号码已存在' });
          }
          return res.status(500).json({ error: '创建学员失败' });
        }

        res.status(201).json({
          message: '学员创建成功',
          student: {
            id: this.lastID,
            name,
            phone,
            email,
            age,
            notes
          }
        });
      }
    );
  });

  // 更新学员信息
  app.put('/api/students/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { name, phone, email, age, status, notes } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: '姓名和电话不能为空' });
    }

    db.run(
      'UPDATE students SET name = ?, phone = ?, email = ?, age = ?, status = ?, notes = ? WHERE id = ?',
      [name, phone, email, age, status, notes, id],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: '电话号码已存在' });
          }
          return res.status(500).json({ error: '更新学员信息失败' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: '学员不存在' });
        }

        res.json({ message: '学员信息更新成功' });
      }
    );
  });

  // 删除学员
  app.delete('/api/students/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM students WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: '删除学员失败' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: '学员不存在' });
      }

      res.json({ message: '学员删除成功' });
    });
  });

  // 学员报名课程
  app.post('/api/students/:id/enroll', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { class_id, total_hours } = req.body;

    if (!class_id || !total_hours) {
      return res.status(400).json({ error: '班级ID和总课时不能为空' });
    }

    // 检查班级是否存在和是否有空位
    db.get('SELECT * FROM classes WHERE id = ?', [class_id], (err, classInfo) => {
      if (err) {
        return res.status(500).json({ error: '获取班级信息失败' });
      }

      if (!classInfo) {
        return res.status(404).json({ error: '班级不存在' });
      }

      if (classInfo.current_students >= classInfo.max_students) {
        return res.status(400).json({ error: '班级已满员' });
      }

      // 检查是否已经报名
      db.get('SELECT * FROM student_courses WHERE student_id = ? AND class_id = ?', [id, class_id], (err, existing) => {
        if (err) {
          return res.status(500).json({ error: '检查报名状态失败' });
        }

        if (existing) {
          return res.status(400).json({ error: '学员已报名该班级' });
        }

        // 报名
        db.run(
          'INSERT INTO student_courses (student_id, class_id, total_hours, remaining_hours) VALUES (?, ?, ?, ?)',
          [id, class_id, total_hours, total_hours],
          function(err) {
            if (err) {
              return res.status(500).json({ error: '报名失败' });
            }

            // 更新班级人数
            db.run('UPDATE classes SET current_students = current_students + 1 WHERE id = ?', [class_id]);

            res.status(201).json({ message: '报名成功' });
          }
        );
      });
    });
  });
};
