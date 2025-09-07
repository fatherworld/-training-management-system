// 修复API路由中的数据库字段不匹配问题

const fs = require('fs');
const path = require('path');

const fixes = [
  {
    file: 'routes/students.js',
    from: 'ORDER BY created_at DESC',
    to: 'ORDER BY enrollment_date DESC',
    description: '修复学员表字段名不匹配'
  }
];

console.log('🔧 开始修复API路由问题...\n');

fixes.forEach((fix, index) => {
  const filePath = path.join(__dirname, fix.file);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes(fix.from)) {
      content = content.replace(new RegExp(fix.from, 'g'), fix.to);
      fs.writeFileSync(filePath, content);
      console.log(`✅ ${index + 1}. ${fix.description}`);
    } else {
      console.log(`⏭️  ${index + 1}. ${fix.description} - 已经修复过或不需要修复`);
    }
  } catch (error) {
    console.log(`❌ ${index + 1}. 修复失败: ${error.message}`);
  }
});

console.log('\n🎉 API修复完成！');
console.log('请重新启动服务器以应用修复。');



