const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./training_management.db');

console.log('🔍 检查当前数据库用户状态...\n');

db.serialize(() => {
  // 1. 查看所有用户
  db.all("SELECT * FROM users ORDER BY id", [], (err, users) => {
    if (err) {
      console.error('查询用户失败:', err);
      return;
    }
    
    console.log('📋 数据库中的所有用户:');
    users.forEach(user => {
      console.log(`- ID: ${user.id}, 用户名: "${user.username}", 角色: ${user.role}, 创建时间: ${user.created_at}`);
    });

    console.log('\n🔐 测试密码验证:');
    
    // 测试每个用户的密码
    const testPasswords = [
      { username: 'admin', password: 'admin123' },
      { username: 'teacher_1', password: 'teacher123' },
      { username: '叶磊', password: 'teacher123' },
      { username: 'student_1', password: 'student123' }
    ];

    let completed = 0;
    
    testPasswords.forEach(testUser => {
      const dbUser = users.find(u => u.username === testUser.username);
      
      if (!dbUser) {
        console.log(`❌ ${testUser.username}: 用户不存在于数据库中`);
        completed++;
        if (completed === testPasswords.length) {
          checkUserRelations();
        }
        return;
      }

      bcrypt.compare(testUser.password, dbUser.password, (err, isMatch) => {
        if (err) {
          console.log(`❌ ${testUser.username}: 密码验证错误 - ${err.message}`);
        } else if (isMatch) {
          console.log(`✅ ${testUser.username}: 密码正确`);
        } else {
          console.log(`❌ ${testUser.username}: 密码错误`);
          console.log(`   期望密码: ${testUser.password}`);
          console.log(`   哈希前缀: ${dbUser.password.substring(0, 20)}...`);
        }
        
        completed++;
        if (completed === testPasswords.length) {
          checkUserRelations();
        }
      });
    });
  });
});

function checkUserRelations() {
  console.log('\n🔗 检查用户关联:');
  
  db.all(`
    SELECT 
      u.id as user_id,
      u.username,
      u.role,
      CASE 
        WHEN u.role = 'teacher' THEN t.name
        WHEN u.role = 'student' THEN s.name
        ELSE u.username
      END as display_name
    FROM users u
    LEFT JOIN teachers t ON u.id = t.user_id AND u.role = 'teacher'
    LEFT JOIN students s ON u.id = s.user_id AND u.role = 'student'
    ORDER BY u.id
  `, [], (err, relations) => {
    if (err) {
      console.error('查询关联失败:', err);
      return;
    }
    
    relations.forEach(rel => {
      const status = rel.display_name && rel.display_name !== rel.username ? '✅' : '❌';
      console.log(`${status} ${rel.username} (${rel.role}) - 关联名称: ${rel.display_name || '无'}`);
    });
    
    db.close();
    console.log('\n检查完成！');
  });
}


