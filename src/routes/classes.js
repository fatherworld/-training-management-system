module.exports = (app, db, authenticateToken) => {
  // 获取所有班级
  app.get('/api/classes', authenticateToken, (req, res) => {
    const { page = 1, limit = 20, search, status, course_id, teacher_id } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT c.*, co.name as course_name, t.name as teacher_name
      FROM classes c
      LEFT JOIN courses co ON c.course_id = co.id
      LEFT JOIN teachers t ON c.teacher_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND c.name LIKE ?';
      params.push(`%${search}%`);
    }

    if (status) {
      query += ' AND c.status = ?';
      params.push(status);
    }

    if (course_id) {
      query += ' AND c.course_id = ?';
      params.push(course_id);
    }

    if (teacher_id) {
      query += ' AND c.teacher_id = ?';
      params.push(teacher_id);
    }

    query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    db.all(query, params, (err, classes) => {
      if (err) {
        return res.status(500).json({ error: '获取班级列表失败' });
      }

      // 获取总数
      let countQuery = 'SELECT COUNT(*) as total FROM classes c WHERE 1=1';
      const countParams = [];

      if (search) {
        countQuery += ' AND c.name LIKE ?';
        countParams.push(`%${search}%`);
      }

      if (status) {
        countQuery += ' AND c.status = ?';
        countParams.push(status);
      }

      if (course_id) {
        countQuery += ' AND c.course_id = ?';
        countParams.push(course_id);
      }

      if (teacher_id) {
        countQuery += ' AND c.teacher_id = ?';
        countParams.push(teacher_id);
      }

      db.get(countQuery, countParams, (err, count) => {
        if (err) {
          return res.status(500).json({ error: '获取班级总数失败' });
        }

        res.json({
          classes,
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

  // 获取单个班级详情
  app.get('/api/classes/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.get(`
      SELECT c.*, co.name as course_name, t.name as teacher_name, t.phone as teacher_phone
      FROM classes c
      LEFT JOIN courses co ON c.course_id = co.id
      LEFT JOIN teachers t ON c.teacher_id = t.id
      WHERE c.id = ?
    `, [id], (err, classInfo) => {
      if (err) {
        return res.status(500).json({ error: '获取班级信息失败' });
      }

      if (!classInfo) {
        return res.status(404).json({ error: '班级不存在' });
      }

      // 获取班级的学员信息
      db.all(`
        SELECT s.*, sc.remaining_hours, sc.total_hours, sc.enrollment_date, sc.status as enrollment_status
        FROM students s
        JOIN student_courses sc ON s.id = sc.student_id
        WHERE sc.class_id = ?
      `, [id], (err, students) => {
        if (err) {
          return res.status(500).json({ error: '获取班级学员信息失败' });
        }

        // 获取班级的课程安排
        db.all(`
          SELECT * FROM class_sessions
          WHERE class_id = ?
          ORDER BY session_date ASC
        `, [id], (err, sessions) => {
          if (err) {
            return res.status(500).json({ error: '获取班级课程安排失败' });
          }

          res.json({ 
            class: classInfo, 
            students, 
            sessions 
          });
        });
      });
    });
  });

  // 创建班级
  app.post('/api/classes', authenticateToken, (req, res) => {
    const { 
      course_id, 
      teacher_id, 
      name, 
      start_date, 
      end_date, 
      schedule_days, 
      schedule_time, 
      max_students 
    } = req.body;

    if (!course_id || !teacher_id || !name) {
      return res.status(400).json({ error: '课程ID、教师ID和班级名称不能为空' });
    }

    db.run(
      `INSERT INTO classes (course_id, teacher_id, name, start_date, end_date, 
       schedule_days, schedule_time, max_students) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [course_id, teacher_id, name, start_date, end_date, schedule_days, schedule_time, max_students || 20],
      function(err) {
        if (err) {
          return res.status(500).json({ error: '创建班级失败' });
        }

        res.status(201).json({
          message: '班级创建成功',
          class: {
            id: this.lastID,
            course_id,
            teacher_id,
            name,
            start_date,
            end_date,
            schedule_days,
            schedule_time,
            max_students: max_students || 20
          }
        });
      }
    );
  });

  // 更新班级信息
  app.put('/api/classes/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { 
      course_id, 
      teacher_id, 
      name, 
      start_date, 
      end_date, 
      schedule_days, 
      schedule_time, 
      max_students, 
      status 
    } = req.body;

    if (!course_id || !teacher_id || !name) {
      return res.status(400).json({ error: '课程ID、教师ID和班级名称不能为空' });
    }

    db.run(
      `UPDATE classes SET course_id = ?, teacher_id = ?, name = ?, start_date = ?, 
       end_date = ?, schedule_days = ?, schedule_time = ?, max_students = ?, status = ? 
       WHERE id = ?`,
      [course_id, teacher_id, name, start_date, end_date, schedule_days, schedule_time, max_students, status, id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: '更新班级信息失败' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: '班级不存在' });
        }

        res.json({ message: '班级信息更新成功' });
      }
    );
  });

  // 删除班级
  app.delete('/api/classes/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    // 检查是否有学员报名
    db.get('SELECT COUNT(*) as count FROM student_courses WHERE class_id = ?', [id], (err, result) => {
      if (err) {
        return res.status(500).json({ error: '检查班级关联信息失败' });
      }

      if (result.count > 0) {
        return res.status(400).json({ error: '该班级还有学员报名，无法删除' });
      }

      db.run('DELETE FROM classes WHERE id = ?', [id], function(err) {
        if (err) {
          return res.status(500).json({ error: '删除班级失败' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: '班级不存在' });
        }

        res.json({ message: '班级删除成功' });
      });
    });
  });

  // 生成班级课程表
  app.post('/api/classes/:id/generate-schedule', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { sessions } = req.body;

    if (!sessions || !Array.isArray(sessions)) {
      return res.status(400).json({ error: '课程安排数据格式错误' });
    }

    // 删除原有课程安排
    db.run('DELETE FROM class_sessions WHERE class_id = ?', [id], (err) => {
      if (err) {
        return res.status(500).json({ error: '清空原有课程安排失败' });
      }

      // 批量插入新的课程安排
      const stmt = db.prepare(`
        INSERT INTO class_sessions (class_id, session_date, duration, status)
        VALUES (?, ?, ?, 'scheduled')
      `);

      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        sessions.forEach(session => {
          stmt.run([id, session.date, session.duration]);
        });
        
        stmt.finalize();
        
        db.run('COMMIT', (err) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: '生成课程表失败' });
          }
          
          res.json({ message: '课程表生成成功' });
        });
      });
    });
  });
};

