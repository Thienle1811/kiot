import { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, Button, Modal, Form, Input, Select, message, Space, Popconfirm, Card, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, HomeOutlined } from '@ant-design/icons';

const { Option } = Select;

const RoomManager = () => {
    const [rooms, setRooms] = useState([]);
    const [roomClasses, setRoomClasses] = useState([]);
    const [areas, setAreas] = useState([]);
    const [branches, setBranches] = useState([]);
    
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [form] = Form.useForm();

    // Hàm lấy tất cả dữ liệu cần thiết
    const fetchData = async () => {
        setLoading(true);
        try {
            const [roomsRes, classesRes, areasRes, branchesRes] = await Promise.all([
                axios.get('http://127.0.0.1:8000/api/rooms/'),
                axios.get('http://127.0.0.1:8000/api/room-classes/'),
                axios.get('http://127.0.0.1:8000/api/areas/'),
                axios.get('http://127.0.0.1:8000/api/branches/')
            ]);
            setRooms(roomsRes.data);
            setRoomClasses(classesRes.data);
            setAreas(areasRes.data);
            setBranches(branchesRes.data);
        } catch (error) {
            message.error("Lỗi tải dữ liệu phòng");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = (room = null) => {
        setEditingRoom(room);
        if (room) {
            // Khi sửa, cần fill dữ liệu vào form. 
            // Lưu ý: Backend trả về object đầy đủ, nhưng form Select chỉ cần ID
            form.setFieldsValue({
                name: room.name,
                status: room.status,
                branch: room.branch,
                area: room.area,
                room_class: room.room_class
            });
        } else {
            // Khi thêm mới, set mặc định chi nhánh đầu tiên (nếu có)
            form.resetFields();
            if (branches.length > 0) {
                form.setFieldsValue({ branch: branches[0].id, status: 'AVAILABLE' });
            }
        }
        setIsModalOpen(true);
    };

    const handleSave = async (values) => {
        try {
            if (editingRoom) {
                await axios.put(`http://127.0.0.1:8000/api/rooms/${editingRoom.id}/`, values);
                message.success("Cập nhật phòng thành công!");
            } else {
                await axios.post('http://127.0.0.1:8000/api/rooms/', values);
                message.success("Thêm phòng mới thành công!");
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            message.error("Lỗi khi lưu thông tin phòng");
            console.error(error);
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`http://127.0.0.1:8000/api/rooms/${id}/`);
            message.success("Đã xóa phòng");
            fetchData();
        } catch (error) {
            message.error("Không thể xóa (Phòng đang có dữ liệu liên quan)");
        }
    };

    const columns = [
        {
            title: 'Số phòng',
            dataIndex: 'name',
            key: 'name',
            render: text => <b>{text}</b>
        },
        {
            title: 'Hạng phòng',
            dataIndex: 'room_class_name',
            key: 'room_class_name',
            render: text => <Tag color="blue">{text}</Tag>
        },
        {
            title: 'Khu vực',
            dataIndex: 'area_name',
            key: 'area_name',
        },
        {
            title: 'Giá giờ',
            dataIndex: 'price_hourly',
            key: 'price_hourly',
            render: val => `${parseInt(val).toLocaleString()} đ`
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: status => status === 'AVAILABLE' ? <Tag color="green">Trống</Tag> : <Tag color="orange">Có khách</Tag>
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => handleOpenModal(record)} />
                    <Popconfirm title="Xóa phòng này?" onConfirm={() => handleDelete(record.id)}>
                        <Button icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Card title={<span><HomeOutlined /> Quản lý Danh sách Phòng</span>} extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal(null)}>
                Thêm Phòng Mới
            </Button>
        }>
            <Table dataSource={rooms} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />

            <Modal
                title={editingRoom ? "Cập nhật phòng" : "Thêm phòng mới"}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item name="name" label="Số phòng (Tên)" rules={[{ required: true, message: 'Nhập số phòng!' }]}>
                        <Input placeholder="Ví dụ: 301, VIP-01" />
                    </Form.Item>

                    <Form.Item name="room_class" label="Loại phòng / Hạng phòng" rules={[{ required: true, message: 'Chọn hạng phòng!' }]}>
                        <Select placeholder="Chọn hạng phòng...">
                            {roomClasses.map(rc => (
                                <Option key={rc.id} value={rc.id}>{rc.name} ({parseInt(rc.base_price_hourly).toLocaleString()}đ/h)</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name="area" label="Khu vực / Tầng" rules={[{ required: true, message: 'Chọn tầng!' }]}>
                        <Select placeholder="Chọn tầng...">
                            {areas.map(a => (
                                <Option key={a.id} value={a.id}>{a.name}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name="status" label="Trạng thái ban đầu">
                        <Select>
                            <Option value="AVAILABLE">Phòng trống</Option>
                            <Option value="FIXING">Đang bảo trì/Sửa chữa</Option>
                        </Select>
                    </Form.Item>

                    {/* Trường ẩn để giữ Branch ID */}
                    <Form.Item name="branch" hidden><Input /></Form.Item>

                    <div style={{ textAlign: 'right', marginTop: 10 }}>
                        <Button onClick={() => setIsModalOpen(false)} style={{ marginRight: 10 }}>Hủy</Button>
                        <Button type="primary" htmlType="submit">Lưu dữ liệu</Button>
                    </div>
                </Form>
            </Modal>
        </Card>
    );
};

export default RoomManager;