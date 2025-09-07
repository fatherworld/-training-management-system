import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Table, Tag, Button, Modal, Form, Rate, Input, Select, message, Calendar, Badge } from 'antd';
import { CalendarOutlined, UserOutlined, StarOutlined, BellOutlined, EditOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import moment from 'moment';

const { Title, Text } = Typography;
const { TextArea } = Input;

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    todayClasses: 0,
    weekClasses: 0,
    totalStudents: 0,
    pendingEvaluations: 0
  });
  const [todaySessions, setTodaySessions] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [evaluationModalVisible, setEvaluationModalVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionStudents, setSessionStudents] = useState([]);
  const [form] = Form.useForm();

  useEffect(() => {
    if (user) {
      fetchTeacherData();
      fetchTodaySessions();
      fetchUpcomingSessions();
      fetchNotifications();
    }
  }, [user]);

  const fetchTeacherData = async () => {
    try {
      setLoading(true);
      // 获取教师统计数据
      const response = await api.get('/teacher/dashboard-stats');
      setStats(response.data.stats);
    } catch (error) {
      console.error('获取教师数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodaySessions = async () => {
    try {
      const response = await api.get('/teacher/sessions', {
        params: { date_from: moment().format('YYYY-MM-DD'), date_to: moment().format('YYYY-MM-DD') }
      });
      setTodaySessions(response.data.sessions || []);
    } catch (error) {
      console.error('获取今日课程失败:', error);
    }
  };

  const fetchUpcomingSessions = async () => {
    try {
      const weekStart = moment().startOf('week').format('YYYY-MM-DD');
      const weekEnd = moment().endOf('week').format('YYYY-MM-DD');
      const response = await api.get('/teacher/sessions', {
        params: { date_from: weekStart, date_to: weekEnd }
      });
      setUpcomingSessions(response.data.sessions || []);
    } catch (error) {
      console.error('获取本周课程失败:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/teacher/notifications', {
        params: { limit: 5 }
      });
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('获取通知失败:', error);
    }
  };

  const fetchSessionStudents = async (sessionId) => {
    try {
      const response = await api.get(`/sessions/${sessionId}`);
      setSessionStudents(response.data.students || []);
    } catch (error) {
      console.error('获取学员列表失败:', error);
      message.error('获取学员列表失败');
    }
  };

  const handleCreateEvaluation = (session) => {
    setSelectedSession(session);
    fetchSessionStudents(session.id);
    setEvaluationModalVisible(true);
  };

  const handleSubmitEvaluation = async (values) => {
    try {
      await api.post('/evaluations', {
        ...values,
        session_id: selectedSession.id
      });
      message.success('点评创建成功');
      setEvaluationModalVisible(false);
      form.resetFields();
      fetchTeacherData(); // 刷新统计数据
    } catch (error) {
      console.error('创建点评失败:', error);
      const errorMessage = error.response?.data?.error || '创建点评失败';
      message.error(errorMessage);
    }
  };

  const handleCompleteSession = async (sessionId) => {
    try {
      await api.post(`/sessions/${sessionId}/attendance`, {
        attendance: [{ status: 'completed' }]
      });
      message.success('课程标记完成');
      fetchTodaySessions();
      fetchUpcomingSessions();
    } catch (error) {
      console.error('标记课程完成失败:', error);
      message.error('操作失败');
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
    { title: '班级', dataIndex: 'class_name', key: 'class_name' },
    { title: '课程', dataIndex: 'course_name', key: 'course_name' },
    { 
      title: '上课时间', 
      dataIndex: 'session_date', 
      key: 'session_date',
      render: (date) => moment(date).format('HH:mm')
    },
    { title: '课时长度', dataIndex: 'duration', key: 'duration', render: (duration) => `${duration}小时` },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <div>
          {record.status === 'scheduled' && (
            <>
              <Button 
                size="small" 
                type="primary"
                style={{ marginRight: 8 }}
                onClick={() => handleCompleteSession(record.id)}
              >
                标记完成
              </Button>
              <Button 
                size="small" 
                icon={<StarOutlined />}
                onClick={() => handleCreateEvaluation(record)}
              >
                课后点评
              </Button>
            </>
          )}
          {record.status === 'completed' && (
            <Button 
              size="small" 
              icon={<StarOutlined />}
              onClick={() => handleCreateEvaluation(record)}
            >
              添加点评
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <Title level={1}>教师工作台</Title>
        <Text type="secondary">欢迎回来，{user?.username}！</Text>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <CalendarOutlined style={{ fontSize: 24, color: '#1890ff', marginRight: 12 }} />
              <div>
                <div style={{ fontSize: 24, fontWeight: 'bold' }}>{stats.todayClasses}</div>
                <div style={{ color: '#666' }}>今日课程</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <CalendarOutlined style={{ fontSize: 24, color: '#52c41a', marginRight: 12 }} />
              <div>
                <div style={{ fontSize: 24, fontWeight: 'bold' }}>{stats.weekClasses}</div>
                <div style={{ color: '#666' }}>本周课程</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <UserOutlined style={{ fontSize: 24, color: '#faad14', marginRight: 12 }} />
              <div>
                <div style={{ fontSize: 24, fontWeight: 'bold' }}>{stats.totalStudents}</div>
                <div style={{ color: '#666' }}>教授学员</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <StarOutlined style={{ fontSize: 24, color: '#f5222d', marginRight: 12 }} />
              <div>
                <div style={{ fontSize: 24, fontWeight: 'bold' }}>{stats.pendingEvaluations}</div>
                <div style={{ color: '#666' }}>待点评</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 今日课程 */}
        <Col xs={24} lg={12}>
          <Card title="今日课程" extra={<CalendarOutlined />}>
            {todaySessions.length > 0 ? (
              <Table
                columns={sessionColumns}
                dataSource={todaySessions}
                rowKey="id"
                pagination={false}
                size="small"
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                今天没有安排课程
              </div>
            )}
          </Card>
        </Col>

        {/* 本周课程 */}
        <Col xs={24} lg={12}>
          <Card title="本周课程" extra={<CalendarOutlined />}>
            {upcomingSessions.length > 0 ? (
              <Table
                columns={sessionColumns.filter(col => col.key !== 'action')}
                dataSource={upcomingSessions.slice(0, 5)}
                rowKey="id"
                pagination={false}
                size="small"
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                本周没有安排课程
              </div>
            )}
          </Card>
        </Col>

        {/* 最新通知 */}
        <Col xs={24}>
          <Card title="最新通知" extra={<BellOutlined />}>
            {notifications.length > 0 ? (
              <div>
                {notifications.map(notification => (
                  <div key={notification.id} style={{ 
                    padding: '12px 0', 
                    borderBottom: '1px solid #f0f0f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                        {notification.title}
                      </div>
                      <div style={{ color: '#666', fontSize: '14px' }}>
                        {notification.message}
                      </div>
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

      {/* 课后点评模态框 */}
      <Modal
        title={`课后点评 - ${selectedSession?.class_name}`}
        open={evaluationModalVisible}
        onCancel={() => {
          setEvaluationModalVisible(false);
          setSelectedSession(null);
          form.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmitEvaluation}>
          <Form.Item label="选择学员" name="student_id" rules={[{ required: true, message: '请选择学员' }]}>
            <Select placeholder="请选择学员">
              {sessionStudents.map(student => (
                <Select.Option key={student.id} value={student.id}>
                  {student.name} - {student.phone}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item label="评分" name="rating" rules={[{ required: true, message: '请选择评分' }]}>
            <Rate />
          </Form.Item>
          
          <Form.Item label="优点表现" name="strengths">
            <TextArea rows={3} placeholder="请输入学员的优点表现" />
          </Form.Item>
          
          <Form.Item label="改进建议" name="improvements">
            <TextArea rows={3} placeholder="请输入改进建议" />
          </Form.Item>
          
          <Form.Item label="作业安排" name="homework">
            <TextArea rows={2} placeholder="请输入作业安排" />
          </Form.Item>
          
          <Form.Item label="教师备注" name="teacher_notes">
            <TextArea rows={2} placeholder="请输入教师备注" />
          </Form.Item>
          
          <Form.Item>
            <div style={{ textAlign: 'right' }}>
              <Button onClick={() => {
                setEvaluationModalVisible(false);
                setSelectedSession(null);
                form.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" style={{ marginLeft: 8 }}>
                提交点评
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TeacherDashboard;
