module.exports = (app, db, authenticateToken) => {
  console.log('加载教师API路由...');

  // 获取教师个人信息
  app.get('/api/teacher/me', authenticateToken, (req, res) => {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: '权限不足' });
    }

    console.log('查询教师信息，用户ID:', req.user.id);

    db.get('SELECT * FROM teachers WHERE user_id = ?', [req.user.id], (err, teacher) => {
      if (err) {
        console.error('查询教师信息失败:', err);
        return res.status(500).json({ error: '获取教师信息失败' });
      }

      console.log('查询结果:', teacher);

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

    console.log('获取教师仪表板统计，用户ID:', req.user.id);

    // 获取当前教师的ID
    db.get('SELECT id FROM teachers WHERE user_id = ?', [req.user.id], (err, teacher) => {
      if (err) {
        console.error('查询教师ID失败:', err);
        return res.status(500).json({ error: '获取教师信息失败' });
      }

      if (!teacher) {
        console.log('教师不存在，用户ID:', req.user.id);
        return res.status(404).json({ error: '教师信息不存在' });
      }

      const teacherId = teacher.id;
      console.log('教师ID:', teacherId);

      // 返回模拟统计数据
      const stats = {
        todayClasses: 0,
        weekClasses: 0,
        totalStudents: 0,
        pendingEvaluations: 0
      };

      res.json({ stats });
    });
  });

  // 获取教师的课程安排
  app.get('/api/teacher/sessions', authenticateToken, (req, res) => {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: '权限不足' });
    }

    console.log('获取教师课程安排，用户ID:', req.user.id);

    db.get('SELECT id FROM teachers WHERE user_id = ?', [req.user.id], (err, teacher) => {
      if (err) {
        return res.status(500).json({ error: '获取教师信息失败' });
      }

      if (!teacher) {
        return res.status(404).json({ error: '教师信息不存在' });
      }

      // 返回空的课程列表
      res.json({ 
        sessions: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 }
      });
    });
  });

  // 获取教师的通知
  app.get('/api/teacher/notifications', authenticateToken, (req, res) => {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: '权限不足' });
    }

    console.log('获取教师通知，用户ID:', req.user.id);

    db.get('SELECT id FROM teachers WHERE user_id = ?', [req.user.id], (err, teacher) => {
      if (err) {
        return res.status(500).json({ error: '获取教师信息失败' });
      }

      if (!teacher) {
        return res.status(404).json({ error: '教师信息不存在' });
      }

      // 返回空的通知列表
      res.json({ 
        notifications: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 }
      });
    });
  });

  console.log('✅ 教师API路由加载完成');
};


