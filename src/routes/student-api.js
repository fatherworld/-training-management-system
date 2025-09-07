module.exports = (app, db, authenticateToken) => {
  // 获取学员个人信息
  app.get('/api/student/me', authenticateToken, (req, res) => {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: '权限不足' });
    }

    db.get('SELECT * FROM students WHERE user_id = ?', [req.user.id], (err, student) => {
      if (err) {
        return res.status(500).json({ error: '获取学员信息失败' });
      }

      if (!student) {
        return res.status(404).json({ error: '学员信息不存在' });
      }

      res.json({ student });
    });
  });

  // 获取学员仪表板统计数据
  app.get('/api/student/dashboard-stats', authenticateToken, (req, res) => {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: '权限不足' });
    }

    // 获取当前学员的ID
    db.get('SELECT * FROM students WHERE user_id = ?', [req.user.id], (err, student) => {
      if (err) {
        return res.status(500).json({ error: '获取学员信息失败' });
      }

      if (!student) {
        return res.status(404).json({ error: '学员信息不存在' });
      }

      const studentId = student.id;

      // 并行执行多个查询
      Promise.all([
        // 报名课程总数
        new Promise((resolve, reject) => {
          db.get(`
            SELECT COUNT(*) as count FROM student_courses sc
            WHERE sc.student_id = ? AND sc.status = 'active'
          `, [studentId], (err, result) => {
            if (err) reject(err);
            else resolve(result.count);
          });
        }),
        
        // 已完成的课时数
        new Promise((resolve, reject) => {
          db.get(`
            SELECT COUNT(*) as count FROM class_sessions cs
            JOIN classes c ON cs.class_id = c.id
            JOIN student_courses sc ON sc.class_id = c.id
            WHERE sc.student_id = ? AND cs.status = 'completed'
          `, [studentId], (err, result) => {
            if (err) reject(err);
            else resolve(result.count);
          });
        }),
        
        // 剩余课时总数
        new Promise((resolve, reject) => {
          db.get(`
            SELECT SUM(sc.remaining_hours) as total FROM student_courses sc
            WHERE sc.student_id = ? AND sc.status = 'active'
          `, [studentId], (err, result) => {
            if (err) reject(err);
            else resolve(result.total || 0);
          });
        }),
        
        // 平均评分
        new Promise((resolve, reject) => {
          db.get(`
            SELECT AVG(e.rating) as average FROM student_evaluations e
            WHERE e.student_id = ?
          `, [studentId], (err, result) => {
            if (err) reject(err);
            else resolve(result.average || 0);
          });
        })
      ]).then(([totalCourses, completedSessions, remainingHours, averageRating]) => {
        res.json({
          stats: {
            totalCourses,
            completedSessions,
            remainingHours,
            averageRating: parseFloat(averageRating) || 0
          },
          student
        });
      }).catch(err => {
        console.error('获取学员统计数据失败:', err);
        res.status(500).json({ error: '获取统计数据失败' });
      });
    });
  });

  // 获取学员即将到来的课程
  app.get('/api/student/sessions', authenticateToken, (req, res) => {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: '权限不足' });
    }

    // 获取当前学员的ID
    db.get('SELECT id FROM students WHERE user_id = ?', [req.user.id], (err, student) => {
      if (err) {
        return res.status(500).json({ error: '获取学员信息失败' });
      }

      if (!student) {
        return res.status(404).json({ error: '学员信息不存在' });
      }

      const now = new Date().toISOString();

      db.all(`
        SELECT cs.*, c.name as class_name, co.name as course_name, t.name as teacher_name
        FROM class_sessions cs
        JOIN classes c ON cs.class_id = c.id
        JOIN courses co ON c.course_id = co.id
        JOIN teachers t ON c.teacher_id = t.id
        JOIN student_courses sc ON sc.class_id = c.id
        WHERE sc.student_id = ? AND cs.session_date >= ? AND sc.status = 'active'
        ORDER BY cs.session_date ASC
        LIMIT 10
      `, [student.id, now], (err, sessions) => {
        if (err) {
          return res.status(500).json({ error: '获取课程安排失败' });
        }

        res.json({ sessions });
      });
    });
  });

  // 获取学员最近的点评
  app.get('/api/student/evaluations', authenticateToken, (req, res) => {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: '权限不足' });
    }

    // 获取当前学员的ID
    db.get('SELECT id FROM students WHERE user_id = ?', [req.user.id], (err, student) => {
      if (err) {
        return res.status(500).json({ error: '获取学员信息失败' });
      }

      if (!student) {
        return res.status(404).json({ error: '学员信息不存在' });
      }

      db.all(`
        SELECT e.*, cs.session_date, c.name as class_name, co.name as course_name, t.name as teacher_name
        FROM student_evaluations e
        JOIN class_sessions cs ON e.session_id = cs.id
        JOIN classes c ON cs.class_id = c.id
        JOIN courses co ON c.course_id = co.id
        JOIN teachers t ON c.teacher_id = t.id
        WHERE e.student_id = ?
        ORDER BY e.created_at DESC
        LIMIT 10
      `, [student.id], (err, evaluations) => {
        if (err) {
          return res.status(500).json({ error: '获取点评记录失败' });
        }

        res.json({ evaluations });
      });
    });
  });

  // 获取学员的课程进度
  app.get('/api/student/courses', authenticateToken, (req, res) => {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: '权限不足' });
    }

    // 获取当前学员的ID
    db.get('SELECT id FROM students WHERE user_id = ?', [req.user.id], (err, student) => {
      if (err) {
        return res.status(500).json({ error: '获取学员信息失败' });
      }

      if (!student) {
        return res.status(404).json({ error: '学员信息不存在' });
      }

      db.all(`
        SELECT sc.*, c.name as class_name, co.name as course_name,
               (sc.total_hours - sc.remaining_hours) as completed_hours
        FROM student_courses sc
        JOIN classes c ON sc.class_id = c.id
        JOIN courses co ON c.course_id = co.id
        WHERE sc.student_id = ? AND sc.status = 'active'
        ORDER BY sc.enrollment_date DESC
      `, [student.id], (err, courses) => {
        if (err) {
          return res.status(500).json({ error: '获取课程进度失败' });
        }

        res.json({ courses });
      });
    });
  });

  // 获取学员的所有课程
  app.get('/api/student/my-courses', authenticateToken, (req, res) => {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: '权限不足' });
    }

    // 获取当前学员的ID
    db.get('SELECT id FROM students WHERE user_id = ?', [req.user.id], (err, student) => {
      if (err) {
        return res.status(500).json({ error: '获取学员信息失败' });
      }

      if (!student) {
        return res.status(404).json({ error: '学员信息不存在' });
      }

      const { page = 1, limit = 20, status } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT cs.*, c.name as class_name, co.name as course_name, t.name as teacher_name
        FROM class_sessions cs
        JOIN classes c ON cs.class_id = c.id
        JOIN courses co ON c.course_id = co.id
        JOIN teachers t ON c.teacher_id = t.id
        JOIN student_courses sc ON sc.class_id = c.id
        WHERE sc.student_id = ? AND sc.status = 'active'
      `;
      const params = [student.id];

      if (status) {
        query += ' AND cs.status = ?';
        params.push(status);
      }

      query += ' ORDER BY cs.session_date DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      db.all(query, params, (err, sessions) => {
        if (err) {
          return res.status(500).json({ error: '获取课程列表失败' });
        }

        res.json({ sessions });
      });
    });
  });

  // 获取学员的所有点评
  app.get('/api/student/my-evaluations', authenticateToken, (req, res) => {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: '权限不足' });
    }

    // 获取当前学员的ID
    db.get('SELECT id FROM students WHERE user_id = ?', [req.user.id], (err, student) => {
      if (err) {
        return res.status(500).json({ error: '获取学员信息失败' });
      }

      if (!student) {
        return res.status(404).json({ error: '学员信息不存在' });
      }

      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      db.all(`
        SELECT e.*, cs.session_date, c.name as class_name, co.name as course_name, t.name as teacher_name
        FROM student_evaluations e
        JOIN class_sessions cs ON e.session_id = cs.id
        JOIN classes c ON cs.class_id = c.id
        JOIN courses co ON c.course_id = co.id
        JOIN teachers t ON c.teacher_id = t.id
        WHERE e.student_id = ?
        ORDER BY e.created_at DESC
        LIMIT ? OFFSET ?
      `, [student.id, parseInt(limit), parseInt(offset)], (err, evaluations) => {
        if (err) {
          return res.status(500).json({ error: '获取点评记录失败' });
        }

        res.json({ evaluations });
      });
    });
  });

  // 获取学员的通知
  app.get('/api/student/notifications', authenticateToken, (req, res) => {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: '权限不足' });
    }

    // 获取当前学员的ID
    db.get('SELECT id FROM students WHERE user_id = ?', [req.user.id], (err, student) => {
      if (err) {
        return res.status(500).json({ error: '获取学员信息失败' });
      }

      if (!student) {
        return res.status(404).json({ error: '学员信息不存在' });
      }

      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      // 获取学员相关的通知
      db.all(`
        SELECT * FROM notifications 
        WHERE (recipient_type = 'student' AND recipient_id = ?) 
           OR (recipient_type = 'all') 
           OR (recipient_type = 'class' AND recipient_id IN (
             SELECT class_id FROM student_courses WHERE student_id = ? AND status = 'active'
           ))
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `, [student.id, student.id, parseInt(limit), parseInt(offset)], (err, notifications) => {
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
