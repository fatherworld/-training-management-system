# 培训管理系统

一个完整的培训机构管理系统，支持招生、试听、排课、消课、上课通知、点名通知、课后点评、数据分析等功能。

## 功能特性

### 核心功能
- 🎓 **学员管理** - 学员信息管理、报名记录、课时跟踪
- 👨‍🏫 **教师管理** - 教师信息管理、课程安排、工作量统计
- 📚 **课程管理** - 课程创建、价格设置、班级管理
- 🏫 **班级管理** - 班级创建、学员分配、课程安排
- 🎧 **试听管理** - 试听预约、反馈记录、转化跟踪
- 📅 **课程安排** - 排课管理、出勤记录、课时消费
- ⭐ **课后点评** - 学员评价、学习反馈、改进建议
- 🔔 **通知系统** - 上课提醒、点名通知、自动化消息
- 📊 **数据分析** - 收入统计、学员分析、经营报表

### 技术特性
- 💻 **现代化界面** - 基于Ant Design的响应式UI
- 🔐 **安全认证** - JWT身份验证，角色权限管理
- 📱 **移动适配** - 支持手机、平板等移动设备
- 🗄️ **数据存储** - SQLite数据库，轻量级部署
- ⚡ **高性能** - React前端，Node.js后端，快速响应
- 🔄 **实时更新** - 自动刷新数据，实时同步状态

## 系统架构

```
培训管理系统/
├── src/
│   ├── server.js           # 后端服务器入口
│   ├── package.json        # 后端依赖配置
│   ├── routes/            # API路由
│   │   ├── auth.js        # 用户认证
│   │   ├── students.js    # 学员管理
│   │   ├── teachers.js    # 教师管理
│   │   ├── courses.js     # 课程管理
│   │   ├── classes.js     # 班级管理
│   │   ├── trials.js      # 试听管理
│   │   ├── sessions.js    # 课程安排
│   │   ├── evaluations.js # 课后点评
│   │   ├── notifications.js # 通知管理
│   │   └── analytics.js   # 数据分析
│   └── client/           # 前端应用
│       ├── public/       # 静态资源
│       ├── src/          # 源代码
│       │   ├── components/ # 公共组件
│       │   ├── pages/     # 页面组件
│       │   ├── contexts/  # React上下文
│       │   └── services/  # API服务
│       └── package.json  # 前端依赖配置
```

## 快速开始

### 环境要求
- Node.js 14.0 或更高版本
- npm 6.0 或更高版本

### 安装步骤

1. **安装后端依赖**
```bash
cd src
npm install
```

2. **安装前端依赖**
```bash
cd client
npm install
```

3. **启动后端服务**
```bash
cd src
npm start
```
后端服务将在 http://localhost:5000 启动

4. **启动前端服务**
```bash
cd src/client
npm start
```
前端应用将在 http://localhost:3000 启动

5. **访问系统**
- 打开浏览器访问 http://localhost:3000
- 使用默认账户登录：
  - 用户名: `admin`
  - 密码: `admin123`

## 开发模式

### 同时启动前后端
```bash
# 在src目录下
npm run dev    # 启动后端服务
npm run client # 启动前端服务（新终端窗口）
```

### 构建生产版本
```bash
cd src/client
npm run build
```

## 数据库说明

系统使用SQLite数据库，数据库文件会在首次启动时自动创建在 `src/training_management.db`。

### 数据库表结构
- `users` - 用户表
- `students` - 学员表
- `teachers` - 教师表
- `courses` - 课程表
- `classes` - 班级表
- `student_courses` - 学员课程关联表
- `trial_classes` - 试听记录表
- `class_sessions` - 课时记录表
- `student_evaluations` - 点评记录表
- `notifications` - 通知记录表

## API接口文档

### 认证接口
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `GET /api/auth/me` - 获取当前用户信息

### 学员管理
- `GET /api/students` - 获取学员列表
- `POST /api/students` - 创建学员
- `PUT /api/students/:id` - 更新学员信息
- `DELETE /api/students/:id` - 删除学员
- `POST /api/students/:id/enroll` - 学员报名课程

### 教师管理
- `GET /api/teachers` - 获取教师列表
- `POST /api/teachers` - 创建教师
- `PUT /api/teachers/:id` - 更新教师信息
- `DELETE /api/teachers/:id` - 删除教师

### 课程管理
- `GET /api/courses` - 获取课程列表
- `POST /api/courses` - 创建课程
- `PUT /api/courses/:id` - 更新课程信息
- `DELETE /api/courses/:id` - 删除课程

### 班级管理
- `GET /api/classes` - 获取班级列表
- `POST /api/classes` - 创建班级
- `PUT /api/classes/:id` - 更新班级信息
- `DELETE /api/classes/:id` - 删除班级

### 试听管理
- `GET /api/trials` - 获取试听记录
- `POST /api/trials` - 创建试听预约
- `PUT /api/trials/:id` - 更新试听记录
- `DELETE /api/trials/:id` - 删除试听记录

### 课程安排
- `GET /api/sessions` - 获取课程安排
- `POST /api/sessions` - 创建课程安排
- `POST /api/sessions/:id/attendance` - 课程点名

### 课后点评
- `GET /api/evaluations` - 获取点评记录
- `POST /api/evaluations` - 创建点评记录
- `PUT /api/evaluations/:id` - 更新点评记录

### 通知管理
- `GET /api/notifications` - 获取通知记录
- `POST /api/notifications` - 创建通知
- `POST /api/notifications/class-reminder` - 发送上课提醒

### 数据分析
- `GET /api/analytics/dashboard` - 仪表板数据
- `GET /api/analytics/students` - 学员数据分析
- `GET /api/analytics/financial` - 财务数据分析
- `GET /api/analytics/courses` - 课程数据分析

## 部署说明

### 生产环境部署

1. **构建前端**
```bash
cd src/client
npm run build
```

2. **配置环境变量**
```bash
export NODE_ENV=production
export PORT=5000
```

3. **启动服务**
```bash
cd src
npm start
```

### 使用PM2部署
```bash
# 安装PM2
npm install -g pm2

# 启动应用
cd src
pm2 start server.js --name "training-management"

# 查看状态
pm2 status

# 查看日志
pm2 logs training-management
```

### Docker部署
```dockerfile
FROM node:16-alpine

WORKDIR /app

# 复制后端文件
COPY src/package*.json ./
RUN npm install

# 复制前端文件并构建
COPY src/client ./client
WORKDIR /app/client
RUN npm install && npm run build

# 复制后端源码
WORKDIR /app
COPY src .

EXPOSE 5000

CMD ["npm", "start"]
```

## 常见问题

### Q: 如何重置管理员密码？
A: 删除数据库文件 `training_management.db`，重新启动服务器即可创建默认管理员账户。

### Q: 如何备份数据？
A: 直接复制 `training_management.db` 文件即可。

### Q: 如何修改端口？
A: 设置环境变量 `PORT=你的端口号` 或修改 `server.js` 中的端口配置。

### Q: 前端无法连接后端？
A: 检查 `client/package.json` 中的 `proxy` 配置是否正确。

## 技术栈

### 后端
- **Node.js** - 运行时环境
- **Express.js** - Web框架
- **SQLite3** - 数据库
- **JWT** - 身份认证
- **bcryptjs** - 密码加密
- **node-cron** - 定时任务
- **moment** - 时间处理

### 前端
- **React 18** - UI框架
- **Ant Design** - UI组件库
- **React Router** - 路由管理
- **Axios** - HTTP客户端
- **ECharts** - 图表库
- **Moment.js** - 时间处理

## 许可证

MIT License

## 联系方式

如有问题或建议，请创建 Issue 或联系开发团队。

---

© 2024 培训管理系统. 保留所有权利。



