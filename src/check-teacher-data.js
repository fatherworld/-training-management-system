const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./training_management.db');

console.log('检查教师数据和用户关联...\n');

db.serialize(() => {
  // 1. 检查所有用户
  console.log('1. 所有用户:');
  db.all("SELECT * FROM users", [], (err, users) => {
    if (err) {
      console.error('查询用户失败:', err);
      return;
    }
    
    console.table(users);

    // 2. 检查所有教师
    console.log('\n2. 所有教师:');
    db.all("SELECT * FROM teachers", [], (err, teachers) => {
      if (err) {
        console.error('查询教师失败:', err);
        return;
      }
      
      console.table(teachers);

      // 3. 检查教师和用户的关联
      console.log('\n3. 教师和用户关联:');
      db.all(`
        SELECT 
          t.id as teacher_id, 
          t.name as teacher_name, 
          t.user_id, 
          u.username, 
          u.role 
        FROM teachers t 
        LEFT JOIN users u ON t.user_id = u.id
      `, [], (err, relations) => {
        if (err) {
          console.error('查询关联失败:', err);
          return;
        }
        
        console.table(relations);

        // 4. 修复缺失的关联
        console.log('\n4. 检查是否需要修复关联...');
        
        // 查找teacher_1用户对应的教师记录
        db.get("SELECT * FROM users WHERE username = 'teacher_1'", [], (err, teacherUser) => {
          if (err) {
            console.error('查询teacher_1用户失败:', err);
            db.close();
            return;
          }
          
          if (teacherUser) {
            console.log('teacher_1用户信息:', teacherUser);
            
            // 检查是否有教师记录与此用户关联
            db.get("SELECT * FROM teachers WHERE user_id = ?", [teacherUser.id], (err, linkedTeacher) => {
              if (err) {
                console.error('查询关联教师失败:', err);
                db.close();
                return;
              }
              
              if (!linkedTeacher) {
                console.log('❌ teacher_1用户没有关联的教师记录');
                
                // 查找第一个没有user_id的教师记录
                db.get("SELECT * FROM teachers WHERE user_id IS NULL LIMIT 1", [], (err, unlinkedTeacher) => {
                  if (err) {
                    console.error('查询未关联教师失败:', err);
                    db.close();
                    return;
                  }
                  
                  if (unlinkedTeacher) {
                    console.log('找到未关联的教师记录:', unlinkedTeacher);
                    
                    // 建立关联
                    db.run("UPDATE teachers SET user_id = ? WHERE id = ?", [teacherUser.id, unlinkedTeacher.id], function(err) {
                      if (err) {
                        console.error('更新关联失败:', err);
                      } else {
                        console.log('✅ 已将teacher_1用户关联到教师记录');
                      }
                      db.close();
                    });
                  } else {
                    console.log('❌ 没有找到未关联的教师记录');
                    db.close();
                  }
                });
              } else {
                console.log('✅ teacher_1用户已正确关联到教师记录:', linkedTeacher);
                db.close();
              }
            });
          } else {
            console.log('❌ 没有找到teacher_1用户');
            db.close();
          }
        });
      });
    });
  });
});


