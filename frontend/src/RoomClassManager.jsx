import { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, Button, Modal, Form, Input, InputNumber, message, Space, Popconfirm, Card, Row, Col } from 'antd';
// SỬA DÒNG DƯỚI: Đổi GoldenOutlined -> GoldOutlined
import { PlusOutlined, EditOutlined, DeleteOutlined, GoldOutlined } from '@ant-design/icons';

const RoomClassManager = () => {
    const [roomClasses, setRoomClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [form] = Form.useForm();
    const [defaultBranchId, setDefaultBranchId] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [classesRes, branchRes] = await Promise.all([
                axios.get('http://127.0.0.1:8000/api/room-classes/'),
                axios.get('http://127.0.0.1:8000/api/branches/')
            ]);
            setRoomClasses(classesRes.data);
            if (branchRes.data.length > 0) setDefaultBranchId(branchRes.data[0].id);
        } catch (error) {
            message.error("Lỗi tải dữ liệu hạng phòng");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = (roomClass = null) => {
        setEditingClass(roomClass);
        if (roomClass) {
            form.setFieldsValue(roomClass);
        } else {
            form.resetFields();
        }
        setIsModalOpen(true);
    };

    const handleSave = async (values) => {
        if (!defaultBranchId) {
            message.error("Chưa có chi nhánh!");
            return;
        }
        try {
            const data = { ...values, branch: defaultBranchId };
            if (editingClass) {
                await axios.put(`http://127.0.0.1:8000/api/room-classes/${editingClass.id}/`, data);
                message.success("Cập nhật thành công!");
            } else {
                await axios.post('http://127.0.0.1:8000/api/room-classes/', data);
                message.success("Thêm hạng phòng mới thành công!");
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            message.error("Lỗi khi lưu dữ liệu");
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`http://127.0.0.1:8000/api/room-classes/${id}/`);
            message.success("Đã xóa hạng phòng");
            fetchData();
        } catch (error) {
            message.error("Không thể xóa (Đang có phòng thuộc hạng này)");
        }
    };

    const columns = [
        {
            title: 'Tên hạng phòng',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <b>{text}</b>
        },
        {
            title: 'Mã',
            dataIndex: 'code',
            key: 'code',
        },
        {
            title: 'Giá giờ',
            dataIndex: 'base_price_hourly',
            key: 'base_price_hourly',
            render: (val) => `${parseInt(val).toLocaleString()} đ`
        },
        {
            title: 'Giá ngày',
            dataIndex: 'base_price_daily',
            key: 'base_price_daily',
            render: (val) => `${parseInt(val).toLocaleString()} đ`
        },
        {
            title: 'Giá qua đêm',
            dataIndex: 'base_price_overnight',
            key: 'base_price_overnight',
            render: (val) => `${parseInt(val).toLocaleString()} đ`
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => handleOpenModal(record)} />
                    <Popconfirm title="Xóa hạng phòng này?" onConfirm={() => handleDelete(record.id)}>
                        <Button icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Card title={<span><GoldOutlined /> Quản lý Hạng phòng & Giá</span>} extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal(null)}>
                Thêm Hạng Mới
            </Button>
        }>
            <Table dataSource={roomClasses} columns={columns} rowKey="id" loading={loading} />

            <Modal
                title={editingClass ? "Cập nhật hạng phòng" : "Thêm hạng phòng mới"}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={600}
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="name" label="Tên hạng phòng" rules={[{ required: true }]}>
                                <Input placeholder="VD: Phòng VIP, Phòng Đôi..." />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="code" label="Mã viết tắt" rules={[{ required: true }]}>
                                <Input placeholder="VD: VIP, STD..." />
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    <div style={{fontWeight: 'bold', marginTop: 10, marginBottom: 10}}>Thiết lập giá chuẩn:</div>
                    
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="base_price_hourly" label="Giá theo giờ" rules={[{ required: true }]}>
                                <InputNumber style={{ width: '100%' }} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/\$\s?|(,*)/g, '')}/>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="base_price_daily" label="Giá theo ngày" rules={[{ required: true }]}>
                                <InputNumber style={{ width: '100%' }} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/\$\s?|(,*)/g, '')}/>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="base_price_overnight" label="Giá qua đêm" rules={[{ required: true }]}>
                                <InputNumber style={{ width: '100%' }} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/\$\s?|(,*)/g, '')}/>
                            </Form.Item>
                        </Col>
                    </Row>

                    <div style={{ textAlign: 'right', marginTop: 10 }}>
                        <Button onClick={() => setIsModalOpen(false)} style={{ marginRight: 10 }}>Hủy</Button>
                        <Button type="primary" htmlType="submit">Lưu dữ liệu</Button>
                    </div>
                </Form>
            </Modal>
        </Card>
    );
};

export default RoomClassManager;