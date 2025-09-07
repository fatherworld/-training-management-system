import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Typography, Spin, Alert } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  BookOutlined,
  ScheduleOutlined,
  CalendarOutlined,
  SoundOutlined,
  TrophyOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import api from '../services/api';
import moment from 'moment';

const { Title, Text } = Typography;

const Dashboard = () => {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/analytics/dashboard');
      setStats(response.data.stats);
    } catch (error) {
      console.error('获取仪表板数据失败:', error);
      setError('获取数据失败，请刷新页面重试');
    } finally {
      setLoading(false);
    }
  };

  const getEnrollmentTrendOption = () => {
    // 模拟最近7天的报名趋势数据
    const days = [];
    const enrollments = [];
    
    for (let i = 6; i >= 0; i--) {
      days.push(moment().subtract(i, 'days').format('MM-DD'));
      enrollments.push(Math.floor(Math.random() * 10) + 1);
    }

    return {
      title: {
        text: '最近7天报名趋势',
        left: 'center',
        textStyle: { fontSize: 16 }
      },
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: days
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          data: enrollments,
          type: 'line',
          smooth: true,
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [{
                offset: 0, color: 'rgba(24, 144, 255, 0.3)'
              }, {
                offset: 1, color: 'rgba(24, 144, 255, 0.05)'
              }]
            }
          },
          lineStyle: {
            color: '#1890ff'
          },
          itemStyle: {
            color: '#1890ff'
          }
        }
      ]
    };
  };

  const getCourseDistributionOption = () => {
    // 模拟课程分布数据
    const courseData = [
      { value: 35, name: 'JavaScript基础' },
      { value: 28, name: 'React进阶' },
      { value: 22, name: 'Vue.js实战' },
      { value: 15, name: 'Node.js开发' }
    ];

    return {
      title: {
        text: '课程报名分布',
        left: 'center',
        textStyle: { fontSize: 16 }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left'
      },
      series: [
        {
          name: '课程报名',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '18',
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: courseData
        }
      ]
    };
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="加载失败"
        description={error}
        type="error"
        showIcon
        action={
          <button onClick={fetchDashboardData}>
            重试
          </button>
        }
      />
    );
  }

  return (
    <div>
      <div className="page-header">
        <Title level={1}>仪表板</Title>
        <Text type="secondary">
          系统概览和关键指标监控 - {moment().format('YYYY年MM月DD日')}
        </Text>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="学员总数"
              value={stats.totalStudents || 0}
              prefix={<UserOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="教师总数"
              value={stats.totalTeachers || 0}
              prefix={<TeamOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="课程总数"
              value={stats.totalCourses || 0}
              prefix={<BookOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="班级总数"
              value={stats.totalClasses || 0}
              prefix={<ScheduleOutlined style={{ color: '#f5222d' }} />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 今日数据 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="今日课程"
              value={stats.todaySessions || 0}
              prefix={<CalendarOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="今日试听"
              value={stats.todayTrials || 0}
              prefix={<SoundOutlined style={{ color: '#eb2f96' }} />}
              valueStyle={{ color: '#eb2f96' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="本月报名"
              value={stats.monthlyEnrollments || 0}
              prefix={<TrophyOutlined style={{ color: '#13c2c2' }} />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="本月收入"
              value={stats.monthlyRevenue || 0}
              prefix={<DollarOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16' }}
              suffix="元"
            />
          </Card>
        </Col>
      </Row>

      {/* 图表 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <div className="chart-container">
            <ReactECharts 
              option={getEnrollmentTrendOption()} 
              style={{ height: 300 }}
            />
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <div className="chart-container">
            <ReactECharts 
              option={getCourseDistributionOption()} 
              style={{ height: 300 }}
            />
          </div>
        </Col>
      </Row>

      {/* 快速操作 */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card title="快速操作" style={{ textAlign: 'center' }}>
            <Text type="secondary">
              选择左侧菜单进行相应的管理操作，或查看详细的数据分析报告
            </Text>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;

