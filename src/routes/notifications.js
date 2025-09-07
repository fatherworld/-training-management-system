const moment = require('moment');

module.exports = (app, db, authenticateToken) => {
  // 获取所有通知记录
  app.get('/api/notifications', authenticateToken, (req, res) => {
    const { page = 1, limit = 20, type, status, recipient_type } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM notifications WHERE 1=1';
    const params = [];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (recipient_type) {
      query += ' AND recipient_type = ?';
      params.push(recipient_type);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    db.all(query, params, (err, notifications) => {
      if (err) {
        return res.status(500).json({ error: '获取通知记录失败' });
      }

      // 获取总数
      let countQuery = 'SELECT COUNT(*) as total FROM notifications WHERE 1=1';
      const countParams = [];

      if (type) {
        countQuery += ' AND type = ?';
        countParams.push(type);
      }

      if (status) {
        countQuery += ' AND status = ?';
        countParams.push(status);
      }

      if (recipient_type) {
        countQuery += ' AND recipient_type = ?';
        countParams.push(recipient_type);
      }

      db.get(countQuery, countParams, (err, count) => {
        if (err) {
          return res.status(500).json({ error: '获取通知记录总数失败' });
        }

        res.json({
          notifications,
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

  // 创建通知
  app.post('/api/notifications', authenticateToken, (req, res) => {
    const { type, recipient_type, recipient_id, title, message, send_time } = req.body;

    if (!type || !recipient_type || !title || !message) {
      return res.status(400).json({ error: '通知类型、接收者类型、标题和消息不能为空' });
    }

    // 对于"all"类型的通知，recipient_id可以为0或null
    if (recipient_type !== 'all' && !recipient_id) {
      return res.status(400).json({ error: '请选择接收者' });
    }

    const actualSendTime = send_time || new Date();

    db.run(
      `INSERT INTO notifications (type, recipient_type, recipient_id, title, message, send_time, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [type, recipient_type, recipient_id, title, message, actualSendTime],
      function(err) {
        if (err) {
          return res.status(500).json({ error: '创建通知失败' });
        }

        res.status(201).json({
          message: '通知创建成功',
          notification: {
            id: this.lastID,
            type,
            recipient_type,
            recipient_id,
            title,
            message,
            send_time: actualSendTime,
            status: 'pending'
          }
        });
      }
    );
  });

  // 更新通知状态
  app.put('/api/notifications/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { status, send_time } = req.body;

    if (!status) {
      return res.status(400).json({ error: '状态不能为空' });
    }

    let updateQuery = 'UPDATE notifications SET status = ?';
    let params = [status];

    if (send_time) {
      updateQuery += ', send_time = ?';
      params.push(send_time);
    }

    updateQuery += ' WHERE id = ?';
    params.push(id);

    db.run(updateQuery, params, function(err) {
      if (err) {
        return res.status(500).json({ error: '更新通知状态失败' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: '通知不存在' });
      }

      res.json({ message: '通知状态更新成功' });
    });
  });

  // 删除通知
  app.delete('/api/notifications/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM notifications WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: '删除通知失败' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: '通知不存在' });
      }

      res.json({ message: '通知删除成功' });
    });
  });

  // 发送上课提醒
  app.post('/api/notifications/class-reminder', authenticateToken, (req, res) => {
    const { class_id, reminder_time } = req.body;

    if (!class_id) {
      return res.status(400).json({ error: '班级ID不能为空' });
    }

    // 获取班级信息和学员
    db.get(`
      SELECT c.*, co.name as course_name, t.name as teacher_name
      FROM classes c
      JOIN courses co ON c.course_id = co.id
      JOIN teachers t ON c.teacher_id = t.id
      WHERE c.id = ?
    `, [class_id], (err, classInfo) => {
      if (err) {
        return res.status(500).json({ error: '获取班级信息失败' });
      }

      if (!classInfo) {
        return res.status(404).json({ error: '班级不存在' });
      }

      // 获取今日该班级的课程
      const today = moment().format('YYYY-MM-DD');
      db.get(`
        SELECT * FROM class_sessions 
        WHERE class_id = ? AND DATE(session_date) = ? AND status = 'scheduled'
        ORDER BY session_date ASC LIMIT 1
      `, [class_id, today], (err, session) => {
        if (err) {
          return res.status(500).json({ error: '获取课程信息失败' });
        }

        if (!session) {
          return res.status(404).json({ error: '今日没有该班级的课程安排' });
        }

        // 获取班级学员
        db.all(`
          SELECT s.id, s.name, s.phone 
          FROM students s
          JOIN student_courses sc ON s.id = sc.student_id
          WHERE sc.class_id = ? AND sc.status = 'active'
        `, [class_id], (err, students) => {
          if (err) {
            return res.status(500).json({ error: '获取学员列表失败' });
          }

          // 为每个学员创建上课提醒
          const sessionTime = moment(session.session_date).format('HH:mm');
          const reminderDate = reminder_time || new Date();

          students.forEach(student => {
            db.run(`
              INSERT INTO notifications (type, recipient_type, recipient_id, title, message, send_time, status)
              VALUES ('class_reminder', 'student', ?, '上课提醒', ?, ?, 'pending')
            `, [
              student.id,
              `您好 ${student.name}，您今天 ${sessionTime} 有 ${classInfo.course_name} 课程，请准时参加。地址：培训中心`,
              reminderDate
            ]);
          });

          // 为教师创建上课提醒
          db.run(`
            INSERT INTO notifications (type, recipient_type, recipient_id, title, message, send_time, status)
            VALUES ('class_reminder', 'teacher', ?, '上课提醒', ?, ?, 'pending')
          `, [
            classInfo.teacher_id,
            `您今天 ${sessionTime} 有 ${classInfo.name} 课程，共 ${students.length} 名学员。`,
            reminderDate
          ]);

          res.json({ 
            message: `成功创建 ${students.length + 1} 条上课提醒通知`,
            students_count: students.length,
            session_time: sessionTime
          });
        });
      });
    });
  });

  // 发送点名提醒
  app.post('/api/notifications/attendance-reminder', authenticateToken, (req, res) => {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: '课程ID不能为空' });
    }

    // 获取课程信息
    db.get(`
      SELECT cs.*, c.name as class_name, co.name as course_name, t.name as teacher_name
      FROM class_sessions cs
      JOIN classes c ON cs.class_id = c.id
      JOIN courses co ON c.course_id = co.id
      JOIN teachers t ON c.teacher_id = t.id
      WHERE cs.id = ?
    `, [session_id], (err, session) => {
      if (err) {
        return res.status(500).json({ error: '获取课程信息失败' });
      }

      if (!session) {
        return res.status(404).json({ error: '课程不存在' });
      }

      // 检查是否已经点名
      if (session.attendance) {
        return res.status(400).json({ error: '该课程已完成点名' });
      }

      // 检查课程是否已开始
      const now = new Date();
      const sessionTime = new Date(session.session_date);
      if (now < sessionTime) {
        return res.status(400).json({ error: '课程尚未开始，无法发送点名提醒' });
      }

      // 发送点名提醒给教师
      db.run(`
        INSERT INTO notifications (type, recipient_type, recipient_id, title, message, send_time, status)
        VALUES ('attendance_reminder', 'teacher', ?, '点名提醒', ?, ?, 'pending')
      `, [
        session.teacher_id,
        `请为 ${session.class_name} 课程进行点名签到。课程时间：${moment(session.session_date).format('YYYY-MM-DD HH:mm')}`,
        new Date()
      ], function(err) {
        if (err) {
          return res.status(500).json({ error: '发送点名提醒失败' });
        }

        res.json({ message: '点名提醒发送成功' });
      });
    });
  });

  // 获取待发送的通知
  app.get('/api/notifications/pending', authenticateToken, (req, res) => {
    const now = new Date();

    db.all(`
      SELECT * FROM notifications 
      WHERE status = 'pending' AND send_time <= ?
      ORDER BY send_time ASC
    `, [now], (err, notifications) => {
      if (err) {
        return res.status(500).json({ error: '获取待发送通知失败' });
      }

      res.json({ notifications });
    });
  });

  // 批量标记通知为已发送
  app.post('/api/notifications/mark-sent', authenticateToken, (req, res) => {
    const { notification_ids } = req.body;

    if (!notification_ids || !Array.isArray(notification_ids)) {
      return res.status(400).json({ error: '通知ID列表格式错误' });
    }

    if (notification_ids.length === 0) {
      return res.status(400).json({ error: '通知ID列表不能为空' });
    }

    const placeholders = notification_ids.map(() => '?').join(',');
    
    db.run(
      `UPDATE notifications SET status = 'sent' WHERE id IN (${placeholders})`,
      notification_ids,
      function(err) {
        if (err) {
          return res.status(500).json({ error: '批量更新通知状态失败' });
        }

        res.json({ 
          message: `成功标记 ${this.changes} 条通知为已发送`,
          updated_count: this.changes
        });
      }
    );
  });

  // 获取通知统计
  app.get('/api/notifications/stats', authenticateToken, (req, res) => {
    const queries = [
      'SELECT COUNT(*) as total FROM notifications',
      'SELECT COUNT(*) as pending FROM notifications WHERE status = "pending"',
      'SELECT COUNT(*) as sent FROM notifications WHERE status = "sent"',
      'SELECT COUNT(*) as failed FROM notifications WHERE status = "failed"',
      'SELECT type, COUNT(*) as count FROM notifications GROUP BY type'
    ];

    const stats = {};

    // 执行统计查询
    db.get(queries[0], [], (err, total) => {
      if (err) return res.status(500).json({ error: '获取通知统计失败' });
      stats.total = total.total;

      db.get(queries[1], [], (err, pending) => {
        if (err) return res.status(500).json({ error: '获取通知统计失败' });
        stats.pending = pending.pending;

        db.get(queries[2], [], (err, sent) => {
          if (err) return res.status(500).json({ error: '获取通知统计失败' });
          stats.sent = sent.sent;

          db.get(queries[3], [], (err, failed) => {
            if (err) return res.status(500).json({ error: '获取通知统计失败' });
            stats.failed = failed.failed;

            db.all(queries[4], [], (err, byType) => {
              if (err) return res.status(500).json({ error: '获取通知统计失败' });
              stats.by_type = byType;

              res.json({ stats });
            });
          });
        });
      });
    });
  });
};

