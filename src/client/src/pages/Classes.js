import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Typography, Space, Tag, Modal, Form, Input, Select, DatePicker, TimePicker, InputNumber, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import moment from 'moment';
import api from '../services/api';

const { Title } = Typography;

const Classes = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchClasses();
    fetchCourses();
    fetchTeachers();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/classes');
      setClasses(response.data.classes);
    } catch (error) {
      console.error('获取班级列表失败:', error);
      message.error('获取班级列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses');
      setCourses(response.data.courses);
    } catch (error) {
      console.error('获取课程列表失败:', error);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await api.get('/teachers');
      setTeachers(response.data.teachers);
    } catch (error) {
      console.error('获取教师列表失败:', error);
    }
  };

  const handleCreateClass = () => {
    setEditingClass(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditClass = (record) => {
    setEditingClass(record);
    form.setFieldsValue({
      ...record,
      start_date: moment(record.start_date),
      end_date: moment(record.end_date),
      schedule_time: moment(record.schedule_time, 'HH:mm')
    });
    setModalVisible(true);
  };

  const handleDeleteClass = async (id) => {
    try {
      await api.delete(`/classes/${id}`);
      message.success('删除成功');
      fetchClasses();
    } catch (error) {
      console.error('删除班级失败:', error);
      message.error('删除失败');
    }
  };

  const handleSubmit = async (values) => {
    try {
      const submitData = {
        ...values,
        start_date: values.start_date.format('YYYY-MM-DD'),
        end_date: values.end_date.format('YYYY-MM-DD'),
        schedule_time: values.schedule_time.format('HH:mm')
      };

      if (editingClass) {
        await api.put(`/classes/${editingClass.id}`, submitData);
        message.success('更新成功');
      } else {
        await api.post('/classes', submitData);
        message.success('创建成功');
      }
      
      setModalVisible(false);
      fetchClasses();
    } catch (error) {
      console.error('提交失败:', error);
      message.error('操作失败');
    }
  };

  const columns = [
    { title: '班级名称', dataIndex: 'name', key: 'name' },
    { title: '课程', dataIndex: 'course_name', key: 'course_name' },
    { title: '教师', dataIndex: 'teacher_name', key: 'teacher_name' },
    { title: '开始日期', dataIndex: 'start_date', key: 'start_date' },
    { title: '结束日期', dataIndex: 'end_date', key: 'end_date' },
    { title: '上课时间', dataIndex: 'schedule_time', key: 'schedule_time' },
    { title: '当前人数/最大人数', key: 'students', render: (_, record) => `${record.current_students || 0}/${record.max_students}` },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => <Tag color={status === 'active' ? 'green' : 'red'}>{status === 'active' ? '进行中' : '已结束'}</Tag>
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditClass(record)}>
            编辑
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDeleteClass(record.id)}>
            删除
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={1}>班级管理</Title>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateClass}>
            创建班级
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={classes}
          rowKey="id"
          loading={loading}
        />
      </Card>

      <Modal
        title={editingClass ? '编辑班级' : '创建班级'}
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
          <Form.Item
            name="name"
            label="班级名称"
            rules={[{ required: true, message: '请输入班级名称' }]}
          >
            <Input placeholder="请输入班级名称" />
          </Form.Item>

          <Form.Item
            name="course_id"
            label="课程"
            rules={[{ required: true, message: '请选择课程' }]}
          >
            <Select placeholder="请选择课程">
              {courses.map(course => (
                <Select.Option key={course.id} value={course.id}>
                  {course.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="teacher_id"
            label="授课教师"
            rules={[{ required: true, message: '请选择教师' }]}
          >
            <Select placeholder="请选择教师">
              {teachers.map(teacher => (
                <Select.Option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="start_date"
            label="开始日期"
            rules={[{ required: true, message: '请选择开始日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="end_date"
            label="结束日期"
            rules={[{ required: true, message: '请选择结束日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="schedule_time"
            label="上课时间"
            rules={[{ required: true, message: '请选择上课时间' }]}
          >
            <TimePicker style={{ width: '100%' }} format="HH:mm" />
          </Form.Item>

          <Form.Item
            name="max_students"
            label="最大人数"
            rules={[{ required: true, message: '请输入最大人数' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择状态">
              <Select.Option value="active">进行中</Select.Option>
              <Select.Option value="completed">已结束</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="班级描述"
          >
            <Input.TextArea rows={3} placeholder="请输入班级描述（可选）" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingClass ? '更新' : '创建'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Classes;
