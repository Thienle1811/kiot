import { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, Button, Modal, Form, Input, message, Space, Popconfirm, Card, Select, DatePicker, Tag, Divider } from 'antd';
import { PlusOutlined, CheckCircleOutlined, CloseCircleOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Option } = Select;

const ReservationManager = () => {
    const [bookings, setBookings] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [bookRes, roomRes] = await Promise.all([
                axios.get('/api/bookings/'),
                axios.get('/api/rooms/')
            ]);
            // Chỉ lấy danh sách đặt trước (RESERVED)
            const reserved = bookRes.data.filter(b => b.status === 'RESERVED');
            setBookings(reserved);
            setRooms(roomRes.data);
        } catch (error) {
            message.error("Lỗi tải dữ liệu");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleCreate = async (values) => {
        try {
            const payload = {
                customer: {
                    full_name: values.full_name,
                    phone: values.phone,
                    identity_card: values.identity_card
                },
                room_id: values.room_id,
                check_in_expected: values.time_range ? values.time_range[0].format() : null,
                check_out_expected: values.time_range ? values.time_range[1].format() : null,
                note: values.note
            };
            await axios.post('/api/bookings/reserve/', payload);
            message.success("Đặt phòng thành công!");
            setIsModalOpen(false);
            form.resetFields();
            fetchData();
        } catch (error) { message.error("Lỗi tạo đặt phòng"); }
    };

    const handleCheckIn = async (id) => {
        try {
            await axios.post(`/api/bookings/${id}/confirm_checkin/`);
            message.success("Đã nhận phòng thành công!");
            fetchData();
        } catch (error) { message.error("Lỗi khi nhận phòng"); }
    };

    const handleCancel = async (id) => {
        try {
            await axios.post(`/api/bookings/${id}/cancel/`);
            message.success("Đã hủy đơn");
            fetchData();
        } catch (error) { message.error("Lỗi hủy đơn"); }
    };

    const columns = [
        { title: 'Mã', dataIndex: 'code', key: 'code', render: text => <b>{text}</b> },
        { title: 'Khách hàng', dataIndex: 'customer_name', key: 'customer_name' },
        { title: 'Phòng đặt', dataIndex: 'room_name', key: 'room_name', render: t => <Tag color="blue">{t}</Tag> },
        { 
            title: 'Dự kiến', 
            key: 'expected', 
            render: (_, r) => (
                <span>
                    {r.check_in_expected && dayjs(r.check_in_expected).format('DD/MM HH:mm')} 
                    - {r.check_out_expected && dayjs(r.check_out_expected).format('DD/MM HH:mm')}
                </span>
            )
        },
        { title: 'Ghi chú', dataIndex: 'note', key: 'note' },
        {
            title: 'Hành động',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Popconfirm title="Khách đã đến và nhận phòng?" onConfirm={() => handleCheckIn(record.id)}>
                        <Button type="primary" size="small" icon={<CheckCircleOutlined />}>Nhận phòng</Button>
                    </Popconfirm>
                    <Popconfirm title="Hủy đơn này?" onConfirm={() => handleCancel(record.id)}>
                        <Button danger size="small" icon={<CloseCircleOutlined />}>Hủy</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Card title={<span><CalendarOutlined /> Danh sách Đặt trước</span>} extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>Tạo Đặt Phòng</Button>}>
            <Table dataSource={bookings} columns={columns} rowKey="id" loading={loading} />

            <Modal title="Tạo Đặt Phòng Mới" open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null}>
                <Form form={form} layout="vertical" onFinish={handleCreate}>
                    <Divider orientation="left">Thông tin khách</Divider>
                    <Form.Item name="full_name" label="Tên khách" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="phone" label="SĐT"><Input /></Form.Item>
                    <Divider orientation="left">Thông tin phòng</Divider>
                    <Form.Item name="room_id" label="Chọn phòng" rules={[{ required: true }]}>
                        <Select>
                            {rooms.map(r => (
                                <Option key={r.id} value={r.id} disabled={r.status !== 'AVAILABLE'}>
                                    {r.name} - {r.status === 'AVAILABLE' ? 'Trống' : 'Đang bận'}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="time_range" label="Thời gian dự kiến (Đến - Đi)">
                        <DatePicker.RangePicker showTime format="DD/MM/YYYY HH:mm" style={{width: '100%'}} />
                    </Form.Item>
                    <Form.Item name="note" label="Ghi chú"><Input.TextArea /></Form.Item>
                    <Button type="primary" htmlType="submit" block>Lưu Đặt Phòng</Button>
                </Form>
            </Modal>
        </Card>
    );
};

export default ReservationManager;