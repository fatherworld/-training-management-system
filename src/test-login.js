const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testUserLogin() {
  try {
    console.log('🚀 开始测试用户登录功能...\n');

    // 1. 测试管理员登录
    console.log('1. 测试管理员登录...');
    const adminLogin = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    console.log('✅ 管理员登录成功:', adminLogin.data.user.username, '角色:', adminLogin.data.user.role);

    // 2. 测试教师账户登录
    console.log('\n2. 测试教师账户登录...');
    try {
      const teacherLogin = await axios.post(`${API_BASE}/auth/login`, {
        username: 'teacher_1',
        password: 'teacher123'
      });
      console.log('✅ 教师登录成功:', teacherLogin.data.user.username, '角色:', teacherLogin.data.user.role);

      // 测试教师获取个人信息
      console.log('\n3. 测试教师获取个人信息...');
      const teacherMe = await axios.get(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${teacherLogin.data.token}` }
      });
      console.log('✅ 教师个人信息:', teacherMe.data.user);

      // 测试教师专用API
      console.log('\n4. 测试教师专用API...');
      try {
        const teacherProfile = await axios.get(`${API_BASE}/teachers/dashboard-stats`, {
          headers: { Authorization: `Bearer ${teacherLogin.data.token}` }
        });
        console.log('✅ 教师详细信息:', teacherProfile.data.teacher);
      } catch (error) {
        console.log('❌ 教师API调用失败:', error.response?.data?.error || error.message);
      }

    } catch (error) {
      console.log('❌ 教师登录失败:', error.response?.data?.error || error.message);
      console.log('HTTP状态码:', error.response?.status);
    }

    // 3. 测试学员账户登录（如果存在）
    console.log('\n5. 测试学员账户登录...');
    try {
      const studentLogin = await axios.post(`${API_BASE}/auth/login`, {
        username: 'student_1',
        password: 'student123'
      });
      console.log('✅ 学员登录成功:', studentLogin.data.user.username, '角色:', studentLogin.data.user.role);

      // 测试学员获取个人信息
      const studentMe = await axios.get(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${studentLogin.data.token}` }
      });
      console.log('✅ 学员个人信息:', studentMe.data.user);

    } catch (error) {
      console.log('❌ 学员登录失败:', error.response?.data?.error || error.message);
      if (error.response?.status === 401) {
        console.log('ℹ️ 可能是学员账户不存在或密码错误');
      }
    }

    // 4. 测试错误登录
    console.log('\n6. 测试错误登录...');
    try {
      await axios.post(`${API_BASE}/auth/login`, {
        username: 'nonexistent',
        password: 'wrongpassword'
      });
    } catch (error) {
      console.log('✅ 错误登录正确被拒绝:', error.response?.data?.error);
    }

    console.log('\n🎉 登录测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data?.error || error.message);
    if (error.response?.status) {
      console.error('HTTP状态码:', error.response.status);
    }
  }
}

// 执行测试
testUserLogin();
