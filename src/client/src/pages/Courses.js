import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Input, Modal, Card, Typography, Space, Tag, message, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Title } = Typography;
const { TextArea } = Input;

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/courses');
      setCourses(response.data.courses);
    } catch (error) {
      console.error('获取课程列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingCourse) {
        await api.put(`/courses/${editingCourse.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/courses', values);
        message.success('添加成功');
      }
      setModalVisible(false);
      fetchCourses();
    } catch (error) {
      console.error('保存课程失败:', error);
    }
  };

  const columns = [
    { title: '课程名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '课时(小时)', dataIndex: 'duration', key: 'duration' },
    { title: '价格(元)', dataIndex: 'price', key: 'price', render: (price) => price ? `¥${price}` : '-' },
    { title: '最大人数', dataIndex: 'max_students', key: 'max_students' },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => <Tag color={status === 'active' ? 'green' : 'red'}>{status === 'active' ? '开放' : '停用'}</Tag>
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => {
            setEditingCourse(record);
            form.setFieldsValue(record);
            setModalVisible(true);
          }}>
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={1}>课程管理</Title>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditingCourse(null);
            form.resetFields();
            setModalVisible(true);
          }}>
            添加课程
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={courses}
          rowKey="id"
          loading={loading}
        />
      </Card>

      <Modal
        title={editingCourse ? '编辑课程' : '添加课程'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="课程名称" name="name" rules={[{ required: true, message: '请输入课程名称' }]}>
            <Input placeholder="请输入课程名称" />
          </Form.Item>
          <Form.Item label="课程描述" name="description">
            <TextArea rows={3} placeholder="请输入课程描述" />
          </Form.Item>
          <Form.Item label="课时(小时)" name="duration">
            <InputNumber min={1} placeholder="请输入课时" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="价格(元)" name="price">
            <InputNumber min={0} placeholder="请输入价格" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="最大学员数" name="max_students">
            <InputNumber min={1} placeholder="请输入最大学员数" style={{ width: '100%' }} />
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

export default Courses;



