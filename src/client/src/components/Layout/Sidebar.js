import React from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  BookOutlined,
  ScheduleOutlined,
  SoundOutlined,
  CalendarOutlined,
  StarOutlined,
  BellOutlined,
  BarChartOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const { Sider } = Layout;

// 管理员菜单
const adminMenuItems = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '仪表板',
  },
  {
    key: '/students',
    icon: <UserOutlined />,
    label: '学员管理',
  },
  {
    key: '/teachers',
    icon: <TeamOutlined />,
    label: '教师管理',
  },
  {
    key: '/courses',
    icon: <BookOutlined />,
    label: '课程管理',
  },
  {
    key: '/classes',
    icon: <ScheduleOutlined />,
    label: '班级管理',
  },
  {
    key: '/trials',
    icon: <SoundOutlined />,
    label: '试听管理',
  },
  {
    key: '/sessions',
    icon: <CalendarOutlined />,
    label: '课程安排',
  },
  {
    key: '/evaluations',
    icon: <StarOutlined />,
    label: '课后点评',
  },
  {
    key: '/notifications',
    icon: <BellOutlined />,
    label: '通知管理',
  },
  {
    key: '/analytics',
    icon: <BarChartOutlined />,
    label: '数据分析',
  },
  {
    key: '/users',
    icon: <SettingOutlined />,
    label: '用户管理',
  },
];

// 教师菜单
const teacherMenuItems = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '工作台',
  },
  {
    key: '/my-sessions',
    icon: <CalendarOutlined />,
    label: '我的课程',
  },
  {
    key: '/my-evaluations',
    icon: <StarOutlined />,
    label: '学员点评',
  },
  {
    key: '/my-notifications',
    icon: <BellOutlined />,
    label: '我的通知',
  },
];

// 学员菜单
const studentMenuItems = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '学员中心',
  },
  {
    key: '/my-courses',
    icon: <BookOutlined />,
    label: '我的课程',
  },
  {
    key: '/my-evaluations',
    icon: <StarOutlined />,
    label: '我的点评',
  },
  {
    key: '/my-notifications',
    icon: <BellOutlined />,
    label: '我的通知',
  },
];

const Sidebar = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  // 根据用户角色获取菜单项
  const getMenuItems = () => {
    switch (user?.role) {
      case 'admin':
        return adminMenuItems;
      case 'teacher':
        return teacherMenuItems;
      case 'student':
        return studentMenuItems;
      default:
        return adminMenuItems;
    }
  };

  return (
    <Sider 
      trigger={null} 
      collapsible 
      collapsed={collapsed}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
      }}
    >
      <div style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.1)',
        margin: 16,
        borderRadius: 6,
        color: 'white',
        fontWeight: 'bold',
        fontSize: collapsed ? 14 : 16,
      }}>
        {collapsed ? 'TMS' : '培训管理系统'}
      </div>
      
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={getMenuItems()}
        onClick={handleMenuClick}
        style={{ borderRight: 0 }}
      />
    </Sider>
  );
};

export default Sidebar;

