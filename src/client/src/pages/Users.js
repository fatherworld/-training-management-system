import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Typography, Tag, Modal, Form, Select, Input, message, Space, Tabs } from 'antd';
import { PlusOutlined, DeleteOutlined, KeyOutlined, UserAddOutlined } from '@ant-design/icons';
import api from '../services/api';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [teachersWithoutAccount, setTeachersWithoutAccount] = useState([]);
  const [studentsWithoutAccount, setStudentsWithoutAccount] = useState([]);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();

  useEffect(() => {
    fetchUsers();
    fetchTeachersWithoutAccount();
    fetchStudentsWithoutAccount();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      setUsers(response.data.users);
    } catch (error) {
      console.error('获取用户列表失败:', error);
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachersWithoutAccount = async () => {
    try {
      const response = await api.get('/users/teachers-without-account');
      setTeachersWithoutAccount(response.data.teachers);
    } catch (error) {
      console.error('获取教师列表失败:', error);
    }
  };

  const fetchStudentsWithoutAccount = async () => {
    try {
      const response = await api.get('/users/students-without-account');
      setStudentsWithoutAccount(response.data.students);
    } catch (error) {
      console.error('获取学员列表失败:', error);
    }
  };

  const handleCreateTeacherAccount = async (values) => {
    try {
      await api.post('/users/teacher', values);
      message.success('教师账户创建成功');
      setModalVisible(false);
      fetchUsers();
      fetchTeachersWithoutAccount();
    } catch (error) {
      console.error('创建教师账户失败:', error);
      const errorMessage = error.response?.data?.error || '创建失败';
      message.error(errorMessage);
    }
  };

  const handleCreateStudentAccount = async (values) => {
    try {
      await api.post('/users/student', values);
      message.success('学员账户创建成功');
      setModalVisible(false);
      fetchUsers();
      fetchStudentsWithoutAccount();
    } catch (error) {
      console.error('创建学员账户失败:', error);
      const errorMessage = error.response?.data?.error || '创建失败';
      message.error(errorMessage);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await api.delete(`/users/${userId}`);
      message.success('删除成功');
      fetchUsers();
      fetchTeachersWithoutAccount();
      fetchStudentsWithoutAccount();
    } catch (error) {
      console.error('删除用户失败:', error);
      const errorMessage = error.response?.data?.error || '删除失败';
      message.error(errorMessage);
    }
  };

  const handleResetPassword = async (values) => {
    try {
      await api.put(`/users/${selectedUser.id}/password`, values);
      message.success('密码重置成功');
      setPasswordModalVisible(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('密码重置失败:', error);
      const errorMessage = error.response?.data?.error || '密码重置失败';
      message.error(errorMessage);
    }
  };

  const getRoleText = (role) => {
    const roles = {
      'admin': '管理员',
      'teacher': '教师',
      'student': '学员'
    };
    return roles[role] || role;
  };

  const getRoleColor = (role) => {
    const colors = {
      'admin': 'red',
      'teacher': 'blue',
      'student': 'green'
    };
    return colors[role] || 'default';
  };

  const columns = [
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '姓名', dataIndex: 'display_name', key: 'display_name' },
    { title: '电话', dataIndex: 'phone', key: 'phone' },
    { 
      title: '角色', 
      dataIndex: 'role', 
      key: 'role',
      render: (role) => <Tag color={getRoleColor(role)}>{getRoleText(role)}</Tag>
    },
    { 
      title: '创建时间', 
      dataIndex: 'created_at', 
      key: 'created_at',
      render: (time) => moment(time).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button 
            size="small" 
            icon={<KeyOutlined />}
            onClick={() => {
              setSelectedUser(record);
              passwordForm.resetFields();
              setPasswordModalVisible(true);
            }}
          >
            重置密码
          </Button>
          {record.role !== 'admin' && (
            <Button 
              size="small" 
              icon={<DeleteOutlined />}
              danger
              onClick={() => {
                Modal.confirm({
                  title: '确认删除',
                  content: `确定要删除用户 "${record.username}" 吗？`,
                  onOk: () => handleDeleteUser(record.id)
                });
              }}
            >
              删除
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={1}>用户管理</Title>
      </div>

      <Card>
        <Tabs defaultActiveKey="users">
          <TabPane tab="用户列表" key="users">
            <Table
              columns={columns}
              dataSource={users}
              rowKey="id"
              loading={loading}
            />
          </TabPane>
          
          <TabPane tab="创建教师账户" key="create-teacher">
            <div style={{ marginBottom: 16 }}>
              <Button 
                type="primary" 
                icon={<UserAddOutlined />} 
                onClick={() => {
                  form.resetFields();
                  setModalVisible(true);
                }}
                disabled={teachersWithoutAccount.length === 0}
              >
                为教师创建账户
              </Button>
              {teachersWithoutAccount.length === 0 && (
                <div style={{ marginTop: 8, color: '#999' }}>
                  所有教师都已有用户账户
                </div>
              )}
            </div>
            
            <Table
              columns={[
                { title: '教师姓名', dataIndex: 'name', key: 'name' },
                { title: '联系电话', dataIndex: 'phone', key: 'phone' },
                { title: '专业领域', dataIndex: 'specialties', key: 'specialties' },
                { 
                  title: '状态', 
                  dataIndex: 'status', 
                  key: 'status',
                  render: (status) => <Tag color={status === 'active' ? 'green' : 'red'}>
                    {status === 'active' ? '活跃' : '停用'}
                  </Tag>
                },
                {
                  title: '操作',
                  key: 'action',
                  render: (_, record) => (
                    <Button 
                      type="primary"
                      size="small"
                      onClick={() => {
                        form.setFieldsValue({ teacher_id: record.id });
                        setModalVisible(true);
                      }}
                    >
                      创建账户
                    </Button>
                  ),
                },
              ]}
              dataSource={teachersWithoutAccount}
              rowKey="id"
              pagination={false}
            />
          </TabPane>

          <TabPane tab="创建学员账户" key="create-student">
            <div style={{ marginBottom: 16 }}>
              <Button 
                type="primary" 
                icon={<UserAddOutlined />} 
                onClick={() => {
                  form.resetFields();
                  setModalVisible(true);
                }}
                disabled={studentsWithoutAccount.length === 0}
              >
                为学员创建账户
              </Button>
              {studentsWithoutAccount.length === 0 && (
                <div style={{ marginTop: 8, color: '#999' }}>
                  所有学员都已有用户账户
                </div>
              )}
            </div>
            
            <Table
              columns={[
                { title: '学员姓名', dataIndex: 'name', key: 'name' },
                { title: '联系电话', dataIndex: 'phone', key: 'phone' },
                { title: '年龄', dataIndex: 'age', key: 'age' },
                { 
                  title: '状态', 
                  dataIndex: 'status', 
                  key: 'status',
                  render: (status) => <Tag color={status === 'active' ? 'green' : 'red'}>
                    {status === 'active' ? '活跃' : '停用'}
                  </Tag>
                },
                {
                  title: '操作',
                  key: 'action',
                  render: (_, record) => (
                    <Button 
                      type="primary"
                      size="small"
                      onClick={() => {
                        form.setFieldsValue({ student_id: record.id });
                        setModalVisible(true);
                      }}
                    >
                      创建账户
                    </Button>
                  ),
                },
              ]}
              dataSource={studentsWithoutAccount}
              rowKey="id"
              pagination={false}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* 创建账户模态框 */}
      <Modal
        title="创建用户账户"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form 
          form={form} 
          layout="vertical" 
          onFinish={(values) => {
            if (values.teacher_id) {
              handleCreateTeacherAccount(values);
            } else if (values.student_id) {
              handleCreateStudentAccount(values);
            }
          }}
        >
          <Form.Item name="teacher_id" style={{ display: 'none' }}>
            <Input />
          </Form.Item>
          <Form.Item name="student_id" style={{ display: 'none' }}>
            <Input />
          </Form.Item>
          
          <Form.Item 
            label="用户名" 
            name="username" 
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          
          <Form.Item 
            label="密码" 
            name="password" 
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码长度至少6位' }
            ]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">创建</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 重置密码模态框 */}
      <Modal
        title={`重置密码 - ${selectedUser?.username}`}
        open={passwordModalVisible}
        onCancel={() => {
          setPasswordModalVisible(false);
          setSelectedUser(null);
        }}
        footer={null}
        width={400}
      >
        <Form form={passwordForm} layout="vertical" onFinish={handleResetPassword}>
          <Form.Item 
            label="新密码" 
            name="password" 
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度至少6位' }
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button onClick={() => {
                setPasswordModalVisible(false);
                setSelectedUser(null);
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">重置密码</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Users;


