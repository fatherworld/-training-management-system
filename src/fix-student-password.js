const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./training_management.db');

console.log('🔧 修复student_1密码...\n');

bcrypt.hash('student123', 10, (err, hashedPassword) => {
  if (err) {
    console.error('密码加密失败:', err);
    return;
  }

  db.run(
    "UPDATE users SET password = ? WHERE username = ?",
    [hashedPassword, 'student_1'],
    function(err) {
      if (err) {
        console.log('❌ 密码更新失败:', err);
      } else {
        console.log('✅ student_1 密码更新成功');
      }

      // 验证密码
      db.get("SELECT * FROM users WHERE username = 'student_1'", [], (err, user) => {
        if (err) {
          console.error('查询用户失败:', err);
          db.close();
          return;
        }

        bcrypt.compare('student123', user.password, (err, isMatch) => {
          if (err) {
            console.log('❌ 密码验证错误');
          } else if (isMatch) {
            console.log('✅ student_1 密码验证通过');
          } else {
            console.log('❌ student_1 密码验证失败');
          }
          
          db.close();
          console.log('\n修复完成！');
        });
      });
    }
  );
});


