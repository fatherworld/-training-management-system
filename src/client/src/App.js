import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout, message } from 'antd';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import Courses from './pages/Courses';
import Classes from './pages/Classes';
import Trials from './pages/Trials';
import Sessions from './pages/Sessions';
import Evaluations from './pages/Evaluations';
import Notifications from './pages/Notifications';
import Analytics from './pages/Analytics';
import Users from './pages/Users';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import api from './services/api';

const { Content } = Layout;

function AppContent() {
  const { user, setUser } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // 验证token有效性
      api.get('/auth/me')
        .then(response => {
          setUser(response.data.user);
        })
        .catch(error => {
          console.error('Token验证失败:', error);
          localStorage.removeItem('token');
          message.error('登录已过期，请重新登录');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [setUser]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        加载中...
      </div>
    );
  }

  // 如果没有用户登录，显示路由（包括登录页面）
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ 
        marginLeft: collapsed ? 80 : 200, 
        transition: 'margin-left 0.2s' 
      }}>
        <Header 
          collapsed={collapsed} 
          setCollapsed={setCollapsed}
          user={user}
        />
        <Content style={{ 
          padding: '24px',
          overflow: 'initial',
          minHeight: 'calc(100vh - 64px)',
          backgroundColor: '#f5f5f5'
        }}>
          <div className="site-layout-background" style={{ 
            padding: 24, 
            minHeight: 'calc(100vh - 152px)',
            borderRadius: 8,
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              {/* 根据用户角色显示不同的仪表板 */}
              <Route path="/dashboard" element={
                user?.role === 'admin' ? <Dashboard /> :
                user?.role === 'teacher' ? <TeacherDashboard /> :
                user?.role === 'student' ? <StudentDashboard /> :
                <Dashboard />
              } />
              
              {/* 管理员专用页面 */}
              {user?.role === 'admin' && (
                <>
                  <Route path="/students" element={<Students />} />
                  <Route path="/teachers" element={<Teachers />} />
                  <Route path="/courses" element={<Courses />} />
                  <Route path="/classes" element={<Classes />} />
                  <Route path="/trials" element={<Trials />} />
                  <Route path="/sessions" element={<Sessions />} />
                  <Route path="/evaluations" element={<Evaluations />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/users" element={<Users />} />
                </>
              )}
              
              {/* 教师专用页面 */}
              {user?.role === 'teacher' && (
                <>
                  <Route path="/my-sessions" element={<Sessions />} />
                  <Route path="/my-evaluations" element={<Evaluations />} />
                  <Route path="/my-notifications" element={<Notifications />} />
                </>
              )}
              
              {/* 学员专用页面 */}
              {user?.role === 'student' && (
                <>
                  <Route path="/my-courses" element={<Sessions />} />
                  <Route path="/my-evaluations" element={<Evaluations />} />
                  <Route path="/my-notifications" element={<Notifications />} />
                </>
              )}
              
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
