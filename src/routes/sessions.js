const moment = require('moment');

module.exports = (app, db, authenticateToken) => {
  // 获取所有课程安排
  app.get('/api/sessions', authenticateToken, (req, res) => {
    const { page = 1, limit = 20, class_id, date_from, date_to, status } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT cs.*, c.name as class_name, co.name as course_name, t.name as teacher_name
      FROM class_sessions cs
      JOIN classes c ON cs.class_id = c.id
      JOIN courses co ON c.course_id = co.id
      JOIN teachers t ON c.teacher_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (class_id) {
      query += ' AND cs.class_id = ?';
      params.push(class_id);
    }

    if (date_from) {
      query += ' AND DATE(cs.session_date) >= ?';
      params.push(date_from);
    }

    if (date_to) {
      query += ' AND DATE(cs.session_date) <= ?';
      params.push(date_to);
    }

    if (status) {
      query += ' AND cs.status = ?';
      params.push(status);
    }

    query += ' ORDER BY cs.session_date ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    db.all(query, params, (err, sessions) => {
      if (err) {
        return res.status(500).json({ error: '获取课程安排失败' });
      }

      // 获取总数
      let countQuery = `
        SELECT COUNT(*) as total FROM class_sessions cs
        JOIN classes c ON cs.class_id = c.id
        WHERE 1=1
      `;
      const countParams = [];

      if (class_id) {
        countQuery += ' AND cs.class_id = ?';
        countParams.push(class_id);
      }

      if (date_from) {
        countQuery += ' AND DATE(cs.session_date) >= ?';
        countParams.push(date_from);
      }

      if (date_to) {
        countQuery += ' AND DATE(cs.session_date) <= ?';
        countParams.push(date_to);
      }

      if (status) {
        countQuery += ' AND cs.status = ?';
        countParams.push(status);
      }

      db.get(countQuery, countParams, (err, count) => {
        if (err) {
          return res.status(500).json({ error: '获取课程安排总数失败' });
        }

        res.json({
          sessions,
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

  // 获取单个课程安排详情
  app.get('/api/sessions/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.get(`
      SELECT cs.*, c.name as class_name, co.name as course_name, t.name as teacher_name
      FROM class_sessions cs
      JOIN classes c ON cs.class_id = c.id
      JOIN courses co ON c.course_id = co.id
      JOIN teachers t ON c.teacher_id = t.id
      WHERE cs.id = ?
    `, [id], (err, session) => {
      if (err) {
        return res.status(500).json({ error: '获取课程安排失败' });
      }

      if (!session) {
        return res.status(404).json({ error: '课程安排不存在' });
      }

      // 获取该课程的学员列表和出勤情况
      db.all(`
        SELECT s.*, sc.remaining_hours, sc.total_hours
        FROM students s
        JOIN student_courses sc ON s.id = sc.student_id
        WHERE sc.class_id = ? AND sc.status = 'active'
      `, [session.class_id], (err, students) => {
        if (err) {
          return res.status(500).json({ error: '获取学员列表失败' });
        }

        // 解析出勤情况
        let attendance = [];
        if (session.attendance) {
          try {
            attendance = JSON.parse(session.attendance);
          } catch (e) {
            attendance = [];
          }
        }

        res.json({ session, students, attendance });
      });
    });
  });

  // 创建课程安排
  app.post('/api/sessions', authenticateToken, (req, res) => {
    const { class_id, session_date, duration, notes } = req.body;

    if (!class_id || !session_date || !duration) {
      return res.status(400).json({ error: '班级ID、上课时间和课时时长不能为空' });
    }

    db.run(
      'INSERT INTO class_sessions (class_id, session_date, duration, notes, status) VALUES (?, ?, ?, ?, "scheduled")',
      [class_id, session_date, duration, notes],
      function(err) {
        if (err) {
          return res.status(500).json({ error: '创建课程安排失败' });
        }

        res.status(201).json({
          message: '课程安排创建成功',
          session: {
            id: this.lastID,
            class_id,
            session_date,
            duration,
            notes,
            status: 'scheduled'
          }
        });
      }
    );
  });

  // 更新课程安排
  app.put('/api/sessions/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { class_id, session_date, duration, notes, status } = req.body;

    if (!class_id || !session_date || !duration) {
      return res.status(400).json({ error: '班级ID、上课时间和课时时长不能为空' });
    }

    db.run(
      'UPDATE class_sessions SET class_id = ?, session_date = ?, duration = ?, notes = ?, status = ? WHERE id = ?',
      [class_id, session_date, duration, notes, status, id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: '更新课程安排失败' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: '课程安排不存在' });
        }

        res.json({ message: '课程安排更新成功' });
      }
    );
  });

  // 删除课程安排
  app.delete('/api/sessions/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM class_sessions WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: '删除课程安排失败' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: '课程安排不存在' });
      }

      res.json({ message: '课程安排删除成功' });
    });
  });

  // 点名签到
  app.post('/api/sessions/:id/attendance', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { attendance } = req.body;

    if (!attendance || !Array.isArray(attendance)) {
      return res.status(400).json({ error: '出勤数据格式错误' });
    }

    // 获取课程信息
    db.get('SELECT * FROM class_sessions WHERE id = ?', [id], (err, session) => {
      if (err) {
        return res.status(500).json({ error: '获取课程信息失败' });
      }

      if (!session) {
        return res.status(404).json({ error: '课程安排不存在' });
      }

      // 更新出勤记录
      db.run(
        'UPDATE class_sessions SET attendance = ?, status = "completed" WHERE id = ?',
        [JSON.stringify(attendance), id],
        function(err) {
          if (err) {
            return res.status(500).json({ error: '更新出勤记录失败' });
          }

          // 扣除出勤学员的课时
          const attendedStudents = attendance.filter(a => a.status === 'present');
          
          if (attendedStudents.length > 0) {
            const stmt = db.prepare(`
              UPDATE student_courses 
              SET remaining_hours = remaining_hours - ? 
              WHERE student_id = ? AND class_id = ?
            `);

            attendedStudents.forEach(student => {
              stmt.run([session.duration, student.student_id, session.class_id]);
            });

            stmt.finalize();
          }

          // 发送课后通知
          db.run(`
            INSERT INTO notifications (type, recipient_type, recipient_id, title, message, send_time, status)
            VALUES ('class_completed', 'class', ?, '课程完成通知', ?, ?, 'pending')
          `, [
            session.class_id,
            `课程已完成，共有 ${attendedStudents.length} 名学员出勤。`,
            new Date()
          ]);

          res.json({ message: '出勤记录更新成功' });
        }
      );
    });
  });

  // 获取今日课程
  app.get('/api/sessions/today', authenticateToken, (req, res) => {
    const today = moment().format('YYYY-MM-DD');

    db.all(`
      SELECT cs.*, c.name as class_name, co.name as course_name, t.name as teacher_name, t.phone as teacher_phone
      FROM class_sessions cs
      JOIN classes c ON cs.class_id = c.id
      JOIN courses co ON c.course_id = co.id
      JOIN teachers t ON c.teacher_id = t.id
      WHERE DATE(cs.session_date) = ?
      ORDER BY cs.session_date ASC
    `, [today], (err, sessions) => {
      if (err) {
        return res.status(500).json({ error: '获取今日课程失败' });
      }

      res.json({ sessions });
    });
  });

  // 获取本周课程
  app.get('/api/sessions/week', authenticateToken, (req, res) => {
    const startOfWeek = moment().startOf('week').format('YYYY-MM-DD');
    const endOfWeek = moment().endOf('week').format('YYYY-MM-DD');

    db.all(`
      SELECT cs.*, c.name as class_name, co.name as course_name, t.name as teacher_name
      FROM class_sessions cs
      JOIN classes c ON cs.class_id = c.id
      JOIN courses co ON c.course_id = co.id
      JOIN teachers t ON c.teacher_id = t.id
      WHERE DATE(cs.session_date) BETWEEN ? AND ?
      ORDER BY cs.session_date ASC
    `, [startOfWeek, endOfWeek], (err, sessions) => {
      if (err) {
        return res.status(500).json({ error: '获取本周课程失败' });
      }

      res.json({ sessions });
    });
  });
};

