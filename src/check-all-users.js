const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./training_management.db');

console.log('检查所有用户账户状态...\n');

db.serialize(() => {
  // 1. 检查所有用户账户
  console.log('1. 所有用户账户:');
  db.all("SELECT * FROM users ORDER BY id", [], (err, users) => {
    if (err) {
      console.error('查询用户失败:', err);
      return;
    }
    
    console.table(users);

    // 2. 检查用户与教师的关联
    console.log('\n2. 用户与教师关联:');
    db.all(`
      SELECT 
        u.id as user_id,
        u.username,
        u.role,
        t.id as teacher_id,
        t.name as teacher_name,
        t.phone as teacher_phone
      FROM users u
      LEFT JOIN teachers t ON u.id = t.user_id
      WHERE u.role = 'teacher'
      ORDER BY u.id
    `, [], (err, teacherUsers) => {
      if (err) {
        console.error('查询教师用户关联失败:', err);
        return;
      }
      
      console.table(teacherUsers);

      // 3. 检查用户与学员的关联
      console.log('\n3. 用户与学员关联:');
      db.all(`
        SELECT 
          u.id as user_id,
          u.username,
          u.role,
          s.id as student_id,
          s.name as student_name,
          s.phone as student_phone
        FROM users u
        LEFT JOIN students s ON u.id = s.user_id
        WHERE u.role = 'student'
        ORDER BY u.id
      `, [], (err, studentUsers) => {
        if (err) {
          console.error('查询学员用户关联失败:', err);
          return;
        }
        
        console.table(studentUsers);

        // 4. 检查未关联的教师
        console.log('\n4. 未关联用户账户的教师:');
        db.all(`
          SELECT * FROM teachers 
          WHERE user_id IS NULL 
          ORDER BY id
        `, [], (err, unlinkedTeachers) => {
          if (err) {
            console.error('查询未关联教师失败:', err);
            return;
          }
          
          console.table(unlinkedTeachers);

          // 5. 检查未关联的学员
          console.log('\n5. 未关联用户账户的学员:');
          db.all(`
            SELECT * FROM students 
            WHERE user_id IS NULL 
            ORDER BY id
          `, [], (err, unlinkedStudents) => {
            if (err) {
              console.error('查询未关联学员失败:', err);
              return;
            }
            
            console.table(unlinkedStudents);

            console.log('\n6. 分析结果:');
            console.log('- 总用户数:', users.length);
            console.log('- 教师用户数:', teacherUsers.length);
            console.log('- 学员用户数:', studentUsers.length);
            console.log('- 未关联教师数:', unlinkedTeachers.length);
            console.log('- 未关联学员数:', unlinkedStudents.length);

            db.close();
          });
        });
      });
    });
  });
});


