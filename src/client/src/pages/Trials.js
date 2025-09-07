import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Typography, Space, Tag, Modal, Form, Input, Select, DatePicker, TimePicker, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../services/api';
import moment from 'moment';

const { Title } = Typography;

const Trials = () => {
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTrial, setEditingTrial] = useState(null);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchTrials();
    fetchStudents();
    fetchClasses();
  }, []);

  const fetchTrials = async () => {
    try {
      setLoading(true);
      const response = await api.get('/trials');
      setTrials(response.data.trials);
    } catch (error) {
      console.error('获取试听记录失败:', error);
      message.error('获取试听列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get('/students');
      setStudents(response.data.students);
    } catch (error) {
      console.error('获取学员列表失败:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await api.get('/classes');
      setClasses(response.data.classes);
    } catch (error) {
      console.error('获取班级列表失败:', error);
    }
  };

  const handleCreateTrial = () => {
    setEditingTrial(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditTrial = (record) => {
    setEditingTrial(record);
    form.setFieldsValue({
      ...record,
      trial_date: moment(record.trial_date),
      trial_time: moment(record.trial_date)
    });
    setModalVisible(true);
  };

  const handleDeleteTrial = async (id) => {
    try {
      await api.delete(`/trials/${id}`);
      message.success('删除成功');
      fetchTrials();
    } catch (error) {
      console.error('删除试听失败:', error);
      message.error('删除失败');
    }
  };

  const handleSubmit = async (values) => {
    try {
      const submitData = {
        ...values,
        trial_date: values.trial_date && values.trial_time 
          ? values.trial_date.format('YYYY-MM-DD') + ' ' + values.trial_time.format('HH:mm:ss')
          : values.trial_date?.format('YYYY-MM-DD HH:mm:ss')
      };
      delete submitData.trial_time;

      if (editingTrial) {
        await api.put(`/trials/${editingTrial.id}`, submitData);
        message.success('更新成功');
      } else {
        await api.post('/trials', submitData);
        message.success('创建成功');
      }
      
      setModalVisible(false);
      fetchTrials();
    } catch (error) {
      console.error('提交失败:', error);
      const errorMessage = error.response?.data?.error || error.message || '操作失败';
      message.error(errorMessage);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'scheduled': 'blue',
      'completed': 'green',
      'cancelled': 'red',
      'no_show': 'orange'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status) => {
    const texts = {
      'scheduled': '已预约',
      'completed': '已完成',
      'cancelled': '已取消',
      'no_show': '未到场'
    };
    return texts[status] || status;
  };

  const columns = [
    { title: '学员姓名', dataIndex: 'student_name', key: 'student_name' },
    { title: '联系电话', dataIndex: 'student_phone', key: 'student_phone' },
    { title: '试听班级', dataIndex: 'class_name', key: 'class_name' },
    { title: '试听课程', dataIndex: 'course_name', key: 'course_name' },
    { title: '授课教师', dataIndex: 'teacher_name', key: 'teacher_name' },
    { 
      title: '试听时间', 
      dataIndex: 'trial_date', 
      key: 'trial_date',
      render: (date) => moment(date).format('YYYY-MM-DD HH:mm')
    },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
    },
    { title: '反馈', dataIndex: 'feedback', key: 'feedback', ellipsis: true },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditTrial(record)}>
            编辑
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDeleteTrial(record.id)}>
            删除
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={1}>试听管理</Title>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateTrial}>
            添加试听预约
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={trials}
          rowKey="id"
          loading={loading}
        />
      </Card>

      <Modal
        title={editingTrial ? '编辑试听预约' : '添加试听预约'}
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
            name="student_id"
            label="学员"
            rules={[{ required: true, message: '请选择学员' }]}
          >
            <Select placeholder="请选择学员" showSearch optionFilterProp="children">
              {students.map(student => (
                <Select.Option key={student.id} value={student.id}>
                  {student.name} - {student.phone}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="class_id"
            label="试听班级"
            rules={[{ required: true, message: '请选择试听班级' }]}
          >
            <Select placeholder="请选择试听班级">
              {classes.map(classItem => (
                <Select.Option key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="trial_date"
            label="试听日期"
            rules={[{ required: true, message: '请选择试听日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="trial_time"
            label="试听时间"
            rules={[{ required: true, message: '请选择试听时间' }]}
          >
            <TimePicker style={{ width: '100%' }} format="HH:mm" />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择状态">
              <Select.Option value="scheduled">已预约</Select.Option>
              <Select.Option value="completed">已完成</Select.Option>
              <Select.Option value="cancelled">已取消</Select.Option>
              <Select.Option value="no_show">未到场</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="feedback"
            label="反馈"
          >
            <Input.TextArea rows={3} placeholder="请输入试听反馈（可选）" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingTrial ? '更新' : '创建'}
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

export default Trials;
