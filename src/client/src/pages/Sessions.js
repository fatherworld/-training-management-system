import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Typography, Tag, Modal, Form, Select, DatePicker, InputNumber, Input, message, Space } from 'antd';
import { PlusOutlined, CheckOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../services/api';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const Sessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [classes, setClasses] = useState([]);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchSessions();
    fetchClasses();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sessions');
      setSessions(response.data.sessions);
    } catch (error) {
      console.error('获取课程安排失败:', error);
      message.error('获取课程安排失败');
    } finally {
      setLoading(false);
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
      const sessionData = {
        ...values,
        session_date: values.session_date.format('YYYY-MM-DD HH:mm:ss')
      };

      if (editingSession) {
        await api.put(`/sessions/${editingSession.id}`, sessionData);
        message.success('更新成功');
      } else {
        await api.post('/sessions', sessionData);
        message.success('添加成功');
      }
      setModalVisible(false);
      fetchSessions();
    } catch (error) {
      console.error('保存课程安排失败:', error);
      message.error('保存失败');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/sessions/${id}`);
      message.success('删除成功');
      fetchSessions();
    } catch (error) {
      console.error('删除课程安排失败:', error);
      message.error('删除失败');
    }
  };

  const handleAttendance = async (session) => {
    try {
      // 简化点名功能，直接标记为完成
      const attendanceData = { attendance: [{ status: 'completed' }] };
      await api.post(`/sessions/${session.id}/attendance`, attendanceData);
      message.success('点名成功');
      fetchSessions();
    } catch (error) {
      console.error('点名失败:', error);
      message.error('点名失败');
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

  const columns = [
    { title: '班级', dataIndex: 'class_name', key: 'class_name' },
    { title: '课程', dataIndex: 'course_name', key: 'course_name' },
    { title: '教师', dataIndex: 'teacher_name', key: 'teacher_name' },
    { 
      title: '上课时间', 
      dataIndex: 'session_date', 
      key: 'session_date',
      render: (date) => moment(date).format('YYYY-MM-DD HH:mm')
    },
    { title: '课时长度', dataIndex: 'duration', key: 'duration', render: (duration) => `${duration}小时` },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
    },
    { title: '备注', dataIndex: 'notes', key: 'notes', ellipsis: true },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => {
              setEditingSession(record);
              form.setFieldsValue({
                ...record,
                session_date: moment(record.session_date)
              });
              setModalVisible(true);
            }}
          >
            编辑
          </Button>
          <Button 
            size="small" 
            icon={<CheckOutlined />}
            disabled={record.status === 'completed'}
            onClick={() => handleAttendance(record)}
          >
            点名
          </Button>
          <Button 
            size="small" 
            icon={<DeleteOutlined />}
            danger
            onClick={() => {
              Modal.confirm({
                title: '确认删除',
                content: '确定要删除这个课程安排吗？',
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
        <Title level={1}>课程安排</Title>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditingSession(null);
            form.resetFields();
            setModalVisible(true);
          }}>
            添加课程安排
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={sessions}
          rowKey="id"
          loading={loading}
        />
      </Card>

      <Modal
        title={editingSession ? '编辑课程安排' : '添加课程安排'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="选择班级" name="class_id" rules={[{ required: true, message: '请选择班级' }]}>
            <Select placeholder="请选择班级">
              {classes.map(classItem => (
                <Option key={classItem.id} value={classItem.id}>
                  {classItem.name} - {classItem.course_name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="上课时间" name="session_date" rules={[{ required: true, message: '请选择上课时间' }]}>
            <DatePicker 
              showTime 
              format="YYYY-MM-DD HH:mm" 
              placeholder="请选择上课时间"
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="课时长度(小时)" name="duration" rules={[{ required: true, message: '请输入课时长度' }]}>
            <InputNumber min={0.5} step={0.5} placeholder="请输入课时长度" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="备注" name="notes">
            <TextArea rows={3} placeholder="请输入备注" />
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

export default Sessions;
