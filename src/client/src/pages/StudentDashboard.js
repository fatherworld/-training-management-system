import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Table, Tag, Rate, Progress, Calendar, Badge, Tabs } from 'antd';
import { CalendarOutlined, BookOutlined, StarOutlined, BellOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import moment from 'moment';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const StudentDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [studentInfo, setStudentInfo] = useState(null);
  const [stats, setStats] = useState({
    totalCourses: 0,
    completedSessions: 0,
    remainingHours: 0,
    averageRating: 0
  });
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [recentEvaluations, setRecentEvaluations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [courseProgress, setCourseProgress] = useState([]);

  useEffect(() => {
    if (user) {
      fetchStudentData();
      fetchUpcomingSessions();
      fetchRecentEvaluations();
      fetchNotifications();
      fetchCourseProgress();
    }
  }, [user]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      // 获取学员统计数据
      const response = await api.get('/student/dashboard-stats');
      setStats(response.data.stats);
      setStudentInfo(response.data.student);
    } catch (error) {
      console.error('获取学员数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingSessions = async () => {
    try {
      const response = await api.get('/student/sessions');
      setUpcomingSessions(response.data.sessions || []);
    } catch (error) {
      console.error('获取即将到来的课程失败:', error);
    }
  };

  const fetchRecentEvaluations = async () => {
    try {
      const response = await api.get('/student/evaluations');
      setRecentEvaluations(response.data.evaluations || []);
    } catch (error) {
      console.error('获取最近点评失败:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/student/notifications', {
        params: { limit: 5 }
      });
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('获取通知失败:', error);
    }
  };

  const fetchCourseProgress = async () => {
    try {
      const response = await api.get('/student/courses');
      setCourseProgress(response.data.courses || []);
    } catch (error) {
      console.error('获取课程进度失败:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'scheduled': 'blue',
      'completed': 'green',
      'cancelled': 'red'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status) => {
    const texts = {
      'scheduled': '已安排',
      'completed': '已完成',
      'cancelled': '已取消'
    };
    return texts[status] || status;
  };

  const sessionColumns = [
    { title: '课程', dataIndex: 'course_name', key: 'course_name' },
    { title: '班级', dataIndex: 'class_name', key: 'class_name' },
    { title: '教师', dataIndex: 'teacher_name', key: 'teacher_name' },
    { 
      title: '上课时间', 
      dataIndex: 'session_date', 
      key: 'session_date',
      render: (date) => moment(date).format('MM-DD HH:mm')
    },
    { title: '课时', dataIndex: 'duration', key: 'duration', render: (duration) => `${duration}h` },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
    }
  ];

  const evaluationColumns = [
    { title: '课程', dataIndex: 'course_name', key: 'course_name' },
    { title: '班级', dataIndex: 'class_name', key: 'class_name' },
    { 
      title: '上课时间', 
      dataIndex: 'session_date', 
      key: 'session_date',
      render: (date) => moment(date).format('MM-DD')
    },
    { 
      title: '评分', 
      dataIndex: 'rating', 
      key: 'rating',
      render: (rating) => <Rate disabled defaultValue={rating} />
    },
    { title: '优点', dataIndex: 'strengths', key: 'strengths', ellipsis: true },
    { title: '改进建议', dataIndex: 'improvements', key: 'improvements', ellipsis: true }
  ];

  // 日历数据处理
  const getListData = (value) => {
    const dateStr = value.format('YYYY-MM-DD');
    const sessionsOnDate = upcomingSessions.filter(session => 
      moment(session.session_date).format('YYYY-MM-DD') === dateStr
    );
    
    return sessionsOnDate.map(session => ({
      type: session.status === 'completed' ? 'success' : 'processing',
      content: `${session.course_name} ${moment(session.session_date).format('HH:mm')}`
    }));
  };

  const dateCellRender = (value) => {
    const listData = getListData(value);
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {listData.map((item, index) => (
          <li key={index}>
            <Badge status={item.type} text={item.content} />
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <Title level={1}>学员中心</Title>
        <Text type="secondary">欢迎回来，{studentInfo?.name || user?.username}！</Text>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <BookOutlined style={{ fontSize: 24, color: '#1890ff', marginRight: 12 }} />
              <div>
                <div style={{ fontSize: 24, fontWeight: 'bold' }}>{stats.totalCourses}</div>
                <div style={{ color: '#666' }}>报名课程</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <CalendarOutlined style={{ fontSize: 24, color: '#52c41a', marginRight: 12 }} />
              <div>
                <div style={{ fontSize: 24, fontWeight: 'bold' }}>{stats.completedSessions}</div>
                <div style={{ color: '#666' }}>已上课时</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <ClockCircleOutlined style={{ fontSize: 24, color: '#faad14', marginRight: 12 }} />
              <div>
                <div style={{ fontSize: 24, fontWeight: 'bold' }}>{stats.remainingHours}</div>
                <div style={{ color: '#666' }}>剩余课时</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <StarOutlined style={{ fontSize: 24, color: '#f5222d', marginRight: 12 }} />
              <div>
                <div style={{ fontSize: 24, fontWeight: 'bold' }}>{stats.averageRating?.toFixed(1) || 0}</div>
                <div style={{ color: '#666' }}>平均评分</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 课程安排和课程进度 */}
        <Col xs={24} lg={16}>
          <Tabs defaultActiveKey="schedule">
            <TabPane tab="课程安排" key="schedule">
              <Card title="即将到来的课程" extra={<CalendarOutlined />}>
                {upcomingSessions.length > 0 ? (
                  <Table
                    columns={sessionColumns}
                    dataSource={upcomingSessions}
                    rowKey="id"
                    pagination={{ pageSize: 5 }}
                    size="small"
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                    暂无即将到来的课程
                  </div>
                )}
              </Card>
            </TabPane>
            
            <TabPane tab="课程进度" key="progress">
              <Card title="我的课程进度" extra={<BookOutlined />}>
                {courseProgress.length > 0 ? (
                  <div>
                    {courseProgress.map(course => (
                      <div key={course.id} style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontWeight: 'bold' }}>{course.course_name}</span>
                          <span>{course.completed_hours}/{course.total_hours} 课时</span>
                        </div>
                        <Progress 
                          percent={Math.round((course.completed_hours / course.total_hours) * 100)}
                          strokeColor="#1890ff"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                    暂无课程进度数据
                  </div>
                )}
              </Card>
            </TabPane>

            <TabPane tab="课程日历" key="calendar">
              <Card title="课程日历" extra={<CalendarOutlined />}>
                <Calendar 
                  dateCellRender={dateCellRender}
                  mode="month"
                />
              </Card>
            </TabPane>
          </Tabs>
        </Col>

        {/* 侧边栏 */}
        <Col xs={24} lg={8}>
          {/* 最近点评 */}
          <Card title="最近点评" extra={<StarOutlined />} style={{ marginBottom: 16 }}>
            {recentEvaluations.length > 0 ? (
              <div>
                {recentEvaluations.slice(0, 3).map(evaluation => (
                  <div key={evaluation.id} style={{ 
                    padding: '12px 0', 
                    borderBottom: '1px solid #f0f0f0' 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 'bold' }}>{evaluation.course_name}</span>
                      <Rate disabled defaultValue={evaluation.rating} />
                    </div>
                    {evaluation.strengths && (
                      <div style={{ color: '#52c41a', fontSize: '14px', marginBottom: 4 }}>
                        优点：{evaluation.strengths}
                      </div>
                    )}
                    {evaluation.improvements && (
                      <div style={{ color: '#faad14', fontSize: '14px' }}>
                        建议：{evaluation.improvements}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                暂无点评记录
              </div>
            )}
          </Card>

          {/* 最新通知 */}
          <Card title="最新通知" extra={<BellOutlined />}>
            {notifications.length > 0 ? (
              <div>
                {notifications.map(notification => (
                  <div key={notification.id} style={{ 
                    padding: '12px 0', 
                    borderBottom: '1px solid #f0f0f0' 
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                      {notification.title}
                    </div>
                    <div style={{ color: '#666', fontSize: '14px', marginBottom: 4 }}>
                      {notification.message}
                    </div>
                    <div style={{ color: '#999', fontSize: '12px' }}>
                      {moment(notification.created_at).format('MM-DD HH:mm')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                暂无新通知
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StudentDashboard;
