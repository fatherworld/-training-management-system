import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Form, Input, Select, Modal, Card, Typography, 
  Space, Tag, Popconfirm, message, Row, Col, Statistic 
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  UserOutlined, PhoneOutlined, MailOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import api from '../services/api';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const Students = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState({});
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchStudents();
    fetchStats();
  }, [pagination.current, pagination.pageSize, filters]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        ...filters,
      };
      
      const response = await api.get('/students', { params });
      setStudents(response.data.students);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total,
      }));
    } catch (error) {
      console.error('获取学员列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // 获取学员统计数据
      const response = await api.get('/students', { 
        params: { limit: 1000 } // 获取所有数据用于统计
      });
      const allStudents = response.data.students;
      
      const activeCount = allStudents.filter(s => s.status === 'active').length;
      const inactiveCount = allStudents.filter(s => s.status === 'inactive').length;
      const thisMonthCount = allStudents.filter(s => 
        moment(s.enrollment_date).isSame(moment(), 'month')
      ).length;
      
      setStats({
        total: allStudents.length,
        active: activeCount,
        inactive: inactiveCount,
        thisMonth: thisMonthCount,
      });
    } catch (error) {
      console.error('获取学员统计失败:', error);
    }
  };

  const handleAdd = () => {
    setEditingStudent(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    form.setFieldsValue(student);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/students/${id}`);
      message.success('删除成功');
      fetchStudents();
      fetchStats();
    } catch (error) {
      console.error('删除学员失败:', error);
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingStudent) {
        await api.put(`/students/${editingStudent.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/students', values);
        message.success('添加成功');
      }
      setModalVisible(false);
      fetchStudents();
      fetchStats();
    } catch (error) {
      console.error('保存学员失败:', error);
    }
  };

  const handleSearch = (values) => {
    setFilters(values);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleTableChange = (pagination) => {
    setPagination(pagination);
  };

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <UserOutlined />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: '电话',
      dataIndex: 'phone',
      key: 'phone',
      render: (text) => (
        <Space>
          <PhoneOutlined />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (text) => text ? (
        <Space>
          <MailOutlined />
          <span>{text}</span>
        </Space>
      ) : '-',
    },
    {
      title: '年龄',
      dataIndex: 'age',
      key: 'age',
      width: 80,
      render: (text) => text ? `${text}岁` : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '活跃' : '停课'}
        </Tag>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'enrollment_date',
      key: 'enrollment_date',
      width: 120,
      render: (date) => moment(date).format('YYYY-MM-DD'),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <div className="table-actions">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个学员吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={1}>学员管理</Title>
        <Text type="secondary">管理培训机构的所有学员信息</Text>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card className="stat-card">
            <Statistic
              title="学员总数"
              value={stats.total || 0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="stat-card">
            <Statistic
              title="活跃学员"
              value={stats.active || 0}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="stat-card">
            <Statistic
              title="停课学员"
              value={stats.inactive || 0}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="stat-card">
            <Statistic
              title="本月新增"
              value={stats.thisMonth || 0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 搜索和操作 */}
      <Card className="filter-form">
        <Form
          form={searchForm}
          layout="inline"
          onFinish={handleSearch}
          style={{ marginBottom: 16 }}
        >
          <Form.Item name="search">
            <Input
              placeholder="搜索学员姓名或电话"
              prefix={<SearchOutlined />}
              style={{ width: 250 }}
            />
          </Form.Item>
          <Form.Item name="status">
            <Select placeholder="选择状态" style={{ width: 120 }} allowClear>
              <Option value="active">活跃</Option>
              <Option value="inactive">停课</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
              搜索
            </Button>
          </Form.Item>
          <Form.Item>
            <Button onClick={() => {
              searchForm.resetFields();
              setFilters({});
              setPagination(prev => ({ ...prev, current: 1 }));
            }}>
              重置
            </Button>
          </Form.Item>
        </Form>

        <div className="action-buttons">
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAdd}
          >
            添加学员
          </Button>
        </div>
      </Card>

      {/* 学员列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={students}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* 添加/编辑模态框 */}
      <Modal
        title={editingStudent ? '编辑学员' : '添加学员'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="姓名"
                name="name"
                rules={[{ required: true, message: '请输入学员姓名' }]}
              >
                <Input placeholder="请输入学员姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="电话"
                name="phone"
                rules={[
                  { required: true, message: '请输入电话号码' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' }
                ]}
              >
                <Input placeholder="请输入电话号码" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  { type: 'email', message: '请输入正确的邮箱地址' }
                ]}
              >
                <Input placeholder="请输入邮箱地址" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="年龄"
                name="age"
                rules={[
                  { type: 'number', min: 1, max: 120, message: '请输入正确的年龄' }
                ]}
              >
                <Input type="number" placeholder="请输入年龄" />
              </Form.Item>
            </Col>
          </Row>

          {editingStudent && (
            <Form.Item
              label="状态"
              name="status"
              rules={[{ required: true, message: '请选择状态' }]}
            >
              <Select placeholder="请选择状态">
                <Option value="active">活跃</Option>
                <Option value="inactive">停课</Option>
              </Select>
            </Form.Item>
          )}

          <Form.Item label="备注" name="notes">
            <TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingStudent ? '更新' : '添加'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Students;

