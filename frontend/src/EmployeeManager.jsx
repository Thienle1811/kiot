import { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, Button, Modal, Form, Input, message, Space, Popconfirm, Card, Select, Tag, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons';

const { Option } = Select;

const EmployeeManager = () => {
    const [users, setUsers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, branchesRes] = await Promise.all([
                axios.get('/api/users/'),
                axios.get('/api/branches/')
            ]);
            setUsers(usersRes.data);
            setBranches(branchesRes.data);
        } catch (error) {
            message.error("Lỗi tải danh sách nhân viên");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = (user = null) => {
        setEditingUser(user);
        form.resetFields();
        if (user) {
            form.setFieldsValue(user);
            // Không điền password khi sửa
        } else {
            form.setFieldsValue({ is_active: true, role: 'RECEPTIONIST' });
            if(branches.length > 0) form.setFieldsValue({ branch: branches[0].id });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (values) => {
        try {
            if (editingUser) {
                // Nếu không nhập pass thì xóa field đó đi để không gửi chuỗi rỗng lên
                if (!values.password) delete values.password;
                await axios.patch(`/api/users/${editingUser.id}/`, values);
                message.success("Cập nhật nhân viên thành công!");
            } else {
                await axios.post('/api/users/', values);
                message.success("Thêm nhân viên mới thành công!");
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            message.error("Lỗi khi lưu. Có thể tên đăng nhập đã tồn tại.");
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`/api/users/${id}/`);
            message.success("Đã xóa nhân viên");
            fetchData();
        } catch (error) {
            message.error("Lỗi khi xóa");
        }
    };

    const columns = [
        {
            title: 'Tên đăng nhập',
            dataIndex: 'username',
            key: 'username',
            render: text => <b>{text}</b>
        },
        {
            title: 'Họ và Tên',
            key: 'fullname',
            render: (_, record) => `${record.last_name || ''} ${record.first_name || ''}`.trim() || '(Chưa nhập tên)'
        },
        {
            title: 'Vai trò',
            dataIndex: 'role',
            key: 'role',
            render: role => {
                let color = 'blue';
                let text = 'Lễ tân';
                if (role === 'ADMIN') { color = 'red'; text = 'Quản trị'; }
                if (role === 'ACCOUNTANT') { color = 'green'; text = 'Kế toán'; }
                return <Tag color={color}>{text}</Tag>;
            }
        },
        {
            title: 'Chi nhánh',
            dataIndex: 'branch_name',
            key: 'branch_name',
        },
        {
            title: 'Trạng thái',
            dataIndex: 'is_active',
            key: 'is_active',
            render: active => active ? <Tag color="success">Hoạt động</Tag> : <Tag color="error">Đã khóa</Tag>
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => handleOpenModal(record)} />
                    <Popconfirm title="Xóa tài khoản này?" onConfirm={() => handleDelete(record.id)}>
                        <Button icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Card title={<span><TeamOutlined /> Quản lý Nhân viên</span>} extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal(null)}>
                Thêm Nhân viên
            </Button>
        }>
            <Table dataSource={users} columns={columns} rowKey="id" loading={loading} />

            <Modal
                title={editingUser ? "Cập nhật nhân viên" : "Thêm nhân viên mới"}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item name="username" label="Tên đăng nhập" rules={[{ required: true, message: 'Bắt buộc' }]}>
                        <Input prefix={<UserOutlined />} disabled={!!editingUser} />
                    </Form.Item>

                    <Form.Item name="password" label={editingUser ? "Mật khẩu mới (Để trống nếu không đổi)" : "Mật khẩu"} rules={[{ required: !editingUser, message: 'Bắt buộc' }]}>
                        <Input.Password />
                    </Form.Item>

                    <Space style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                        <Form.Item name="last_name" label="Họ" style={{ width: '100%' }}><Input /></Form.Item>
                        <Form.Item name="first_name" label="Tên" style={{ width: '100%' }} rules={[{ required: true }]}><Input /></Form.Item>
                    </Space>

                    <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}>
                        <Select>
                            <Option value="RECEPTIONIST">Lễ tân</Option>
                            <Option value="ADMIN">Quản trị viên</Option>
                            <Option value="ACCOUNTANT">Kế toán</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item name="branch" label="Chi nhánh làm việc" rules={[{ required: true }]}>
                        <Select>
                            {branches.map(b => (
                                <Option key={b.id} value={b.id}>{b.name}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name="is_active" label="Trạng thái" valuePropName="checked">
                        <Switch checkedChildren="Hoạt động" unCheckedChildren="Khóa" />
                    </Form.Item>

                    <div style={{ textAlign: 'right', marginTop: 10 }}>
                        <Button onClick={() => setIsModalOpen(false)} style={{ marginRight: 10 }}>Hủy</Button>
                        <Button type="primary" htmlType="submit">Lưu dữ liệu</Button>
                    </div>
                </Form>
            </Modal>
        </Card>
    );
};

export default EmployeeManager;