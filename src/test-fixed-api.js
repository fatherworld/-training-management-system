const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testFixedAPI() {
  try {
    console.log('🚀 测试修复版教师API...\n');

    // 1. 教师登录
    console.log('1. 教师登录...');
    const teacherLogin = await axios.post(`${API_BASE}/auth/login`, {
      username: 'teacher_1',
      password: 'teacher123'
    });
    
    const token = teacherLogin.data.token;
    const user = teacherLogin.data.user;
    console.log('✅ 教师登录成功:', user);

    // 2. 测试获取教师个人信息
    console.log('\n2. 测试获取教师个人信息...');
    try {
      const meResponse = await axios.get(`${API_BASE}/teacher/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ 教师个人信息:', meResponse.data.teacher);
    } catch (error) {
      console.log('❌ 获取教师信息失败:', error.response?.data?.error || error.message);
    }

    // 3. 测试获取仪表板统计
    console.log('\n3. 测试获取仪表板统计...');
    try {
      const statsResponse = await axios.get(`${API_BASE}/teacher/dashboard-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ 仪表板统计:', statsResponse.data.stats);
    } catch (error) {
      console.log('❌ 获取仪表板统计失败:', error.response?.data?.error || error.message);
    }

    // 4. 测试获取课程安排
    console.log('\n4. 测试获取课程安排...');
    try {
      const sessionsResponse = await axios.get(`${API_BASE}/teacher/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ 课程安排:', sessionsResponse.data);
    } catch (error) {
      console.log('❌ 获取课程安排失败:', error.response?.data?.error || error.message);
    }

    // 5. 测试获取通知
    console.log('\n5. 测试获取通知...');
    try {
      const notificationsResponse = await axios.get(`${API_BASE}/teacher/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ 通知列表:', notificationsResponse.data);
    } catch (error) {
      console.log('❌ 获取通知失败:', error.response?.data?.error || error.message);
    }

    console.log('\n🎉 修复版API测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data?.error || error.message);
  }
}

// 执行测试
testFixedAPI();


