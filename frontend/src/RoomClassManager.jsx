import { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, Button, Modal, Form, Input, InputNumber, message, Space, Popconfirm, Card, Row, Col, Divider, Select, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, GoldOutlined, MinusCircleOutlined } from '@ant-design/icons';

const { Option } = Select;

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
                axios.get('/api/room-classes/'),
                axios.get('/api/branches/')
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
            // Parse dữ liệu config nếu có
            const formattedValues = { ...roomClass };
            // Đảm bảo hourly_price_config là mảng để Form.List hiển thị được
            if (!Array.isArray(formattedValues.hourly_price_config)) {
                formattedValues.hourly_price_config = [];
            }
            form.setFieldsValue(formattedValues);
        } else {
            form.resetFields();
            form.setFieldsValue({
                hourly_price_config: [] // Mặc định danh sách rỗng
            });
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
            
            // Đảm bảo config là list hợp lệ
            if (!data.hourly_price_config) data.hourly_price_config = [];

            if (editingClass) {
                await axios.put(`/api/room-classes/${editingClass.id}/`, data);
                message.success("Cập nhật thành công!");
            } else {
                await axios.post('/api/room-classes/', data);
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
            await axios.delete(`/api/room-classes/${id}/`);
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
            render: (text, record) => (
                <div>
                    <b>{text}</b>
                    <br/>
                    <span style={{fontSize: 12, color: '#888'}}>{record.code}</span>
                </div>
            )
        },
        {
            title: 'Giá giờ (Cơ bản)',
            dataIndex: 'base_price_hourly',
            key: 'base_price_hourly',
            render: (val, record) => (
                <div>
                    {parseInt(val).toLocaleString()} đ
                    {record.hourly_price_config && record.hourly_price_config.length > 0 && (
                        <div style={{marginTop: 4}}>
                            <Tag color="purple">Lũy tiến</Tag>
                        </div>
                    )}
                </div>
            )
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
                width={700}
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
                    
                    <Divider orientation="left" style={{borderColor: '#1890ff', color: '#1890ff'}}>Cấu hình giá lũy tiến (Block)</Divider>
                    <p style={{color: '#888', fontStyle: 'italic', marginBottom: 10}}>
                        Thiết lập giá khác nhau cho từng giờ. Ví dụ: Giờ 1 giá 100k, Giờ 2 giá 50k. <br/>
                        Chọn <b>"Tiếp theo"</b> để áp dụng cho các giờ còn lại.
                    </p>

                    <Form.List name="hourly_price_config">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Row key={key} gutter={10} style={{ marginBottom: 8 }} align="middle">
                                        <Col span={10}>
                                            <Form.Item
                                                {...restField}
                                                name={[name, 'hour']}
                                                rules={[{ required: true, message: 'Chọn giờ' }]}
                                                style={{ marginBottom: 0 }}
                                            >
                                                <Select placeholder="Giờ thứ...">
                                                    <Option value={1}>Giờ thứ 1</Option>
                                                    <Option value={2}>Giờ thứ 2</Option>
                                                    <Option value={3}>Giờ thứ 3</Option>
                                                    <Option value={4}>Giờ thứ 4</Option>
                                                    <Option value={5}>Giờ thứ 5</Option>
                                                    <Option value="next" style={{color: 'blue', fontWeight: 'bold'}}>Các giờ tiếp theo</Option>
                                                </Select>
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item
                                                {...restField}
                                                name={[name, 'price']}
                                                rules={[{ required: true, message: 'Nhập giá' }]}
                                                style={{ marginBottom: 0 }}
                                            >
                                                <InputNumber 
                                                    placeholder="Giá tiền (VNĐ)" 
                                                    style={{ width: '100%' }}
                                                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                                                    addonAfter="đ"
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col span={2}>
                                            <MinusCircleOutlined onClick={() => remove(name)} style={{color: 'red', fontSize: 18}} />
                                        </Col>
                                    </Row>
                                ))}
                                <Form.Item>
                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                        Thêm mốc giờ
                                    </Button>
                                </Form.Item>
                            </>
                        )}
                    </Form.List>

                    <Divider orientation="left">Giá cơ bản / Qua đêm</Divider>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="base_price_hourly" label="Giá giờ (Mặc định)" rules={[{ required: true }]}>
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