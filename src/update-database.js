const sqlite3 = require('sqlite3').verbose();

// 数据库更新脚本
const db = new sqlite3.Database('./training_management.db');

console.log('开始更新数据库结构...');

db.serialize(() => {
  // 检查teachers表是否已有user_id字段
  db.get("PRAGMA table_info(teachers)", (err, info) => {
    if (err) {
      console.error('检查teachers表结构失败:', err);
      return;
    }
    
    // 添加user_id字段到teachers表
    db.run("ALTER TABLE teachers ADD COLUMN user_id INTEGER", (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('添加teachers.user_id字段失败:', err);
      } else {
        console.log('✅ teachers表user_id字段已添加');
      }
    });
  });

  // 检查students表是否已有user_id字段
  db.get("PRAGMA table_info(students)", (err, info) => {
    if (err) {
      console.error('检查students表结构失败:', err);
      return;
    }
    
    // 添加user_id字段到students表
    db.run("ALTER TABLE students ADD COLUMN user_id INTEGER", (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('添加students.user_id字段失败:', err);
      } else {
        console.log('✅ students表user_id字段已添加');
      }
    });
  });

  // 检查是否有默认管理员账户
  db.get("SELECT * FROM users WHERE username = 'admin'", (err, user) => {
    if (err) {
      console.error('检查管理员账户失败:', err);
      return;
    }

    if (!user) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      
      db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", 
        ['admin', hashedPassword, 'admin'], (err) => {
        if (err) {
          console.error('创建管理员账户失败:', err);
        } else {
          console.log('✅ 默认管理员账户已创建 (admin/admin123)');
        }
      });
    } else {
      console.log('✅ 管理员账户已存在');
    }
  });

  // 检查表结构
  setTimeout(() => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
      if (err) {
        console.error('获取表列表失败:', err);
      } else {
        console.log('\n📋 数据库表列表:');
        tables.forEach(table => {
          console.log(`  - ${table.name}`);
        });
      }
      
      db.close((err) => {
        if (err) {
          console.error('关闭数据库失败:', err);
        } else {
          console.log('\n✅ 数据库更新完成');
        }
      });
    });
  }, 1000);
});


