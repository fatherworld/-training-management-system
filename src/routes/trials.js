module.exports = (app, db, authenticateToken) => {
  // 获取所有试听记录
  app.get('/api/trials', authenticateToken, (req, res) => {
    const { page = 1, limit = 20, search, status, class_id } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT t.*, c.name as class_name, co.name as course_name, te.name as teacher_name
      FROM trial_classes t
      LEFT JOIN classes c ON t.class_id = c.id
      LEFT JOIN courses co ON c.course_id = co.id
      LEFT JOIN teachers te ON c.teacher_id = te.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (t.student_name LIKE ? OR t.student_phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    if (class_id) {
      query += ' AND t.class_id = ?';
      params.push(class_id);
    }

    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    db.all(query, params, (err, trials) => {
      if (err) {
        return res.status(500).json({ error: '获取试听记录失败' });
      }

      // 获取总数
      let countQuery = 'SELECT COUNT(*) as total FROM trial_classes t WHERE 1=1';
      const countParams = [];

      if (search) {
        countQuery += ' AND (t.student_name LIKE ? OR t.student_phone LIKE ?)';
        countParams.push(`%${search}%`, `%${search}%`);
      }

      if (status) {
        countQuery += ' AND t.status = ?';
        countParams.push(status);
      }

      if (class_id) {
        countQuery += ' AND t.class_id = ?';
        countParams.push(class_id);
      }

      db.get(countQuery, countParams, (err, count) => {
        if (err) {
          return res.status(500).json({ error: '获取试听记录总数失败' });
        }

        res.json({
          trials,
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

  // 获取单个试听记录详情
  app.get('/api/trials/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.get(`
      SELECT t.*, c.name as class_name, co.name as course_name, te.name as teacher_name
      FROM trial_classes t
      LEFT JOIN classes c ON t.class_id = c.id
      LEFT JOIN courses co ON c.course_id = co.id
      LEFT JOIN teachers te ON c.teacher_id = te.id
      WHERE t.id = ?
    `, [id], (err, trial) => {
      if (err) {
        return res.status(500).json({ error: '获取试听记录失败' });
      }

      if (!trial) {
        return res.status(404).json({ error: '试听记录不存在' });
      }

      res.json({ trial });
    });
  });

  // 创建试听预约
  app.post('/api/trials', authenticateToken, (req, res) => {
    const { student_id, student_name, student_phone, class_id, trial_date, status, feedback } = req.body;

    // 支持两种方式：通过student_id或直接提供student_name和student_phone
    if (student_id) {
      // 通过student_id获取学员信息
      if (!class_id || !trial_date) {
        return res.status(400).json({ error: '班级和试听时间不能为空' });
      }

      db.get('SELECT * FROM students WHERE id = ?', [student_id], (err, student) => {
        if (err) {
          return res.status(500).json({ error: '获取学员信息失败' });
        }

        if (!student) {
          return res.status(404).json({ error: '学员不存在' });
        }

        createTrialRecord(student.name, student.phone, class_id, trial_date, status || 'scheduled', feedback);
      });
    } else {
      // 直接使用提供的学员信息
      if (!student_name || !student_phone || !class_id || !trial_date) {
        return res.status(400).json({ error: '学员姓名、电话、班级和试听时间不能为空' });
      }

      createTrialRecord(student_name, student_phone, class_id, trial_date, status || 'scheduled', feedback);
    }

    function createTrialRecord(name, phone, classId, trialDate, trialStatus, trialFeedback) {
      // 检查是否已经预约过同一班级
      db.get(
        'SELECT * FROM trial_classes WHERE student_phone = ? AND class_id = ? AND status != "cancelled"',
        [phone, classId],
        (err, existing) => {
          if (err) {
            return res.status(500).json({ error: '检查试听预约失败' });
          }

          if (existing) {
            return res.status(400).json({ error: '该学员已预约过此班级的试听' });
          }

          db.run(
            'INSERT INTO trial_classes (student_name, student_phone, class_id, trial_date, status, feedback) VALUES (?, ?, ?, ?, ?, ?)',
            [name, phone, classId, trialDate, trialStatus, trialFeedback],
            function(err) {
              if (err) {
                return res.status(500).json({ error: '创建试听预约失败' });
              }

              // 创建试听提醒通知
              db.run(`
                INSERT INTO notifications (type, recipient_type, recipient_id, title, message, send_time, status)
                VALUES ('trial_reminder', 'phone', ?, '试听提醒', ?, ?, 'pending')
              `, [
                phone,
                `您好 ${name}，您预约的试听课程将在 ${trialDate} 开始，请准时参加。`,
                new Date(new Date(trialDate).getTime() - 24 * 60 * 60 * 1000) // 提前一天提醒
              ]);

              res.status(201).json({
                message: '试听预约创建成功',
                trial: {
                  id: this.lastID,
                  student_name: name,
                  student_phone: phone,
                  class_id: classId,
                  trial_date: trialDate,
                  status: trialStatus,
                  feedback: trialFeedback
                }
              });
            }
          );
        }
      );
    }
  });

  // 更新试听记录
  app.put('/api/trials/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { student_id, student_name, student_phone, class_id, trial_date, status, feedback, result } = req.body;

    // 支持两种方式：通过student_id或直接提供student_name和student_phone
    if (student_id) {
      // 通过student_id获取学员信息
      if (!class_id || !trial_date) {
        return res.status(400).json({ error: '班级和试听时间不能为空' });
      }

      db.get('SELECT * FROM students WHERE id = ?', [student_id], (err, student) => {
        if (err) {
          return res.status(500).json({ error: '获取学员信息失败' });
        }

        if (!student) {
          return res.status(404).json({ error: '学员不存在' });
        }

        updateTrialRecord(student.name, student.phone, class_id, trial_date, status, feedback, result);
      });
    } else {
      // 直接使用提供的学员信息
      if (!student_name || !student_phone || !class_id || !trial_date) {
        return res.status(400).json({ error: '学员姓名、电话、班级和试听时间不能为空' });
      }

      updateTrialRecord(student_name, student_phone, class_id, trial_date, status, feedback, result);
    }

    function updateTrialRecord(name, phone, classId, trialDate, trialStatus, trialFeedback, trialResult) {
      db.run(
        `UPDATE trial_classes SET student_name = ?, student_phone = ?, class_id = ?, 
         trial_date = ?, status = ?, feedback = ?, result = ? WHERE id = ?`,
        [name, phone, classId, trialDate, trialStatus, trialFeedback, trialResult, id],
        function(err) {
          if (err) {
            return res.status(500).json({ error: '更新试听记录失败' });
          }

          if (this.changes === 0) {
            return res.status(404).json({ error: '试听记录不存在' });
          }

          res.json({ message: '试听记录更新成功' });
        }
      );
    }
  });

  // 删除试听记录
  app.delete('/api/trials/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM trial_classes WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: '删除试听记录失败' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: '试听记录不存在' });
      }

      res.json({ message: '试听记录删除成功' });
    });
  });

  // 试听转正式报名
  app.post('/api/trials/:id/convert', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { total_hours } = req.body;

    if (!total_hours) {
      return res.status(400).json({ error: '总课时不能为空' });
    }

    // 获取试听记录
    db.get('SELECT * FROM trial_classes WHERE id = ?', [id], (err, trial) => {
      if (err) {
        return res.status(500).json({ error: '获取试听记录失败' });
      }

      if (!trial) {
        return res.status(404).json({ error: '试听记录不存在' });
      }

      if (trial.status !== 'completed' || trial.result !== 'interested') {
        return res.status(400).json({ error: '只有已完成且有意向的试听才能转为正式报名' });
      }

      // 检查是否已经存在该学员
      db.get('SELECT * FROM students WHERE phone = ?', [trial.student_phone], (err, student) => {
        if (err) {
          return res.status(500).json({ error: '检查学员信息失败' });
        }

        const processEnrollment = (studentId) => {
          // 检查是否已经报名
          db.get('SELECT * FROM student_courses WHERE student_id = ? AND class_id = ?', 
            [studentId, trial.class_id], (err, existing) => {
            if (err) {
              return res.status(500).json({ error: '检查报名状态失败' });
            }

            if (existing) {
              return res.status(400).json({ error: '学员已报名该班级' });
            }

            // 创建报名记录
            db.run(
              'INSERT INTO student_courses (student_id, class_id, total_hours, remaining_hours) VALUES (?, ?, ?, ?)',
              [studentId, trial.class_id, total_hours, total_hours],
              function(err) {
                if (err) {
                  return res.status(500).json({ error: '创建报名记录失败' });
                }

                // 更新班级人数
                db.run('UPDATE classes SET current_students = current_students + 1 WHERE id = ?', [trial.class_id]);

                // 更新试听记录状态
                db.run('UPDATE trial_classes SET result = "enrolled" WHERE id = ?', [id]);

                res.json({ message: '试听转正式报名成功' });
              }
            );
          });
        };

        if (student) {
          // 学员已存在，直接报名
          processEnrollment(student.id);
        } else {
          // 创建新学员
          db.run(
            'INSERT INTO students (name, phone) VALUES (?, ?)',
            [trial.student_name, trial.student_phone],
            function(err) {
              if (err) {
                return res.status(500).json({ error: '创建学员失败' });
              }

              processEnrollment(this.lastID);
            }
          );
        }
      });
    });
  });
};

