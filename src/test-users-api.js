const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
let authToken = '';

async function testUserManagement() {
  try {
    console.log('🚀 开始测试用户管理API...\n');

    // 1. 测试登录
    console.log('1. 测试管理员登录...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    authToken = loginResponse.data.token;
    console.log('✅ 登录成功，用户角色:', loginResponse.data.user.role);

    // 2. 测试获取用户列表
    console.log('\n2. 测试获取用户列表...');
    const usersResponse = await axios.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ 获取用户列表成功，共', usersResponse.data.users.length, '个用户');
    console.log('用户列表:', usersResponse.data.users.map(u => `${u.username}(${u.role})`).join(', '));

    // 3. 测试获取没有账户的教师
    console.log('\n3. 测试获取没有账户的教师...');
    const teachersResponse = await axios.get(`${API_BASE}/users/teachers-without-account`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ 获取教师列表成功，共', teachersResponse.data.teachers.length, '个教师无账户');
    
    if (teachersResponse.data.teachers.length > 0) {
      const teacher = teachersResponse.data.teachers[0];
      console.log('第一个教师:', teacher.name, '-', teacher.phone);

      // 4. 测试为教师创建账户
      console.log('\n4. 测试为教师创建账户...');
      try {
        const createResponse = await axios.post(`${API_BASE}/users/teacher`, {
          teacher_id: teacher.id,
          username: `teacher_${teacher.id}`,
          password: 'teacher123'
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ 教师账户创建成功:', createResponse.data.message);
      } catch (error) {
        console.log('⚠️ 教师账户创建失败:', error.response?.data?.error || error.message);
      }
    } else {
      console.log('ℹ️ 没有需要创建账户的教师');
    }

    // 5. 测试获取没有账户的学员
    console.log('\n5. 测试获取没有账户的学员...');
    const studentsResponse = await axios.get(`${API_BASE}/users/students-without-account`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ 获取学员列表成功，共', studentsResponse.data.students.length, '个学员无账户');
    
    if (studentsResponse.data.students.length > 0) {
      const student = studentsResponse.data.students[0];
      console.log('第一个学员:', student.name, '-', student.phone);

      // 6. 测试为学员创建账户
      console.log('\n6. 测试为学员创建账户...');
      try {
        const createResponse = await axios.post(`${API_BASE}/users/student`, {
          student_id: student.id,
          username: `student_${student.id}`,
          password: 'student123'
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ 学员账户创建成功:', createResponse.data.message);
      } catch (error) {
        console.log('⚠️ 学员账户创建失败:', error.response?.data?.error || error.message);
      }
    } else {
      console.log('ℹ️ 没有需要创建账户的学员');
    }

    // 7. 再次获取用户列表验证
    console.log('\n7. 验证用户创建结果...');
    const finalUsersResponse = await axios.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ 最终用户列表，共', finalUsersResponse.data.users.length, '个用户');
    finalUsersResponse.data.users.forEach(user => {
      console.log(`  - ${user.username} (${user.role}) - ${user.display_name || '无姓名'}`);
    });

    console.log('\n🎉 用户管理API测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data?.error || error.message);
    if (error.response?.status) {
      console.error('HTTP状态码:', error.response.status);
    }
  }
}

// 等待服务器启动后执行测试
setTimeout(() => {
  testUserManagement();
}, 2000);


