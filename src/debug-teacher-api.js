const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();

const API_BASE = 'http://localhost:5000/api';
const db = new sqlite3.Database('./training_management.db');

async function debugTeacherAPI() {
  try {
    console.log('🔍 调试教师API问题...\n');

    // 1. 教师登录
    console.log('1. 教师登录...');
    const teacherLogin = await axios.post(`${API_BASE}/auth/login`, {
      username: 'teacher_1',
      password: 'teacher123'
    });
    
    const token = teacherLogin.data.token;
    const user = teacherLogin.data.user;
    console.log('✅ 教师登录成功:', user);

    // 2. 直接查询数据库检查教师记录
    console.log('\n2. 直接查询数据库检查教师记录...');
    db.get('SELECT * FROM teachers WHERE user_id = ?', [user.id], (err, teacher) => {
      if (err) {
        console.error('❌ 数据库查询失败:', err);
        return;
      }
      
      if (teacher) {
        console.log('✅ 找到教师记录:', teacher);
        
        // 3. 测试API调用
        console.log('\n3. 测试教师API调用...');
        testTeacherAPI(token, teacher.id);
      } else {
        console.log('❌ 没有找到对应的教师记录');
        console.log('用户ID:', user.id);
        
        // 显示所有教师记录
        db.all('SELECT * FROM teachers', [], (err, allTeachers) => {
          if (err) {
            console.error('查询所有教师失败:', err);
          } else {
            console.log('\n所有教师记录:');
            console.table(allTeachers);
          }
        });
      }
    });

  } catch (error) {
    console.error('❌ 调试失败:', error.response?.data?.error || error.message);
  }
}

async function testTeacherAPI(token, teacherId) {
  try {
    // 测试仪表板统计
    console.log('\n测试仪表板统计API...');
    const statsResponse = await axios.get(`${API_BASE}/teachers/dashboard-stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ 仪表板统计:', statsResponse.data);

    // 测试课程列表
    console.log('\n测试课程列表API...');
    const sessionsResponse = await axios.get(`${API_BASE}/teachers/sessions`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ 课程列表:', sessionsResponse.data);

    // 测试通知列表
    console.log('\n测试通知列表API...');
    const notificationsResponse = await axios.get(`${API_BASE}/teachers/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ 通知列表:', notificationsResponse.data);

    db.close();

  } catch (error) {
    console.error('❌ API调用失败:', error.response?.data?.error || error.message);
    console.error('状态码:', error.response?.status);
    console.error('完整响应:', error.response?.data);
    db.close();
  }
}

// 执行调试
debugTeacherAPI();


