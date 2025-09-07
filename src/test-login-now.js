const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testLoginNow() {
  try {
    console.log('🚀 紧急测试登录功能...\n');

    const testUsers = [
      { username: 'admin', password: 'admin123' },
      { username: 'teacher_1', password: 'teacher123' },
      { username: '叶磊', password: 'teacher123' },
      { username: 'student_1', password: 'student123' }
    ];

    for (const user of testUsers) {
      console.log(`测试 ${user.username}...`);
      
      try {
        const response = await axios.post(`${API_BASE}/auth/login`, {
          username: user.username,
          password: user.password
        });

        console.log(`✅ ${user.username} 登录成功`);
        console.log(`   角色: ${response.data.user.role}`);
        console.log(`   用户ID: ${response.data.user.id}`);

      } catch (error) {
        console.log(`❌ ${user.username} 登录失败:`);
        console.log(`   错误: ${error.response?.data?.error || error.message}`);
        console.log(`   状态码: ${error.response?.status}`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

testLoginNow();


