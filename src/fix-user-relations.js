const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./training_management.db');

console.log('修复用户关联问题...\n');

db.serialize(() => {
  // 1. 检查student_1用户是否关联到学员
  console.log('1. 检查student_1用户关联...');
  db.get("SELECT * FROM users WHERE username = 'student_1'", [], (err, studentUser) => {
    if (err) {
      console.error('查询student_1用户失败:', err);
      return;
    }
    
    if (studentUser) {
      console.log('找到student_1用户:', studentUser);
      
      // 检查是否已关联学员
      db.get("SELECT * FROM students WHERE user_id = ?", [studentUser.id], (err, linkedStudent) => {
        if (err) {
          console.error('查询关联学员失败:', err);
          return;
        }
        
        if (linkedStudent) {
          console.log('✅ student_1已关联学员:', linkedStudent);
        } else {
          console.log('❌ student_1未关联学员，开始修复...');
          
          // 查找第一个未关联的学员
          db.get("SELECT * FROM students WHERE user_id IS NULL LIMIT 1", [], (err, unlinkedStudent) => {
            if (err) {
              console.error('查询未关联学员失败:', err);
              return;
            }
            
            if (unlinkedStudent) {
              console.log('找到未关联学员:', unlinkedStudent);
              
              // 建立关联
              db.run("UPDATE students SET user_id = ? WHERE id = ?", [studentUser.id, unlinkedStudent.id], function(err) {
                if (err) {
                  console.error('关联学员失败:', err);
                } else {
                  console.log('✅ 已将student_1关联到学员:', unlinkedStudent.name);
                }
                
                // 继续检查其他用户
                checkOtherUsers();
              });
            } else {
              console.log('没有找到未关联的学员');
              checkOtherUsers();
            }
          });
        }
        
        if (linkedStudent) {
          checkOtherUsers();
        }
      });
    } else {
      console.log('没有找到student_1用户');
      checkOtherUsers();
    }
  });
});

function checkOtherUsers() {
  console.log('\n2. 检查所有用户关联状态...');
  
  // 获取所有用户和他们的关联状态
  db.all(`
    SELECT 
      u.id,
      u.username,
      u.role,
      CASE 
        WHEN u.role = 'teacher' THEN t.name
        WHEN u.role = 'student' THEN s.name
        ELSE u.username
      END as display_name,
      CASE 
        WHEN u.role = 'teacher' THEN t.id
        WHEN u.role = 'student' THEN s.id
        ELSE NULL
      END as related_id
    FROM users u
    LEFT JOIN teachers t ON u.id = t.user_id AND u.role = 'teacher'
    LEFT JOIN students s ON u.id = s.user_id AND u.role = 'student'
    ORDER BY u.id
  `, [], (err, userRelations) => {
    if (err) {
      console.error('查询用户关联失败:', err);
      return;
    }
    
    console.table(userRelations);
    
    // 检查是否有未关联的用户
    const unlinkedUsers = userRelations.filter(user => 
      user.role !== 'admin' && !user.related_id
    );
    
    if (unlinkedUsers.length > 0) {
      console.log('\n❌ 发现未关联用户:', unlinkedUsers.length, '个');
      unlinkedUsers.forEach(user => {
        console.log(`- ${user.username} (${user.role}) - ID: ${user.id}`);
      });
    } else {
      console.log('\n✅ 所有用户都已正确关联');
    }
    
    db.close();
    console.log('\n修复完成！');
  });
}


