import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Input, Modal, Card, Typography, Space, Tag, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Title } = Typography;

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/teachers');
      setTeachers(response.data.teachers);
    } catch (error) {
      console.error('获取教师列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingTeacher) {
        await api.put(`/teachers/${editingTeacher.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/teachers', values);
        message.success('添加成功');
      }
      setModalVisible(false);
      fetchTeachers();
    } catch (error) {
      console.error('保存教师失败:', error);
    }
  };

  const columns = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '电话', dataIndex: 'phone', key: 'phone' },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    { title: '专长', dataIndex: 'specialties', key: 'specialties' },
    { title: '时薪', dataIndex: 'hourly_rate', key: 'hourly_rate', render: (rate) => rate ? `¥${rate}` : '-' },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => <Tag color={status === 'active' ? 'green' : 'red'}>{status === 'active' ? '活跃' : '停用'}</Tag>
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={1}>教师管理</Title>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditingTeacher(null);
            form.resetFields();
            setModalVisible(true);
          }}>
            添加教师
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={teachers}
          rowKey="id"
          loading={loading}
        />
      </Card>

      <Modal
        title={editingTeacher ? '编辑教师' : '添加教师'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="姓名" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="电话" name="phone" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="邮箱" name="email">
            <Input />
          </Form.Item>
          <Form.Item label="专长" name="specialties">
            <Input />
          </Form.Item>
          <Form.Item label="时薪" name="hourly_rate">
            <Input type="number" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">保存</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Teachers;

