const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testFrontendLogin() {
  try {
    console.log('🚀 开始测试前端登录流程...\n');

    // 1. 模拟前端登录教师账户
    console.log('1. 模拟教师登录...');
    const teacherLogin = await axios.post(`${API_BASE}/auth/login`, {
      username: 'teacher_1',
      password: 'teacher123'
    });
    
    const token = teacherLogin.data.token;
    const user = teacherLogin.data.user;
    console.log('✅ 教师登录成功:', user);

    // 2. 模拟前端验证token（App.js中的useEffect）
    console.log('\n2. 模拟前端token验证...');
    const meResponse = await axios.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Token验证成功:', meResponse.data.user);

    // 3. 测试教师仪表板数据获取
    console.log('\n3. 测试教师仪表板数据获取...');
    try {
      const dashboardStats = await axios.get(`${API_BASE}/teachers/dashboard-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ 教师仪表板数据:', dashboardStats.data);
    } catch (error) {
      console.log('❌ 教师仪表板数据获取失败:', error.response?.data?.error || error.message);
      console.log('错误详情:', error.response?.data);
    }

    // 4. 测试教师课程数据获取
    console.log('\n4. 测试教师课程数据获取...');
    try {
      const sessionsResponse = await axios.get(`${API_BASE}/teachers/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ 教师课程数据:', sessionsResponse.data);
    } catch (error) {
      console.log('❌ 教师课程数据获取失败:', error.response?.data?.error || error.message);
    }

    // 5. 测试教师通知数据获取
    console.log('\n5. 测试教师通知数据获取...');
    try {
      const notificationsResponse = await axios.get(`${API_BASE}/teachers/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ 教师通知数据:', notificationsResponse.data);
    } catch (error) {
      console.log('❌ 教师通知数据获取失败:', error.response?.data?.error || error.message);
    }

    // 6. 创建一个学员账户进行测试
    console.log('\n6. 创建学员账户进行测试...');
    
    // 首先用管理员登录
    const adminLogin = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    const adminToken = adminLogin.data.token;

    // 获取没有账户的学员
    const studentsResponse = await axios.get(`${API_BASE}/users/students-without-account`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (studentsResponse.data.students.length > 0) {
      const student = studentsResponse.data.students[0];
      
      // 为学员创建账户
      try {
        const createStudentResponse = await axios.post(`${API_BASE}/users/student`, {
          student_id: student.id,
          username: `student_${student.id}`,
          password: 'student123'
        }, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✅ 学员账户创建成功:', createStudentResponse.data.message);

        // 测试学员登录
        console.log('\n7. 测试学员登录...');
        const studentLogin = await axios.post(`${API_BASE}/auth/login`, {
          username: `student_${student.id}`,
          password: 'student123'
        });
        console.log('✅ 学员登录成功:', studentLogin.data.user);

      } catch (error) {
        if (error.response?.data?.error.includes('已有用户账户')) {
          console.log('ℹ️ 学员账户已存在，尝试直接登录...');
          try {
            const studentLogin = await axios.post(`${API_BASE}/auth/login`, {
              username: `student_${student.id}`,
              password: 'student123'
            });
            console.log('✅ 学员登录成功:', studentLogin.data.user);
          } catch (loginError) {
            console.log('❌ 学员登录失败:', loginError.response?.data?.error || loginError.message);
          }
        } else {
          console.log('❌ 学员账户创建失败:', error.response?.data?.error || error.message);
        }
      }
    } else {
      console.log('ℹ️ 没有需要创建账户的学员');
    }

    console.log('\n🎉 前端登录流程测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data?.error || error.message);
    console.error('完整错误:', error.response?.data);
  }
}

// 执行测试
testFrontendLogin();


