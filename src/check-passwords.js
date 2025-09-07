const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./training_management.db');

console.log('检查用户密码...\n');

const testPasswords = [
  { username: 'admin', password: 'admin123' },
  { username: 'teacher_1', password: 'teacher123' },
  { username: '叶磊', password: 'teacher123' },
  { username: 'student_1', password: 'student123' }
];

db.serialize(() => {
  db.all("SELECT * FROM users ORDER BY id", [], (err, users) => {
    if (err) {
      console.error('查询用户失败:', err);
      return;
    }
    
    console.log('数据库中的用户:');
    users.forEach(user => {
      console.log(`- ID: ${user.id}, 用户名: ${user.username}, 角色: ${user.role}`);
    });

    console.log('\n测试密码验证:');
    
    const promises = testPasswords.map(testUser => {
      return new Promise((resolve) => {
        const dbUser = users.find(u => u.username === testUser.username);
        if (!dbUser) {
          console.log(`❌ ${testUser.username}: 用户不存在`);
          resolve();
          return;
        }

        bcrypt.compare(testUser.password, dbUser.password, (err, isMatch) => {
          if (err) {
            console.log(`❌ ${testUser.username}: 密码验证错误 - ${err.message}`);
          } else if (isMatch) {
            console.log(`✅ ${testUser.username}: 密码正确`);
          } else {
            console.log(`❌ ${testUser.username}: 密码错误`);
            console.log(`   尝试密码: ${testUser.password}`);
            console.log(`   数据库哈希: ${dbUser.password.substring(0, 20)}...`);
          }
          resolve();
        });
      });
    });

    Promise.all(promises).then(() => {
      db.close();
      console.log('\n密码检查完成！');
    });
  });
});


