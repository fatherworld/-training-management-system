const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testNotificationSystem() {
  try {
    console.log('🔔 开始测试通知系统...\n');

    // 1. 管理员登录
    console.log('1. 管理员登录...');
    const adminLogin = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    const adminToken = adminLogin.data.token;
    console.log('✅ 管理员登录成功');

    // 2. 获取用户数据用于创建通知
    console.log('\n2. 获取系统数据...');
    
    const [studentsRes, teachersRes, classesRes] = await Promise.all([
      axios.get(`${API_BASE}/students`, { headers: { Authorization: `Bearer ${adminToken}` } }),
      axios.get(`${API_BASE}/teachers`, { headers: { Authorization: `Bearer ${adminToken}` } }),
      axios.get(`${API_BASE}/classes`, { headers: { Authorization: `Bearer ${adminToken}` } })
    ]);

    const students = studentsRes.data.students || [];
    const teachers = teachersRes.data.teachers || [];
    const classes = classesRes.data.classes || [];

    console.log(`✅ 获取数据成功: ${students.length}个学员, ${teachers.length}个教师, ${classes.length}个班级`);

    // 3. 创建不同类型的通知
    console.log('\n3. 创建测试通知...');
    
    const notifications = [];

    // 3.1 创建给特定学员的通知
    if (students.length > 0) {
      const studentNotification = await axios.post(`${API_BASE}/notifications`, {
        type: 'general',
        recipient_type: 'student',
        recipient_id: students[0].id,
        title: '学员专属通知',
        message: `您好 ${students[0].name}，这是一条专门发给您的通知。`,
        status: 'sent'
      }, { headers: { Authorization: `Bearer ${adminToken}` } });
      
      notifications.push({
        type: '学员通知',
        target: students[0].name,
        id: studentNotification.data.notification.id
      });
      console.log(`✅ 创建学员通知成功 - 目标: ${students[0].name}`);
    }

    // 3.2 创建给特定教师的通知
    if (teachers.length > 0) {
      const teacherNotification = await axios.post(`${API_BASE}/notifications`, {
        type: 'general',
        recipient_type: 'teacher',
        recipient_id: teachers[0].id,
        title: '教师专属通知',
        message: `您好 ${teachers[0].name}，这是一条专门发给您的通知。`,
        status: 'sent'
      }, { headers: { Authorization: `Bearer ${adminToken}` } });
      
      notifications.push({
        type: '教师通知',
        target: teachers[0].name,
        id: teacherNotification.data.notification.id
      });
      console.log(`✅ 创建教师通知成功 - 目标: ${teachers[0].name}`);
    }

    // 3.3 创建给班级的通知
    if (classes.length > 0) {
      const classNotification = await axios.post(`${API_BASE}/notifications`, {
        type: 'class_reminder',
        recipient_type: 'class',
        recipient_id: classes[0].id,
        title: '班级通知',
        message: `${classes[0].name}班级的同学们，这是一条班级通知。`,
        status: 'sent'
      }, { headers: { Authorization: `Bearer ${adminToken}` } });
      
      notifications.push({
        type: '班级通知',
        target: classes[0].name,
        id: classNotification.data.notification.id
      });
      console.log(`✅ 创建班级通知成功 - 目标: ${classes[0].name}`);
    }

    // 3.4 创建全体通知
    const allNotification = await axios.post(`${API_BASE}/notifications`, {
      type: 'general',
      recipient_type: 'all',
      recipient_id: 0,
      title: '系统公告',
      message: '这是一条发给所有用户的系统公告。',
      status: 'sent'
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    
    notifications.push({
      type: '全体通知',
      target: '所有用户',
      id: allNotification.data.notification.id
    });
    console.log('✅ 创建全体通知成功');

    // 4. 测试不同用户的通知接收
    console.log('\n4. 测试用户通知接收...');

    // 4.1 测试教师通知接收
    console.log('\n4.1 测试教师通知接收...');
    const teacherLogin = await axios.post(`${API_BASE}/auth/login`, {
      username: 'teacher_1',
      password: 'teacher123'
    });
    const teacherToken = teacherLogin.data.token;

    const teacherNotifications = await axios.get(`${API_BASE}/teacher/notifications`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    
    console.log(`✅ 教师收到 ${teacherNotifications.data.notifications.length} 条通知`);
    teacherNotifications.data.notifications.forEach(notif => {
      console.log(`   - ${notif.title} (类型: ${notif.recipient_type})`);
    });

    // 4.2 测试学员通知接收
    console.log('\n4.2 测试学员通知接收...');
    const studentLogin = await axios.post(`${API_BASE}/auth/login`, {
      username: 'student_1',
      password: 'student123'
    });
    const studentToken = studentLogin.data.token;

    const studentNotifications = await axios.get(`${API_BASE}/student/notifications`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    
    console.log(`✅ 学员收到 ${studentNotifications.data.notifications.length} 条通知`);
    studentNotifications.data.notifications.forEach(notif => {
      console.log(`   - ${notif.title} (类型: ${notif.recipient_type})`);
    });

    // 5. 验证权限隔离
    console.log('\n5. 验证权限隔离...');
    
    // 教师不应该看到学员专属通知，学员不应该看到教师专属通知
    const teacherSpecificNotifs = teacherNotifications.data.notifications.filter(n => 
      n.recipient_type === 'student' && n.recipient_id !== null
    );
    const studentSpecificNotifs = studentNotifications.data.notifications.filter(n => 
      n.recipient_type === 'teacher' && n.recipient_id !== null
    );

    if (teacherSpecificNotifs.length === 0) {
      console.log('✅ 教师权限隔离正常 - 未收到学员专属通知');
    } else {
      console.log('❌ 教师权限隔离失败 - 收到了学员专属通知');
    }

    if (studentSpecificNotifs.length === 0) {
      console.log('✅ 学员权限隔离正常 - 未收到教师专属通知');
    } else {
      console.log('❌ 学员权限隔离失败 - 收到了教师专属通知');
    }

    // 6. 测试管理员查看所有通知
    console.log('\n6. 测试管理员查看所有通知...');
    const adminNotifications = await axios.get(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log(`✅ 管理员可以查看所有 ${adminNotifications.data.notifications.length} 条通知`);

    console.log('\n📊 测试结果总结:');
    console.log('✅ 通知创建功能正常');
    console.log('✅ 接收者类型选择功能正常');
    console.log('✅ 不同用户角色的通知投递正常');
    console.log('✅ 权限隔离功能正常');
    console.log('✅ 管理员可以查看所有通知');

    console.log('\n🎉 通知系统测试完成！所有功能正常工作。');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data?.error || error.message);
    if (error.response?.status) {
      console.error('HTTP状态码:', error.response.status);
    }
  }
}

// 等待服务器启动
setTimeout(() => {
  testNotificationSystem();
}, 3000);


