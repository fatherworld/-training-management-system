const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./training_management.db');

console.log('重置用户密码...\n');

const newPasswords = [
  { username: 'teacher_1', password: 'teacher123' },
  { username: '叶磊', password: 'teacher123' }
];

db.serialize(() => {
  let completed = 0;
  
  newPasswords.forEach(user => {
    console.log(`重置 ${user.username} 的密码...`);
    
    bcrypt.hash(user.password, 10, (err, hashedPassword) => {
      if (err) {
        console.error(`❌ ${user.username} 密码加密失败:`, err);
        completed++;
        if (completed === newPasswords.length) {
          db.close();
        }
        return;
      }

      db.run(
        "UPDATE users SET password = ? WHERE username = ?",
        [hashedPassword, user.username],
        function(err) {
          if (err) {
            console.error(`❌ ${user.username} 密码更新失败:`, err);
          } else if (this.changes === 0) {
            console.log(`❌ ${user.username} 用户不存在`);
          } else {
            console.log(`✅ ${user.username} 密码重置成功`);
          }
          
          completed++;
          if (completed === newPasswords.length) {
            console.log('\n所有密码重置完成！');
            
            // 验证重置结果
            console.log('\n验证密码重置结果:');
            newPasswords.forEach(testUser => {
              db.get("SELECT * FROM users WHERE username = ?", [testUser.username], (err, dbUser) => {
                if (err || !dbUser) {
                  console.log(`❌ ${testUser.username}: 查询失败`);
                  return;
                }

                bcrypt.compare(testUser.password, dbUser.password, (err, isMatch) => {
                  if (err) {
                    console.log(`❌ ${testUser.username}: 验证错误`);
                  } else if (isMatch) {
                    console.log(`✅ ${testUser.username}: 密码验证通过`);
                  } else {
                    console.log(`❌ ${testUser.username}: 密码验证失败`);
                  }
                });
              });
            });
            
            setTimeout(() => {
              db.close();
            }, 1000);
          }
        }
      );
    });
  });
});


