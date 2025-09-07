import React, { useState, useEffect } from 'react';
import { Card, Typography, Row, Col, Statistic, Select, Button } from 'antd';
import { UserOutlined, DollarOutlined, BookOutlined, TrophyOutlined, DownloadOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import api from '../services/api';

const { Title } = Typography;
const { Option } = Select;

const Analytics = () => {
  const [period, setPeriod] = useState('30days');
  const [studentAnalytics, setStudentAnalytics] = useState({});
  const [financialAnalytics, setFinancialAnalytics] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [studentRes, financialRes] = await Promise.all([
        api.get('/analytics/students', { params: { period } }),
        api.get('/analytics/financial', { params: { period } })
      ]);
      
      setStudentAnalytics(studentRes.data.analytics);
      setFinancialAnalytics(financialRes.data.analytics);
    } catch (error) {
      console.error('获取分析数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEnrollmentTrendOption = () => {
    const data = studentAnalytics.enrollmentTrend || [];
    return {
      title: { text: '学员报名趋势', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: data.map(item => item.date)
      },
      yAxis: { type: 'value' },
      series: [{
        data: data.map(item => item.count),
        type: 'line',
        smooth: true
      }]
    };
  };

  const getRevenueTrendOption = () => {
    const data = financialAnalytics.revenueTrend || [];
    return {
      title: { text: '收入趋势', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: data.map(item => item.date)
      },
      yAxis: { type: 'value' },
      series: [{
        data: data.map(item => item.revenue),
        type: 'bar',
        itemStyle: { color: '#1890ff' }
      }]
    };
  };

  const getCourseRevenueOption = () => {
    const data = financialAnalytics.courseRevenue || [];
    return {
      title: { text: '课程收入分布', left: 'center' },
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: '50%',
        data: data.map(item => ({
          value: item.revenue,
          name: item.course_name
        }))
      }]
    };
  };

  // 计算汇总统计
  const totalRevenue = (financialAnalytics.revenueTrend || []).reduce((sum, item) => sum + (item.revenue || 0), 0);
  const totalEnrollments = (studentAnalytics.enrollmentTrend || []).reduce((sum, item) => sum + (item.count || 0), 0);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={1}>数据分析</Title>
          <div style={{ marginTop: 16 }}>
            <Select value={period} onChange={setPeriod} style={{ width: 150 }}>
              <Option value="7days">最近7天</Option>
              <Option value="30days">最近30天</Option>
              <Option value="3months">最近3个月</Option>
              <Option value="1year">最近1年</Option>
            </Select>
          </div>
        </div>
        <Button type="primary" icon={<DownloadOutlined />} onClick={() => alert('导出报告功能开发中...')}>
          导出报告
        </Button>
      </div>

      {/* 汇总统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card className="stat-card">
            <Statistic
              title="总报名人数"
              value={totalEnrollments}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="stat-card">
            <Statistic
              title="总收入"
              value={totalRevenue}
              prefix={<DollarOutlined />}
              suffix="元"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="stat-card">
            <Statistic
              title="课程数量"
              value={(financialAnalytics.courseRevenue || []).length}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="stat-card">
            <Statistic
              title="平均客单价"
              value={totalEnrollments > 0 ? Math.round(totalRevenue / totalEnrollments) : 0}
              prefix={<TrophyOutlined />}
              suffix="元"
              valueStyle={{ color: '#722ed1' }}
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
              showLoading={loading}
            />
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <div className="chart-container">
            <ReactECharts 
              option={getRevenueTrendOption()} 
              style={{ height: 300 }}
              showLoading={loading}
            />
          </div>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <div className="chart-container">
            <ReactECharts 
              option={getCourseRevenueOption()} 
              style={{ height: 300 }}
              showLoading={loading}
            />
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="数据洞察" style={{ height: 300 }}>
            <div style={{ padding: '20px 0' }}>
              <p>• 当前期间内共有 {totalEnrollments} 人次报名</p>
              <p>• 总收入达到 ¥{totalRevenue.toLocaleString()}</p>
              <p>• 平均每人消费 ¥{totalEnrollments > 0 ? Math.round(totalRevenue / totalEnrollments) : 0}</p>
              <p>• 共有 {(financialAnalytics.courseRevenue || []).length} 门课程产生收入</p>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Analytics;
