module.exports = (app, db, authenticateToken) => {
  // 获取教师个人信息
  app.get('/api/teacher/me', authenticateToken, (req, res) => {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: '权限不足' });
    }

    db.get('SELECT * FROM teachers WHERE user_id = ?', [req.user.id], (err, teacher) => {
      if (err) {
        return res.status(500).json({ error: '获取教师信息失败' });
      }

      if (!teacher) {
        return res.status(404).json({ error: '教师信息不存在' });
      }

      res.json({ teacher });
    });
  });

  // 获取教师仪表板统计数据
  app.get('/api/teacher/dashboard-stats', authenticateToken, (req, res) => {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: '权限不足' });
    }

    // 获取当前教师的ID
    db.get('SELECT id FROM teachers WHERE user_id = ?', [req.user.id], (err, teacher) => {
      if (err) {
        return res.status(500).json({ error: '获取教师信息失败' });
      }

      if (!teacher) {
        return res.status(404).json({ error: '教师信息不存在' });
      }

      const teacherId = teacher.id;
      const today = new Date().toISOString().split('T')[0];
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      // 并行执行多个查询
      Promise.all([
        // 今日课程数
        new Promise((resolve, reject) => {
          db.get(`
            SELECT COUNT(*) as count FROM class_sessions cs
            JOIN classes c ON cs.class_id = c.id
            WHERE c.teacher_id = ? AND DATE(cs.session_date) = ?
          `, [teacherId, today], (err, result) => {
            if (err) reject(err);
            else resolve(result.count);
          });
        }),
        
        // 本周课程数
        new Promise((resolve, reject) => {
          db.get(`
            SELECT COUNT(*) as count FROM class_sessions cs
            JOIN classes c ON cs.class_id = c.id
            WHERE c.teacher_id = ? AND DATE(cs.session_date) BETWEEN ? AND ?
          `, [teacherId, weekStart.toISOString().split('T')[0], weekEnd.toISOString().split('T')[0]], (err, result) => {
            if (err) reject(err);
            else resolve(result.count);
          });
        }),
        
        // 教授的学员总数
        new Promise((resolve, reject) => {
          db.get(`
            SELECT COUNT(DISTINCT sc.student_id) as count FROM student_courses sc
            JOIN classes c ON sc.class_id = c.id
            WHERE c.teacher_id = ? AND sc.status = 'active'
          `, [teacherId], (err, result) => {
            if (err) reject(err);
            else resolve(result.count);
          });
        }),
        
        // 待点评的课程数
        new Promise((resolve, reject) => {
          db.get(`
            SELECT COUNT(*) as count FROM class_sessions cs
            JOIN classes c ON cs.class_id = c.id
            LEFT JOIN student_evaluations e ON cs.id = e.session_id
            WHERE c.teacher_id = ? AND cs.status = 'completed' AND e.id IS NULL
          `, [teacherId], (err, result) => {
            if (err) reject(err);
            else resolve(result.count);
          });
        })
      ]).then(([todayClasses, weekClasses, totalStudents, pendingEvaluations]) => {
        res.json({
          stats: {
            todayClasses,
            weekClasses,
            totalStudents,
            pendingEvaluations
          }
        });
      }).catch(err => {
        console.error('获取教师统计数据失败:', err);
        res.status(500).json({ error: '获取统计数据失败' });
      });
    });
  });

  // 获取教师的课程安排
  app.get('/api/teacher/sessions', authenticateToken, (req, res) => {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: '权限不足' });
    }

    // 获取当前教师的ID
    db.get('SELECT id FROM teachers WHERE user_id = ?', [req.user.id], (err, teacher) => {
      if (err) {
        return res.status(500).json({ error: '获取教师信息失败' });
      }

      if (!teacher) {
        return res.status(404).json({ error: '教师信息不存在' });
      }

      const { page = 1, limit = 20, status, date_from, date_to } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT cs.*, c.name as class_name, co.name as course_name
        FROM class_sessions cs
        JOIN classes c ON cs.class_id = c.id
        JOIN courses co ON c.course_id = co.id
        WHERE c.teacher_id = ?
      `;
      const params = [teacher.id];

      if (status) {
        query += ' AND cs.status = ?';
        params.push(status);
      }

      if (date_from) {
        query += ' AND DATE(cs.session_date) >= ?';
        params.push(date_from);
      }

      if (date_to) {
        query += ' AND DATE(cs.session_date) <= ?';
        params.push(date_to);
      }

      query += ' ORDER BY cs.session_date DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      db.all(query, params, (err, sessions) => {
        if (err) {
          return res.status(500).json({ error: '获取课程安排失败' });
        }

        res.json({ sessions });
      });
    });
  });

  // 获取教师的点评记录
  app.get('/api/teacher/evaluations', authenticateToken, (req, res) => {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: '权限不足' });
    }

    // 获取当前教师的ID
    db.get('SELECT id FROM teachers WHERE user_id = ?', [req.user.id], (err, teacher) => {
      if (err) {
        return res.status(500).json({ error: '获取教师信息失败' });
      }

      if (!teacher) {
        return res.status(404).json({ error: '教师信息不存在' });
      }

      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      db.all(`
        SELECT e.*, s.name as student_name, cs.session_date, c.name as class_name, co.name as course_name
        FROM student_evaluations e
        JOIN students s ON e.student_id = s.id
        JOIN class_sessions cs ON e.session_id = cs.id
        JOIN classes c ON cs.class_id = c.id
        JOIN courses co ON c.course_id = co.id
        WHERE c.teacher_id = ?
        ORDER BY e.created_at DESC
        LIMIT ? OFFSET ?
      `, [teacher.id, parseInt(limit), parseInt(offset)], (err, evaluations) => {
        if (err) {
          return res.status(500).json({ error: '获取点评记录失败' });
        }

        res.json({ evaluations });
      });
    });
  });

  // 获取教师的通知
  app.get('/api/teacher/notifications', authenticateToken, (req, res) => {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: '权限不足' });
    }

    // 获取当前教师的ID
    db.get('SELECT id FROM teachers WHERE user_id = ?', [req.user.id], (err, teacher) => {
      if (err) {
        return res.status(500).json({ error: '获取教师信息失败' });
      }

      if (!teacher) {
        return res.status(404).json({ error: '教师信息不存在' });
      }

      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      // 获取教师相关的通知
      db.all(`
        SELECT * FROM notifications 
        WHERE (recipient_type = 'teacher' AND recipient_id = ?) 
           OR (recipient_type = 'all') 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `, [teacher.id, parseInt(limit), parseInt(offset)], (err, notifications) => {
        if (err) {
          return res.status(500).json({ error: '获取通知失败' });
        }

        res.json({ 
          notifications,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: notifications.length,
            pages: Math.ceil(notifications.length / limit)
          }
        });
      });
    });
  });
};
