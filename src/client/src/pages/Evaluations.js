import React, { useState, useEffect } from 'react';
import { Table, Card, Typography, Rate, Tag, Button, Modal, Form, Select, Input, message, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../services/api';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const Evaluations = () => {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvaluation, setEditingEvaluation] = useState(null);
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchEvaluations();
    fetchStudents();
    fetchSessions();
  }, []);

  const fetchEvaluations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/evaluations');
      setEvaluations(response.data.evaluations);
    } catch (error) {
      console.error('获取点评记录失败:', error);
      message.error('获取点评记录失败');
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

  const fetchSessions = async () => {
    try {
      const response = await api.get('/sessions');
      setSessions(response.data.sessions);
    } catch (error) {
      console.error('获取课程列表失败:', error);
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingEvaluation) {
        await api.put(`/evaluations/${editingEvaluation.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/evaluations', values);
        message.success('添加成功');
      }
      setModalVisible(false);
      fetchEvaluations();
    } catch (error) {
      console.error('保存点评失败:', error);
      message.error('保存失败');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/evaluations/${id}`);
      message.success('删除成功');
      fetchEvaluations();
    } catch (error) {
      console.error('删除点评失败:', error);
      message.error('删除失败');
    }
  };

  const columns = [
    { title: '学员', dataIndex: 'student_name', key: 'student_name' },
    { title: '课程', dataIndex: 'course_name', key: 'course_name' },
    { title: '班级', dataIndex: 'class_name', key: 'class_name' },
    { 
      title: '上课时间', 
      dataIndex: 'session_date', 
      key: 'session_date',
      render: (date) => moment(date).format('YYYY-MM-DD')
    },
    { 
      title: '评分', 
      dataIndex: 'rating', 
      key: 'rating',
      render: (rating) => <Rate disabled defaultValue={rating} />
    },
    { title: '优点', dataIndex: 'strengths', key: 'strengths', ellipsis: true },
    { title: '改进建议', dataIndex: 'improvements', key: 'improvements', ellipsis: true },
    { title: '作业', dataIndex: 'homework', key: 'homework', ellipsis: true },
    { 
      title: '创建时间', 
      dataIndex: 'created_at', 
      key: 'created_at',
      render: (date) => moment(date).format('YYYY-MM-DD')
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
              setEditingEvaluation(record);
              form.setFieldsValue(record);
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
                content: '确定要删除这个点评记录吗？',
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
        <Title level={1}>课后点评</Title>
      </div>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditingEvaluation(null);
            form.resetFields();
            setModalVisible(true);
          }}>
            添加课后点评
          </Button>
        </div>
        
        <Table
          columns={columns}
          dataSource={evaluations}
          rowKey="id"
          loading={loading}
        />
      </Card>

      <Modal
        title={editingEvaluation ? '编辑课后点评' : '添加课后点评'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="选择学员" name="student_id" rules={[{ required: true, message: '请选择学员' }]}>
            <Select placeholder="请选择学员" showSearch optionFilterProp="children">
              {students.map(student => (
                <Option key={student.id} value={student.id}>
                  {student.name} - {student.phone}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="选择课程" name="session_id" rules={[{ required: true, message: '请选择课程' }]}>
            <Select placeholder="请选择课程" showSearch optionFilterProp="children">
              {sessions.map(session => (
                <Option key={session.id} value={session.id}>
                  {session.class_name} - {session.course_name} - {moment(session.session_date).format('YYYY-MM-DD HH:mm')}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="评分" name="rating" rules={[{ required: true, message: '请选择评分' }]}>
            <Rate />
          </Form.Item>
          <Form.Item label="优点" name="strengths">
            <TextArea rows={3} placeholder="请输入学员的优点表现" />
          </Form.Item>
          <Form.Item label="改进建议" name="improvements">
            <TextArea rows={3} placeholder="请输入改进建议" />
          </Form.Item>
          <Form.Item label="作业安排" name="homework">
            <TextArea rows={2} placeholder="请输入作业安排" />
          </Form.Item>
          <Form.Item label="教师备注" name="teacher_notes">
            <TextArea rows={2} placeholder="请输入教师备注" />
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

export default Evaluations;
