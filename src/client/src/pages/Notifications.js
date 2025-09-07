import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Typography, Tag, Modal, Form, Select, Input, DatePicker, message, Space } from 'antd';
import { SendOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../services/api';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNotification, setEditingNotification] = useState(null);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedRecipientType, setSelectedRecipientType] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchNotifications();
    fetchStudents();
    fetchTeachers();
    fetchClasses();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications');
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error('获取通知记录失败:', error);
      message.error('获取通知记录失败');
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

  const fetchTeachers = async () => {
    try {
      const response = await api.get('/teachers');
      setTeachers(response.data.teachers);
    } catch (error) {
      console.error('获取教师列表失败:', error);
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

  const handleSubmit = async (values) => {
    try {
      const notificationData = {
        ...values,
        send_time: values.send_time ? values.send_time.format('YYYY-MM-DD HH:mm:ss') : new Date().toISOString()
      };

      if (editingNotification) {
        await api.put(`/notifications/${editingNotification.id}`, notificationData);
        message.success('更新成功');
      } else {
        await api.post('/notifications', notificationData);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchNotifications();
    } catch (error) {
      console.error('保存通知失败:', error);
      message.error('保存失败');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      message.success('删除成功');
      fetchNotifications();
    } catch (error) {
      console.error('删除通知失败:', error);
      message.error('删除失败');
    }
  };

  const handleSendClassReminder = async () => {
    try {
      // 为所有活跃班级发送上课提醒
      const activeClasses = classes.filter(c => c.status === 'active');
      if (activeClasses.length === 0) {
        message.warning('没有活跃的班级');
        return;
      }

      for (const classItem of activeClasses) {
        await api.post('/notifications/class-reminder', { 
          class_id: classItem.id,
          reminder_time: new Date().toISOString()
        });
      }
      message.success('上课提醒发送成功');
      fetchNotifications();
    } catch (error) {
      console.error('发送上课提醒失败:', error);
      message.error('发送上课提醒失败');
    }
  };

  const getTypeText = (type) => {
    const types = {
      'class_reminder': '上课提醒',
      'attendance_reminder': '点名提醒',
      'trial_reminder': '试听提醒',
      'evaluation_created': '点评通知',
      'class_completed': '课程完成'
    };
    return types[type] || type;
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'orange',
      'sent': 'green',
      'failed': 'red'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status) => {
    const texts = {
      'pending': '待发送',
      'sent': '已发送',
      'failed': '发送失败'
    };
    return texts[status] || status;
  };

  const columns = [
    { 
      title: '类型', 
      dataIndex: 'type', 
      key: 'type',
      render: (type) => getTypeText(type)
    },
    { title: '标题', dataIndex: 'title', key: 'title' },
    { title: '消息内容', dataIndex: 'message', key: 'message', ellipsis: true },
    { title: '接收者类型', dataIndex: 'recipient_type', key: 'recipient_type' },
    { 
      title: '发送时间', 
      dataIndex: 'send_time', 
      key: 'send_time',
      render: (time) => moment(time).format('YYYY-MM-DD HH:mm')
    },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
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
            icon={<EditOutlined />}
            onClick={() => {
              setEditingNotification(record);
              setSelectedRecipientType(record.recipient_type);
              form.setFieldsValue({
                ...record,
                send_time: record.send_time ? moment(record.send_time) : null
              });
              setModalVisible(true);
            }}
          >
            编辑
          </Button>
          <Button 
            size="small" 
            icon={<DeleteOutlined />}
            danger
            onClick={() => {
              Modal.confirm({
                title: '确认删除',
                content: '确定要删除这个通知吗？',
                onOk: () => handleDelete(record.id)
              });
            }}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={1}>通知管理</Title>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} style={{ marginRight: 8 }} onClick={() => {
            setEditingNotification(null);
            setSelectedRecipientType(null);
            form.resetFields();
            setModalVisible(true);
          }}>
            创建通知
          </Button>
          <Button icon={<SendOutlined />} onClick={handleSendClassReminder}>
            发送上课提醒
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={notifications}
          rowKey="id"
          loading={loading}
        />
      </Card>

      <Modal
        title={editingNotification ? '编辑通知' : '创建通知'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="通知类型" name="type" rules={[{ required: true, message: '请选择通知类型' }]}>
            <Select placeholder="请选择通知类型">
              <Option value="class_reminder">上课提醒</Option>
              <Option value="attendance_reminder">点名提醒</Option>
              <Option value="trial_reminder">试听提醒</Option>
              <Option value="evaluation_created">点评通知</Option>
              <Option value="class_completed">课程完成</Option>
              <Option value="general">一般通知</Option>
            </Select>
          </Form.Item>
          <Form.Item label="接收者类型" name="recipient_type" rules={[{ required: true, message: '请选择接收者类型' }]}>
            <Select 
              placeholder="请选择接收者类型"
              onChange={(value) => {
                setSelectedRecipientType(value);
                // 清空接收者字段
                form.setFieldsValue({ recipient_id: undefined });
              }}
            >
              <Option value="student">学员</Option>
              <Option value="teacher">教师</Option>
              <Option value="class">班级</Option>
              <Option value="all">所有人</Option>
            </Select>
          </Form.Item>
          <Form.Item 
            label="接收者" 
            name="recipient_id" 
            rules={[{ 
              required: selectedRecipientType !== 'all', 
              message: '请选择接收者' 
            }]}
          >
            <Select 
              placeholder="请先选择接收者类型" 
              showSearch 
              optionFilterProp="children"
              disabled={!selectedRecipientType}
            >
              {selectedRecipientType === 'student' && students.map(student => (
                <Option key={student.id} value={student.id}>
                  {student.name} - {student.phone}
                </Option>
              ))}
              {selectedRecipientType === 'teacher' && teachers.map(teacher => (
                <Option key={teacher.id} value={teacher.id}>
                  {teacher.name} - {teacher.phone}
                </Option>
              ))}
              {selectedRecipientType === 'class' && classes.map(classItem => (
                <Option key={classItem.id} value={classItem.id}>
                  {classItem.name} - {classItem.course_name}
                </Option>
              ))}
              {selectedRecipientType === 'all' && (
                <Option value="0">所有人</Option>
              )}
            </Select>
          </Form.Item>
          <Form.Item label="通知标题" name="title" rules={[{ required: true, message: '请输入通知标题' }]}>
            <Input placeholder="请输入通知标题" />
          </Form.Item>
          <Form.Item label="通知内容" name="message" rules={[{ required: true, message: '请输入通知内容' }]}>
            <TextArea rows={4} placeholder="请输入通知内容" />
          </Form.Item>
          <Form.Item label="发送时间" name="send_time">
            <DatePicker 
              showTime 
              format="YYYY-MM-DD HH:mm" 
              placeholder="留空表示立即发送"
              style={{ width: '100%' }}
            />
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

export default Notifications;
