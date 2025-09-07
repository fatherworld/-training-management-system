const moment = require('moment');

module.exports = (app, db, authenticateToken) => {
  // 获取仪表板统计数据
  app.get('/api/analytics/dashboard', authenticateToken, (req, res) => {
    const queries = {
      // 基础统计
      totalStudents: 'SELECT COUNT(*) as count FROM students WHERE status = "active"',
      totalTeachers: 'SELECT COUNT(*) as count FROM teachers WHERE status = "active"',
      totalCourses: 'SELECT COUNT(*) as count FROM courses WHERE status = "active"',
      totalClasses: 'SELECT COUNT(*) as count FROM classes WHERE status = "active"',
      
      // 今日统计
      todaySessions: `
        SELECT COUNT(*) as count FROM class_sessions 
        WHERE DATE(session_date) = DATE('now', 'localtime')
      `,
      todayTrials: `
        SELECT COUNT(*) as count FROM trial_classes 
        WHERE DATE(trial_date) = DATE('now', 'localtime')
      `,
      
      // 本月统计
      monthlyEnrollments: `
        SELECT COUNT(*) as count FROM student_courses 
        WHERE DATE(enrollment_date) >= DATE('now', 'start of month', 'localtime')
      `,
      monthlyRevenue: `
        SELECT SUM(co.price) as revenue
        FROM student_courses sc
        JOIN classes c ON sc.class_id = c.id
        JOIN courses co ON c.course_id = co.id
        WHERE DATE(sc.enrollment_date) >= DATE('now', 'start of month', 'localtime')
      `
    };

    const stats = {};
    const queryPromises = Object.keys(queries).map(key => {
      return new Promise((resolve, reject) => {
        db.get(queries[key], [], (err, result) => {
          if (err) {
            reject(err);
          } else {
            stats[key] = result.count || result.revenue || 0;
            resolve();
          }
        });
      });
    });

    Promise.all(queryPromises)
      .then(() => {
        res.json({ stats });
      })
      .catch(err => {
        res.status(500).json({ error: '获取仪表板数据失败' });
      });
  });

  // 获取学员数据分析
  app.get('/api/analytics/students', authenticateToken, (req, res) => {
    const { period = '30days' } = req.query;
    
    let dateCondition = '';
    switch (period) {
      case '7days':
        dateCondition = "DATE(enrollment_date) >= DATE('now', '-7 days', 'localtime')";
        break;
      case '30days':
        dateCondition = "DATE(enrollment_date) >= DATE('now', '-30 days', 'localtime')";
        break;
      case '3months':
        dateCondition = "DATE(enrollment_date) >= DATE('now', '-3 months', 'localtime')";
        break;
      case '1year':
        dateCondition = "DATE(enrollment_date) >= DATE('now', '-1 year', 'localtime')";
        break;
      default:
        dateCondition = '1=1';
    }

    const queries = {
      // 新增学员趋势
      enrollmentTrend: `
        SELECT DATE(enrollment_date) as date, COUNT(*) as count
        FROM students
        WHERE ${dateCondition}
        GROUP BY DATE(enrollment_date)
        ORDER BY date ASC
      `,
      
      // 学员状态分布
      statusDistribution: `
        SELECT status, COUNT(*) as count
        FROM students
        GROUP BY status
      `,
      
      // 年龄分布
      ageDistribution: `
        SELECT 
          CASE 
            WHEN age < 18 THEN '未成年'
            WHEN age BETWEEN 18 AND 25 THEN '18-25岁'
            WHEN age BETWEEN 26 AND 35 THEN '26-35岁'
            WHEN age BETWEEN 36 AND 45 THEN '36-45岁'
            WHEN age > 45 THEN '45岁以上'
            ELSE '未知'
          END as age_group,
          COUNT(*) as count
        FROM students
        WHERE age IS NOT NULL
        GROUP BY age_group
      `,
      
      // 课程报名统计
      courseEnrollments: `
        SELECT co.name as course_name, COUNT(sc.id) as enrollments
        FROM courses co
        LEFT JOIN classes c ON co.id = c.course_id
        LEFT JOIN student_courses sc ON c.id = sc.class_id
        WHERE ${dateCondition.replace('enrollment_date', 'sc.enrollment_date')}
        GROUP BY co.id, co.name
        ORDER BY enrollments DESC
      `
    };

    const analytics = {};
    const queryPromises = Object.keys(queries).map(key => {
      return new Promise((resolve, reject) => {
        db.all(queries[key], [], (err, results) => {
          if (err) {
            reject(err);
          } else {
            analytics[key] = results;
            resolve();
          }
        });
      });
    });

    Promise.all(queryPromises)
      .then(() => {
        res.json({ analytics });
      })
      .catch(err => {
        res.status(500).json({ error: '获取学员数据分析失败' });
      });
  });

  // 获取财务数据分析
  app.get('/api/analytics/financial', authenticateToken, (req, res) => {
    const { period = '30days' } = req.query;
    
    let dateCondition = '';
    switch (period) {
      case '7days':
        dateCondition = "DATE(sc.enrollment_date) >= DATE('now', '-7 days', 'localtime')";
        break;
      case '30days':
        dateCondition = "DATE(sc.enrollment_date) >= DATE('now', '-30 days', 'localtime')";
        break;
      case '3months':
        dateCondition = "DATE(sc.enrollment_date) >= DATE('now', '-3 months', 'localtime')";
        break;
      case '1year':
        dateCondition = "DATE(sc.enrollment_date) >= DATE('now', '-1 year', 'localtime')";
        break;
      default:
        dateCondition = '1=1';
    }

    const queries = {
      // 收入趋势
      revenueTrend: `
        SELECT DATE(sc.enrollment_date) as date, SUM(co.price) as revenue
        FROM student_courses sc
        JOIN classes c ON sc.class_id = c.id
        JOIN courses co ON c.course_id = co.id
        WHERE ${dateCondition}
        GROUP BY DATE(sc.enrollment_date)
        ORDER BY date ASC
      `,
      
      // 课程收入分布
      courseRevenue: `
        SELECT co.name as course_name, SUM(co.price) as revenue, COUNT(sc.id) as enrollments
        FROM courses co
        LEFT JOIN classes c ON co.id = c.course_id
        LEFT JOIN student_courses sc ON c.id = sc.class_id
        WHERE ${dateCondition}
        GROUP BY co.id, co.name
        ORDER BY revenue DESC
      `,
      
      // 教师收入统计
      teacherRevenue: `
        SELECT t.name as teacher_name, 
               COUNT(cs.id) as sessions_count,
               SUM(cs.duration * t.hourly_rate) as estimated_revenue
        FROM teachers t
        LEFT JOIN classes c ON t.id = c.teacher_id
        LEFT JOIN class_sessions cs ON c.id = cs.class_id
        WHERE cs.status = 'completed' AND ${dateCondition.replace('sc.enrollment_date', 'cs.session_date')}
        GROUP BY t.id, t.name
        ORDER BY estimated_revenue DESC
      `,
      
      // 月度财务汇总
      monthlyFinancial: `
        SELECT 
          strftime('%Y-%m', sc.enrollment_date) as month,
          SUM(co.price) as revenue,
          COUNT(sc.id) as enrollments,
          COUNT(DISTINCT sc.student_id) as unique_students
        FROM student_courses sc
        JOIN classes c ON sc.class_id = c.id
        JOIN courses co ON c.course_id = co.id
        WHERE ${dateCondition}
        GROUP BY strftime('%Y-%m', sc.enrollment_date)
        ORDER BY month ASC
      `
    };

    const analytics = {};
    const queryPromises = Object.keys(queries).map(key => {
      return new Promise((resolve, reject) => {
        db.all(queries[key], [], (err, results) => {
          if (err) {
            reject(err);
          } else {
            analytics[key] = results;
            resolve();
          }
        });
      });
    });

    Promise.all(queryPromises)
      .then(() => {
        res.json({ analytics });
      })
      .catch(err => {
        res.status(500).json({ error: '获取财务数据分析失败' });
      });
  });

  // 获取课程数据分析
  app.get('/api/analytics/courses', authenticateToken, (req, res) => {
    const queries = {
      // 课程受欢迎程度
      coursePopularity: `
        SELECT co.name as course_name, 
               COUNT(sc.id) as total_enrollments,
               COUNT(DISTINCT c.id) as class_count,
               AVG(c.current_students * 1.0 / c.max_students * 100) as avg_occupancy_rate
        FROM courses co
        LEFT JOIN classes c ON co.id = c.course_id
        LEFT JOIN student_courses sc ON c.id = sc.class_id
        GROUP BY co.id, co.name
        ORDER BY total_enrollments DESC
      `,
      
      // 试听转化率
      trialConversionRate: `
        SELECT co.name as course_name,
               COUNT(tc.id) as total_trials,
               COUNT(CASE WHEN tc.result = 'enrolled' THEN 1 END) as converted_trials,
               ROUND(COUNT(CASE WHEN tc.result = 'enrolled' THEN 1 END) * 100.0 / COUNT(tc.id), 2) as conversion_rate
        FROM courses co
        LEFT JOIN classes c ON co.id = c.course_id
        LEFT JOIN trial_classes tc ON c.id = tc.class_id
        GROUP BY co.id, co.name
        HAVING COUNT(tc.id) > 0
        ORDER BY conversion_rate DESC
      `,
      
      // 班级满员率
      classOccupancy: `
        SELECT c.name as class_name, co.name as course_name,
               c.current_students, c.max_students,
               ROUND(c.current_students * 100.0 / c.max_students, 2) as occupancy_rate
        FROM classes c
        JOIN courses co ON c.course_id = co.id
        WHERE c.status = 'active'
        ORDER BY occupancy_rate DESC
      `,
      
      // 课程完成率
      courseCompletionRate: `
        SELECT co.name as course_name,
               COUNT(DISTINCT sc.student_id) as total_students,
               COUNT(DISTINCT CASE WHEN sc.remaining_hours <= 0 THEN sc.student_id END) as completed_students,
               ROUND(COUNT(DISTINCT CASE WHEN sc.remaining_hours <= 0 THEN sc.student_id END) * 100.0 / COUNT(DISTINCT sc.student_id), 2) as completion_rate
        FROM courses co
        JOIN classes c ON co.id = c.course_id
        JOIN student_courses sc ON c.id = sc.class_id
        GROUP BY co.id, co.name
        ORDER BY completion_rate DESC
      `
    };

    const analytics = {};
    const queryPromises = Object.keys(queries).map(key => {
      return new Promise((resolve, reject) => {
        db.all(queries[key], [], (err, results) => {
          if (err) {
            reject(err);
          } else {
            analytics[key] = results;
            resolve();
          }
        });
      });
    });

    Promise.all(queryPromises)
      .then(() => {
        res.json({ analytics });
      })
      .catch(err => {
        res.status(500).json({ error: '获取课程数据分析失败' });
      });
  });

  // 获取教师数据分析
  app.get('/api/analytics/teachers', authenticateToken, (req, res) => {
    const queries = {
      // 教师工作量统计
      teacherWorkload: `
        SELECT t.name as teacher_name,
               COUNT(DISTINCT c.id) as class_count,
               COUNT(cs.id) as total_sessions,
               SUM(cs.duration) as total_hours,
               COUNT(CASE WHEN cs.status = 'completed' THEN 1 END) as completed_sessions
        FROM teachers t
        LEFT JOIN classes c ON t.id = c.teacher_id
        LEFT JOIN class_sessions cs ON c.id = cs.class_id
        GROUP BY t.id, t.name
        ORDER BY total_hours DESC
      `,
      
      // 教师学员评价
      teacherRatings: `
        SELECT t.name as teacher_name,
               COUNT(e.id) as total_evaluations,
               ROUND(AVG(e.rating), 2) as avg_rating,
               COUNT(CASE WHEN e.rating >= 4 THEN 1 END) as good_ratings,
               ROUND(COUNT(CASE WHEN e.rating >= 4 THEN 1 END) * 100.0 / COUNT(e.id), 2) as good_rating_rate
        FROM teachers t
        LEFT JOIN classes c ON t.id = c.teacher_id
        LEFT JOIN class_sessions cs ON c.id = cs.class_id
        LEFT JOIN student_evaluations e ON cs.id = e.session_id
        GROUP BY t.id, t.name
        HAVING COUNT(e.id) > 0
        ORDER BY avg_rating DESC
      `,
      
      // 教师出勤率
      teacherAttendance: `
        SELECT t.name as teacher_name,
               COUNT(cs.id) as scheduled_sessions,
               COUNT(CASE WHEN cs.status = 'completed' THEN 1 END) as completed_sessions,
               ROUND(COUNT(CASE WHEN cs.status = 'completed' THEN 1 END) * 100.0 / COUNT(cs.id), 2) as attendance_rate
        FROM teachers t
        LEFT JOIN classes c ON t.id = c.teacher_id
        LEFT JOIN class_sessions cs ON c.id = cs.class_id
        WHERE cs.session_date <= datetime('now', 'localtime')
        GROUP BY t.id, t.name
        HAVING COUNT(cs.id) > 0
        ORDER BY attendance_rate DESC
      `
    };

    const analytics = {};
    const queryPromises = Object.keys(queries).map(key => {
      return new Promise((resolve, reject) => {
        db.all(queries[key], [], (err, results) => {
          if (err) {
            reject(err);
          } else {
            analytics[key] = results;
            resolve();
          }
        });
      });
    });

    Promise.all(queryPromises)
      .then(() => {
        res.json({ analytics });
      })
      .catch(err => {
        res.status(500).json({ error: '获取教师数据分析失败' });
      });
  });

  // 获取运营数据分析
  app.get('/api/analytics/operations', authenticateToken, (req, res) => {
    const queries = {
      // 通知发送统计
      notificationStats: `
        SELECT type, status, COUNT(*) as count
        FROM notifications
        GROUP BY type, status
        ORDER BY type, status
      `,
      
      // 试听预约统计
      trialStats: `
        SELECT status, COUNT(*) as count
        FROM trial_classes
        GROUP BY status
      `,
      
      // 课程状态统计
      sessionStats: `
        SELECT status, COUNT(*) as count
        FROM class_sessions
        GROUP BY status
      `,
      
      // 学员课时剩余统计
      remainingHoursStats: `
        SELECT 
          CASE 
            WHEN remaining_hours <= 0 THEN '已用完'
            WHEN remaining_hours <= 5 THEN '1-5课时'
            WHEN remaining_hours <= 10 THEN '6-10课时'
            WHEN remaining_hours <= 20 THEN '11-20课时'
            ELSE '20+课时'
          END as hours_range,
          COUNT(*) as count
        FROM student_courses
        WHERE status = 'active'
        GROUP BY hours_range
      `,
      
      // 每日课程安排统计
      dailyScheduleStats: `
        SELECT DATE(session_date) as date,
               COUNT(*) as total_sessions,
               COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
               COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_sessions
        FROM class_sessions
        WHERE DATE(session_date) >= DATE('now', '-30 days', 'localtime')
        GROUP BY DATE(session_date)
        ORDER BY date ASC
      `
    };

    const analytics = {};
    const queryPromises = Object.keys(queries).map(key => {
      return new Promise((resolve, reject) => {
        db.all(queries[key], [], (err, results) => {
          if (err) {
            reject(err);
          } else {
            analytics[key] = results;
            resolve();
          }
        });
      });
    });

    Promise.all(queryPromises)
      .then(() => {
        res.json({ analytics });
      })
      .catch(err => {
        res.status(500).json({ error: '获取运营数据分析失败' });
      });
  });

  // 生成综合报表
  app.get('/api/analytics/report', authenticateToken, (req, res) => {
    const { start_date, end_date, report_type = 'comprehensive' } = req.query;
    
    let dateCondition = '1=1';
    if (start_date && end_date) {
      dateCondition = `DATE(created_at) BETWEEN '${start_date}' AND '${end_date}'`;
    }

    const report = {
      period: { start_date, end_date },
      generated_at: new Date(),
      summary: {},
      details: {}
    };

    // 根据报表类型生成不同的查询
    const summaryQueries = {
      student_summary: `
        SELECT 
          COUNT(*) as total_students,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_students,
          COUNT(CASE WHEN ${dateCondition.replace('created_at', 'enrollment_date')} THEN 1 END) as new_students
        FROM students
      `,
      revenue_summary: `
        SELECT 
          COUNT(sc.id) as total_enrollments,
          SUM(co.price) as total_revenue,
          AVG(co.price) as avg_course_price
        FROM student_courses sc
        JOIN classes c ON sc.class_id = c.id
        JOIN courses co ON c.course_id = co.id
        WHERE ${dateCondition.replace('created_at', 'sc.enrollment_date')}
      `,
      session_summary: `
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
          SUM(duration) as total_hours
        FROM class_sessions
        WHERE ${dateCondition.replace('created_at', 'session_date')}
      `
    };

    const summaryPromises = Object.keys(summaryQueries).map(key => {
      return new Promise((resolve, reject) => {
        db.get(summaryQueries[key], [], (err, result) => {
          if (err) {
            reject(err);
          } else {
            report.summary[key] = result;
            resolve();
          }
        });
      });
    });

    Promise.all(summaryPromises)
      .then(() => {
        res.json({ report });
      })
      .catch(err => {
        res.status(500).json({ error: '生成报表失败' });
      });
  });
};

