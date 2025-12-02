import { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, Button, Modal, Form, Input, message, Space, Popconfirm, Card, Select, Tag, DatePicker, Divider, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UsergroupAddOutlined, MinusCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Option } = Select;

const CustomerManager = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [form] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/customers/');
            setCustomers(res.data);
        } catch (error) {
            message.error("Lỗi tải danh sách khách hàng");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = (customer = null) => {
        setEditingCustomer(customer);
        if (customer) {
            // Format dữ liệu ngày tháng khi mở form sửa
            const formattedValues = {
                ...customer,
                birth_date: customer.birth_date ? dayjs(customer.birth_date) : null,
                accompanying_people: customer.entourage ? customer.entourage.map(p => ({
                    ...p,
                    birth_date: p.birth_date ? dayjs(p.birth_date) : null
                })) : []
            };
            form.setFieldsValue(formattedValues);
        } else {
            form.resetFields();
            form.setFieldsValue({ 
                identity_type: 'CCCD',
                accompanying_people: [] // Mảng rỗng ban đầu
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (values) => {
        try {
            // Chuẩn hóa dữ liệu ngày tháng sang YYYY-MM-DD cho Backend
            const payload = {
                ...values,
                birth_date: values.birth_date ? values.birth_date.format('YYYY-MM-DD') : null,
                accompanying_people: values.accompanying_people ? values.accompanying_people.map(p => ({
                    ...p,
                    birth_date: p.birth_date ? p.birth_date.format('YYYY-MM-DD') : null
                })) : []
            };

            if (editingCustomer) {
                await axios.put(`/api/customers/${editingCustomer.id}/`, payload);
                message.success("Cập nhật thành công!");
            } else {
                await axios.post('/api/customers/', payload);
                message.success("Thêm khách hàng mới thành công!");
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            message.error("Lỗi khi lưu dữ liệu. Vui lòng kiểm tra các trường bắt buộc.");
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`/api/customers/${id}/`);
            message.success("Đã xóa khách hàng");
            fetchData();
        } catch (error) {
            message.error("Không thể xóa (Khách hàng này đang có hóa đơn)");
        }
    };

    const columns = [
        {
            title: 'Họ tên',
            dataIndex: 'full_name',
            key: 'full_name',
            render: text => <b>{text}</b>
        },
        {
            title: 'Ngày sinh',
            dataIndex: 'birth_date',
            key: 'birth_date',
            render: val => val ? dayjs(val).format('DD/MM/YYYY') : ''
        },
        {
            title: 'Giấy tờ',
            key: 'identity',
            render: (_, record) => (
                <span>
                    <Tag color="blue">{record.identity_type}</Tag> 
                    {record.identity_card}
                </span>
            )
        },
        {
            title: 'SĐT',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: 'Nơi cư trú',
            dataIndex: 'address',
            key: 'address',
        },
        {
            title: 'Đi cùng / Chủ đoàn',
            key: 'entourage',
            render: (_, record) => {
                if (record.representative_name) {
                    return <Tag color="orange">Đi cùng: {record.representative_name}</Tag>;
                } else {
                    const count = record.entourage_count || 0;
                    return count > 0 ? <Tag color="green">Chủ đoàn ({count} người)</Tag> : <span style={{color:'#ccc'}}>--</span>;
                }
            }
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => handleOpenModal(record)} />
                    <Popconfirm title="Xóa khách hàng này?" onConfirm={() => handleDelete(record.id)}>
                        <Button icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Card title={<span><UsergroupAddOutlined /> Quản lý Khách hàng & Lưu trú</span>} extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal(null)}>
                Thêm Khách
            </Button>
        }>
            <Table dataSource={customers} columns={columns} rowKey="id" loading={loading} />

            <Modal
                title={editingCustomer ? "Cập nhật thông tin khách" : "Thêm khách mới"}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={900}
                style={{ top: 20 }}
                destroyOnClose={true}
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    
                    <Divider orientation="left" style={{borderColor: '#1890ff', color: '#1890ff'}}>Thông tin khách chính (Người đặt)</Divider>
                    
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="full_name" label="Họ và tên (*)" rules={[{ required: true, message: 'Bắt buộc nhập' }]}>
                                <Input placeholder="Nguyễn Văn A" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="birth_date" label="Ngày sinh (*)" rules={[{ required: true, message: 'Bắt buộc nhập' }]}>
                                <DatePicker format="DD/MM/YYYY" placeholder="Chọn ngày sinh" style={{width: '100%'}} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="identity_type" label="Loại giấy tờ (*)" rules={[{ required: true }]}>
                                <Select>
                                    <Option value="CCCD">CCCD/CMND</Option>
                                    <Option value="PASSPORT">PASSPORT</Option>
                                    <Option value="DRIVER_LICENSE">Giấy phép lái xe</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="identity_card" label="Số giấy tờ">
                                <Input placeholder="0010..." />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="phone" label="Số điện thoại">
                                <Input placeholder="0912..." />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={16}>
                            <Form.Item name="address" label="Nơi cư trú (*)" rules={[{ required: true, message: 'Bắt buộc nhập' }]}>
                                <Input placeholder="Số nhà, Phường/Xã, Quận/Huyện..." />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="license_plate" label="Biển số xe">
                                <Input placeholder="29A-123.45" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider orientation="left" style={{borderColor: '#52c41a', color: '#52c41a'}}>Người đi cùng (Nếu có)</Divider>
                    
                    <Form.List name="accompanying_people">
                        {(fields, { add, remove }) => (
                        <>
                            {fields.map(({ key, name, ...restField }) => (
                            <Card 
                                key={key} 
                                size="small" 
                                style={{ marginBottom: 15, background: '#f6ffed', borderColor: '#b7eb8f' }}
                                extra={<MinusCircleOutlined onClick={() => remove(name)} style={{color: 'red'}} />}
                            >
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item {...restField} name={[name, 'full_name']} label="Họ tên (*)" rules={[{ required: true, message: 'Nhập tên' }]}>
                                            <Input placeholder="Tên người đi cùng" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item {...restField} name={[name, 'birth_date']} label="Ngày sinh (*)" rules={[{ required: true, message: 'Chọn ngày' }]}>
                                            <DatePicker format="DD/MM/YYYY" style={{width: '100%'}} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Row gutter={16}>
                                    <Col span={8}>
                                        <Form.Item {...restField} name={[name, 'identity_type']} label="Giấy tờ (*)" initialValue="CCCD" rules={[{ required: true }]}>
                                            <Select>
                                                <Option value="CCCD">CCCD/CMND</Option>
                                                <Option value="PASSPORT">PASSPORT</Option>
                                                <Option value="DRIVER_LICENSE">GPLX</Option>
                                            </Select>
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item {...restField} name={[name, 'identity_card']} label="Số giấy tờ">
                                            <Input placeholder="Số GT" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item {...restField} name={[name, 'phone']} label="SĐT">
                                            <Input placeholder="09xx..." />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Row gutter={16}>
                                    <Col span={16}>
                                        <Form.Item {...restField} name={[name, 'address']} label="Nơi cư trú (*)" rules={[{ required: true, message: 'Nhập địa chỉ' }]}>
                                            <Input placeholder="Địa chỉ..." />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item {...restField} name={[name, 'license_plate']} label="Biển số">
                                            <Input placeholder="Biển số" />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </Card>
                            ))}
                            <Form.Item>
                                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                    Thêm người đi cùng
                                </Button>
                            </Form.Item>
                        </>
                        )}
                    </Form.List>

                    <div style={{ textAlign: 'right', marginTop: 10 }}>
                        <Button onClick={() => setIsModalOpen(false)} style={{ marginRight: 10 }}>Hủy</Button>
                        <Button type="primary" htmlType="submit">Lưu dữ liệu</Button>
                    </div>
                </Form>
            </Modal>
        </Card>
    );
};

export default CustomerManager;