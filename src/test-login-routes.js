const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testAllUserLogins() {
  try {
    console.log('🚀 测试所有用户登录和路由跳转...\n');

    // 测试用户账户
    const testUsers = [
      { username: 'admin', password: 'admin123', expectedRole: 'admin' },
      { username: 'teacher_1', password: 'teacher123', expectedRole: 'teacher' },
      { username: '叶磊', password: 'teacher123', expectedRole: 'teacher' },
      { username: 'student_1', password: 'student123', expectedRole: 'student' }
    ];

    for (const testUser of testUsers) {
      console.log(`=== 测试用户: ${testUser.username} ===`);
      
      try {
        // 1. 测试登录
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
          username: testUser.username,
          password: testUser.password
        });

        const { token, user } = loginResponse.data;
        console.log(`✅ ${testUser.username} 登录成功`);
        console.log(`   - 用户ID: ${user.id}`);
        console.log(`   - 角色: ${user.role}`);
        console.log(`   - 预期角色: ${testUser.expectedRole}`);
        
        if (user.role !== testUser.expectedRole) {
          console.log(`❌ 角色不匹配！预期: ${testUser.expectedRole}, 实际: ${user.role}`);
          continue;
        }

        // 2. 验证token
        const meResponse = await axios.get(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`✅ Token验证成功`);

        // 3. 测试角色专用API
        if (user.role === 'admin') {
          console.log('   测试管理员功能...');
          const usersResponse = await axios.get(`${API_BASE}/users`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log(`   ✅ 可以获取用户列表 (${usersResponse.data.users.length}个用户)`);

        } else if (user.role === 'teacher') {
          console.log('   测试教师功能...');
          
          // 测试获取教师个人信息
          const teacherMe = await axios.get(`${API_BASE}/teacher/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log(`   ✅ 可以获取教师个人信息: ${teacherMe.data.teacher.name}`);

          // 测试获取仪表板数据
          const statsResponse = await axios.get(`${API_BASE}/teacher/dashboard-stats`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log(`   ✅ 可以获取教师仪表板数据`);

          // 测试获取课程
          const sessionsResponse = await axios.get(`${API_BASE}/teacher/sessions`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log(`   ✅ 可以获取教师课程数据`);

          // 测试获取通知
          const notificationsResponse = await axios.get(`${API_BASE}/teacher/notifications`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log(`   ✅ 可以获取教师通知数据`);

        } else if (user.role === 'student') {
          console.log('   测试学员功能...');
          
          // 测试获取学员个人信息
          const studentMe = await axios.get(`${API_BASE}/student/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log(`   ✅ 可以获取学员个人信息: ${studentMe.data.student.name}`);

          // 测试获取仪表板数据
          const statsResponse = await axios.get(`${API_BASE}/student/dashboard-stats`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log(`   ✅ 可以获取学员仪表板数据`);

          // 测试获取课程
          const sessionsResponse = await axios.get(`${API_BASE}/student/sessions`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log(`   ✅ 可以获取学员课程数据`);

          // 测试获取点评
          const evaluationsResponse = await axios.get(`${API_BASE}/student/evaluations`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log(`   ✅ 可以获取学员点评数据`);
        }

        console.log(`🎉 ${testUser.username} 所有功能测试通过\n`);

      } catch (error) {
        console.log(`❌ ${testUser.username} 测试失败:`);
        console.log(`   错误: ${error.response?.data?.error || error.message}`);
        console.log(`   状态码: ${error.response?.status || 'N/A'}\n`);
      }
    }

    console.log('📊 测试总结:');
    console.log('✅ 所有用户登录测试完成');
    console.log('✅ 角色权限验证完成');
    console.log('✅ API路由功能验证完成');
    console.log('\n🎯 可用的登录账户:');
    testUsers.forEach(user => {
      console.log(`   - ${user.username} / ${user.password} (${user.expectedRole})`);
    });

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 等待服务器启动
setTimeout(() => {
  testAllUserLogins();
}, 2000);


