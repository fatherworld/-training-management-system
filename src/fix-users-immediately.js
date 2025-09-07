const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./training_management.db');

console.log('🚑 紧急修复用户问题...\n');

db.serialize(() => {
  // 1. 重新创建 teacher_1 用户
  console.log('1. 创建 teacher_1 用户...');
  
  bcrypt.hash('teacher123', 10, (err, hashedPassword) => {
    if (err) {
      console.error('密码加密失败:', err);
      return;
    }

    db.run(
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
      ['teacher_1', hashedPassword, 'teacher'],
      function(err) {
        if (err) {
          console.log('❌ teacher_1 用户创建失败:', err.message);
          if (err.message.includes('UNIQUE constraint failed')) {
            console.log('用户可能已存在，尝试更新密码...');
            updateTeacher1Password(hashedPassword);
          }
        } else {
          console.log('✅ teacher_1 用户创建成功，ID:', this.lastID);
          
          // 关联到第一个没有user_id的教师
          db.get("SELECT * FROM teachers WHERE user_id IS NULL LIMIT 1", [], (err, teacher) => {
            if (teacher) {
              db.run("UPDATE teachers SET user_id = ? WHERE id = ?", [this.lastID, teacher.id], (err) => {
                if (err) {
                  console.log('❌ 关联教师失败:', err);
                } else {
                  console.log(`✅ teacher_1 已关联到教师: ${teacher.name}`);
                }
              });
            }
          });
        }
        
        // 继续修复 student_1 密码
        fixStudent1Password();
      }
    );
  });
});

function updateTeacher1Password(hashedPassword) {
  db.run(
    "UPDATE users SET password = ? WHERE username = ?",
    [hashedPassword, 'teacher_1'],
    function(err) {
      if (err) {
        console.log('❌ teacher_1 密码更新失败:', err);
      } else {
        console.log('✅ teacher_1 密码更新成功');
      }
      fixStudent1Password();
    }
  );
}

function fixStudent1Password() {
  console.log('\n2. 修复 student_1 密码...');
  
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
          console.log('❌ student_1 密码更新失败:', err);
        } else {
          console.log('✅ student_1 密码更新成功');
        }
        
        // 验证修复结果
        setTimeout(verifyFix, 500);
      }
    );
  });
}

function verifyFix() {
  console.log('\n3. 验证修复结果...');
  
  const testUsers = [
    { username: 'admin', password: 'admin123' },
    { username: 'teacher_1', password: 'teacher123' },
    { username: '叶磊', password: 'teacher123' },
    { username: 'student_1', password: 'student123' }
  ];

  db.all("SELECT * FROM users ORDER BY id", [], (err, users) => {
    if (err) {
      console.error('查询用户失败:', err);
      return;
    }
    
    console.log('当前用户列表:');
    users.forEach(user => {
      console.log(`- ${user.username} (${user.role})`);
    });
    
    let completed = 0;
    
    testUsers.forEach(testUser => {
      const dbUser = users.find(u => u.username === testUser.username);
      
      if (!dbUser) {
        console.log(`❌ ${testUser.username}: 仍然不存在`);
        completed++;
        if (completed === testUsers.length) {
          db.close();
          console.log('\n修复完成！请重新测试登录。');
        }
        return;
      }

      bcrypt.compare(testUser.password, dbUser.password, (err, isMatch) => {
        if (err) {
          console.log(`❌ ${testUser.username}: 验证错误`);
        } else if (isMatch) {
          console.log(`✅ ${testUser.username}: 密码正确`);
        } else {
          console.log(`❌ ${testUser.username}: 密码仍然错误`);
        }
        
        completed++;
        if (completed === testUsers.length) {
          db.close();
          console.log('\n修复完成！请重新测试登录。');
        }
      });
    });
  });
}


