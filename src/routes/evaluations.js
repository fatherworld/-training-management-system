module.exports = (app, db, authenticateToken) => {
  // 获取所有点评记录
  app.get('/api/evaluations', authenticateToken, (req, res) => {
    const { page = 1, limit = 20, student_id, session_id, rating_min, rating_max } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT e.*, s.name as student_name, cs.session_date, c.name as class_name, co.name as course_name
      FROM student_evaluations e
      JOIN students s ON e.student_id = s.id
      JOIN class_sessions cs ON e.session_id = cs.id
      JOIN classes c ON cs.class_id = c.id
      JOIN courses co ON c.course_id = co.id
      WHERE 1=1
    `;
    const params = [];

    if (student_id) {
      query += ' AND e.student_id = ?';
      params.push(student_id);
    }

    if (session_id) {
      query += ' AND e.session_id = ?';
      params.push(session_id);
    }

    if (rating_min) {
      query += ' AND e.rating >= ?';
      params.push(rating_min);
    }

    if (rating_max) {
      query += ' AND e.rating <= ?';
      params.push(rating_max);
    }

    query += ' ORDER BY e.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    db.all(query, params, (err, evaluations) => {
      if (err) {
        return res.status(500).json({ error: '获取点评记录失败' });
      }

      // 获取总数
      let countQuery = `
        SELECT COUNT(*) as total FROM student_evaluations e
        JOIN students s ON e.student_id = s.id
        JOIN class_sessions cs ON e.session_id = cs.id
        WHERE 1=1
      `;
      const countParams = [];

      if (student_id) {
        countQuery += ' AND e.student_id = ?';
        countParams.push(student_id);
      }

      if (session_id) {
        countQuery += ' AND e.session_id = ?';
        countParams.push(session_id);
      }

      if (rating_min) {
        countQuery += ' AND e.rating >= ?';
        countParams.push(rating_min);
      }

      if (rating_max) {
        countQuery += ' AND e.rating <= ?';
        countParams.push(rating_max);
      }

      db.get(countQuery, countParams, (err, count) => {
        if (err) {
          return res.status(500).json({ error: '获取点评记录总数失败' });
        }

        res.json({
          evaluations,
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

  // 获取单个点评记录详情
  app.get('/api/evaluations/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.get(`
      SELECT e.*, s.name as student_name, s.phone as student_phone, 
             cs.session_date, c.name as class_name, co.name as course_name, t.name as teacher_name
      FROM student_evaluations e
      JOIN students s ON e.student_id = s.id
      JOIN class_sessions cs ON e.session_id = cs.id
      JOIN classes c ON cs.class_id = c.id
      JOIN courses co ON c.course_id = co.id
      JOIN teachers t ON c.teacher_id = t.id
      WHERE e.id = ?
    `, [id], (err, evaluation) => {
      if (err) {
        return res.status(500).json({ error: '获取点评记录失败' });
      }

      if (!evaluation) {
        return res.status(404).json({ error: '点评记录不存在' });
      }

      res.json({ evaluation });
    });
  });

  // 创建点评记录
  app.post('/api/evaluations', authenticateToken, (req, res) => {
    const { student_id, session_id, rating, strengths, improvements, homework, teacher_notes } = req.body;

    if (!student_id || !session_id || !rating) {
      return res.status(400).json({ error: '学员ID、课程ID和评分不能为空' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: '评分必须在1-5之间' });
    }

    // 检查是否已经存在该学员该课程的点评
    db.get('SELECT * FROM student_evaluations WHERE student_id = ? AND session_id = ?', 
      [student_id, session_id], (err, existing) => {
      if (err) {
        return res.status(500).json({ error: '检查点评记录失败' });
      }

      if (existing) {
        return res.status(400).json({ error: '该学员该课程的点评已存在' });
      }

      db.run(
        `INSERT INTO student_evaluations (student_id, session_id, rating, strengths, improvements, homework, teacher_notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [student_id, session_id, rating, strengths, improvements, homework, teacher_notes],
        function(err) {
          if (err) {
            return res.status(500).json({ error: '创建点评记录失败' });
          }

          // 发送点评通知给学员
          db.get('SELECT s.name, s.phone FROM students s WHERE s.id = ?', [student_id], (err, student) => {
            if (!err && student) {
              db.run(`
                INSERT INTO notifications (type, recipient_type, recipient_id, title, message, send_time, status)
                VALUES ('evaluation_created', 'student', ?, '课后点评', ?, ?, 'pending')
              `, [
                student_id,
                `您好 ${student.name}，老师已为您的课程进行了点评，评分：${rating}分。`,
                new Date()
              ]);
            }
          });

          res.status(201).json({
            message: '点评记录创建成功',
            evaluation: {
              id: this.lastID,
              student_id,
              session_id,
              rating,
              strengths,
              improvements,
              homework,
              teacher_notes
            }
          });
        }
      );
    });
  });

  // 更新点评记录
  app.put('/api/evaluations/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { rating, strengths, improvements, homework, teacher_notes } = req.body;

    if (!rating) {
      return res.status(400).json({ error: '评分不能为空' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: '评分必须在1-5之间' });
    }

    db.run(
      `UPDATE student_evaluations SET rating = ?, strengths = ?, improvements = ?, homework = ?, teacher_notes = ? 
       WHERE id = ?`,
      [rating, strengths, improvements, homework, teacher_notes, id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: '更新点评记录失败' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: '点评记录不存在' });
        }

        res.json({ message: '点评记录更新成功' });
      }
    );
  });

  // 删除点评记录
  app.delete('/api/evaluations/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM student_evaluations WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: '删除点评记录失败' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: '点评记录不存在' });
      }

      res.json({ message: '点评记录删除成功' });
    });
  });

  // 获取学员的所有点评记录
  app.get('/api/students/:student_id/evaluations', authenticateToken, (req, res) => {
    const { student_id } = req.params;
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
    `, [student_id, parseInt(limit), parseInt(offset)], (err, evaluations) => {
      if (err) {
        return res.status(500).json({ error: '获取学员点评记录失败' });
      }

      // 获取总数
      db.get('SELECT COUNT(*) as total FROM student_evaluations WHERE student_id = ?', 
        [student_id], (err, count) => {
        if (err) {
          return res.status(500).json({ error: '获取学员点评记录总数失败' });
        }

        res.json({
          evaluations,
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

  // 批量创建点评记录（为一个课程的所有出勤学员创建点评）
  app.post('/api/sessions/:session_id/evaluations/batch', authenticateToken, (req, res) => {
    const { session_id } = req.params;
    const { evaluations } = req.body;

    if (!evaluations || !Array.isArray(evaluations)) {
      return res.status(400).json({ error: '点评数据格式错误' });
    }

    // 验证所有评分
    for (let evaluation of evaluations) {
      if (!evaluation.student_id || !evaluation.rating) {
        return res.status(400).json({ error: '学员ID和评分不能为空' });
      }
      if (evaluation.rating < 1 || evaluation.rating > 5) {
        return res.status(400).json({ error: '评分必须在1-5之间' });
      }
    }

    const stmt = db.prepare(`
      INSERT INTO student_evaluations (student_id, session_id, rating, strengths, improvements, homework, teacher_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      evaluations.forEach(evaluation => {
        stmt.run([
          evaluation.student_id,
          session_id,
          evaluation.rating,
          evaluation.strengths || '',
          evaluation.improvements || '',
          evaluation.homework || '',
          evaluation.teacher_notes || ''
        ]);
      });
      
      stmt.finalize();
      
      db.run('COMMIT', (err) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: '批量创建点评记录失败' });
        }
        
        res.json({ message: `成功创建 ${evaluations.length} 条点评记录` });
      });
    });
  });
};

