import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
    Table, Button, Modal, Form, Input, Select, message, Space, 
    Popconfirm, Card, Tag, DatePicker, InputNumber, Divider 
} from 'antd';
import { 
    PlusOutlined, EditOutlined, DeleteOutlined, ToolOutlined, 
    HistoryOutlined, CheckCircleOutlined, ExclamationCircleOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Option } = Select;

const DeviceManager = () => {
    const [devices, setDevices] = useState([]);
    const [branches, setBranches] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [areas, setAreas] = useState([]);
    
    const [loading, setLoading] = useState(false);
    
    // Modal Thêm/Sửa
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDevice, setEditingDevice] = useState(null);
    
    // Modal Bảo trì
    const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
    const [maintenanceDevice, setMaintenanceDevice] = useState(null);

    // Modal Lịch sử
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyLogs, setHistoryLogs] = useState([]);

    const [form] = Form.useForm();
    const [maintenanceForm] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [devRes, branchRes, roomRes, areaRes] = await Promise.all([
                axios.get('/api/devices/'),
                axios.get('/api/branches/'),
                axios.get('/api/rooms/'),
                axios.get('/api/areas/')
            ]);
            setDevices(devRes.data);
            setBranches(branchRes.data);
            setRooms(roomRes.data);
            setAreas(areaRes.data);
        } catch (error) {
            message.error("Lỗi tải dữ liệu thiết bị");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- XỬ LÝ THÊM / SỬA THIẾT BỊ ---
    const handleOpenModal = (device = null) => {
        setEditingDevice(device);
        if (device) {
            form.setFieldsValue({
                ...device,
                last_maintenance_date: device.last_maintenance_date ? dayjs(device.last_maintenance_date) : null
            });
        } else {
            form.resetFields();
            if (branches.length > 0) form.setFieldsValue({ branch: branches[0].id, status: 'GOOD' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (values) => {
        try {
            const payload = {
                ...values,
                last_maintenance_date: values.last_maintenance_date ? values.last_maintenance_date.format('YYYY-MM-DD') : null
            };

            if (editingDevice) {
                await axios.put(`/api/devices/${editingDevice.id}/`, payload);
                message.success("Cập nhật thành công!");
            } else {
                await axios.post('/api/devices/', payload);
                message.success("Thêm thiết bị thành công!");
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            message.error("Lỗi khi lưu thiết bị");
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`/api/devices/${id}/`);
            message.success("Đã xóa thiết bị");
            fetchData();
        } catch (error) {
            message.error("Lỗi khi xóa");
        }
    };

    // --- XỬ LÝ BẢO TRÌ ---
    const handleOpenMaintenance = (device) => {
        setMaintenanceDevice(device);
        maintenanceForm.resetFields();
        maintenanceForm.setFieldsValue({ 
            performer: 'Nhân viên kỹ thuật',
            cost: 0 
        });
        setIsMaintenanceModalOpen(true);
    };

    const handleSaveMaintenance = async (values) => {
        try {
            await axios.post(`/api/devices/${maintenanceDevice.id}/log_maintenance/`, values);
            message.success("Đã ghi nhận bảo trì & cập nhật ngày mới!");
            setIsMaintenanceModalOpen(false);
            fetchData();
        } catch (error) {
            message.error("Lỗi khi ghi nhận bảo trì");
        }
    };

    // --- XỬ LÝ LỊCH SỬ ---
    const handleViewHistory = async (device) => {
        try {
            const res = await axios.get(`/api/maintenance-logs/?device=${device.id}`);
            setHistoryLogs(res.data);
            setIsHistoryModalOpen(true);
        } catch (error) {
            message.error("Lỗi tải lịch sử");
        }
    };

    // --- CẤU HÌNH CỘT BẢNG ---
    const columns = [
        {
            title: 'Tên thiết bị',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <div>
                    <b>{text}</b>
                    <br />
                    <span style={{fontSize: 12, color: '#888'}}>Mã: {record.code || '--'}</span>
                </div>
            )
        },
        {
            title: 'Vị trí',
            key: 'location',
            render: (_, record) => {
                if (record.room) return <Tag color="blue">{record.room_name}</Tag>;
                if (record.area) return <Tag color="cyan">{record.area_name}</Tag>;
                return <Tag>Kho / Chung</Tag>;
            }
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: status => {
                const map = {
                    'GOOD': { color: 'success', text: 'Tốt' },
                    'BROKEN': { color: 'error', text: 'Hỏng' },
                    'MAINTENANCE': { color: 'warning', text: 'Đang sửa' },
                    'LIQUIDATED': { color: 'default', text: 'Đã thanh lý' },
                };
                const s = map[status] || { color: 'default', text: status };
                return <Tag color={s.color}>{s.text}</Tag>;
            }
        },
        {
            title: 'Hạn bảo trì',
            key: 'maintenance',
            render: (_, record) => {
                if (!record.is_maintenance_required) return <span style={{color:'#ccc'}}>Không set</span>;
                if (!record.next_maintenance_date) return <Tag color="orange">Chưa có lịch</Tag>;
                
                const nextDate = dayjs(record.next_maintenance_date);
                const isLate = nextDate.isBefore(dayjs(), 'day');
                
                return (
                    <Tag icon={isLate ? <ExclamationCircleOutlined /> : <CheckCircleOutlined />} color={isLate ? 'red' : 'green'}>
                        {nextDate.format('DD/MM/YYYY')}
                    </Tag>
                );
            }
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button 
                        icon={<ToolOutlined />} 
                        onClick={() => handleOpenMaintenance(record)} 
                        title="Ghi nhận bảo trì" 
                        type={record.status === 'BROKEN' ? 'primary' : 'default'}
                        danger={record.status === 'BROKEN'}
                    />
                    <Button icon={<HistoryOutlined />} onClick={() => handleViewHistory(record)} title="Xem lịch sử" />
                    <Button icon={<EditOutlined />} onClick={() => handleOpenModal(record)} />
                    <Popconfirm title="Xóa thiết bị?" onConfirm={() => handleDelete(record.id)}>
                        <Button icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Card title={<span><ToolOutlined /> Quản lý Thiết bị & Tài sản</span>} extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal(null)}>
                Thêm Thiết bị
            </Button>
        }>
            <Table dataSource={devices} columns={columns} rowKey="id" loading={loading} />

            {/* MODAL THÊM / SỬA */}
            <Modal
                title={editingDevice ? "Cập nhật thiết bị" : "Thêm thiết bị mới"}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={700}
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item name="name" label="Tên thiết bị (*)" rules={[{ required: true }]}>
                        <Input placeholder="VD: Máy lạnh Daikin" />
                    </Form.Item>
                    
                    <Form.Item name="code" label="Mã tài sản">
                        <Input placeholder="VD: AC-001" />
                    </Form.Item>

                    <div style={{display: 'flex', gap: 10}}>
                        <Form.Item name="branch" label="Chi nhánh" style={{flex: 1}} rules={[{ required: true }]}>
                            <Select>{branches.map(b => <Option key={b.id} value={b.id}>{b.name}</Option>)}</Select>
                        </Form.Item>
                        <Form.Item name="status" label="Trạng thái" style={{flex: 1}}>
                            <Select>
                                <Option value="GOOD">Hoạt động tốt</Option>
                                <Option value="BROKEN">Đang hỏng</Option>
                                <Option value="MAINTENANCE">Đang bảo trì</Option>
                                <Option value="LIQUIDATED">Đã thanh lý</Option>
                            </Select>
                        </Form.Item>
                    </div>

                    <div style={{display: 'flex', gap: 10}}>
                        <Form.Item name="room" label="Đặt tại Phòng" style={{flex: 1}}>
                            <Select allowClear placeholder="Chọn phòng...">
                                {rooms.map(r => <Option key={r.id} value={r.id}>{r.name}</Option>)}
                            </Select>
                        </Form.Item>
                        <Form.Item name="area" label="Hoặc Khu vực" style={{flex: 1}}>
                            <Select allowClear placeholder="Chọn khu vực...">
                                {areas.map(a => <Option key={a.id} value={a.id}>{a.name}</Option>)}
                            </Select>
                        </Form.Item>
                    </div>

                    <Divider orientation="left">Cấu hình bảo trì</Divider>
                    <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
                        <Form.Item name="is_maintenance_required" valuePropName="checked" style={{marginBottom: 24}}>
                            <Input type="checkbox" style={{width: 20, height: 20}} />
                        </Form.Item>
                        <span style={{marginBottom: 24, marginRight: 20}}>Cần bảo trì định kỳ</span>

                        <Form.Item name="maintenance_interval_days" label="Chu kỳ (Ngày)" style={{flex: 1}}>
                            <InputNumber style={{width: '100%'}} min={0} />
                        </Form.Item>
                        
                        <Form.Item name="last_maintenance_date" label="Bảo trì lần cuối" style={{flex: 1}}>
                            <DatePicker style={{width: '100%'}} format="DD/MM/YYYY" />
                        </Form.Item>
                    </div>

                    <div style={{ textAlign: 'right', marginTop: 10 }}>
                        <Button onClick={() => setIsModalOpen(false)} style={{ marginRight: 10 }}>Hủy</Button>
                        <Button type="primary" htmlType="submit">Lưu dữ liệu</Button>
                    </div>
                </Form>
            </Modal>

            {/* MODAL GHI NHẬN BẢO TRÌ */}
            <Modal
                title="Ghi nhận bảo trì / Sửa chữa"
                open={isMaintenanceModalOpen}
                onCancel={() => setIsMaintenanceModalOpen(false)}
                footer={null}
            >
                <p>Thiết bị: <b>{maintenanceDevice?.name}</b></p>
                <Form form={maintenanceForm} layout="vertical" onFinish={handleSaveMaintenance}>
                    <Form.Item name="description" label="Nội dung công việc (*)" rules={[{ required: true }]}>
                        <Input.TextArea placeholder="VD: Vệ sinh lưới lọc, nạp gas..." />
                    </Form.Item>
                    
                    <Form.Item name="performer" label="Người thực hiện">
                        <Input />
                    </Form.Item>

                    <Form.Item name="cost" label="Chi phí (Nếu có - Sẽ tự tạo phiếu chi)">
                        <InputNumber 
                            style={{width: '100%'}} 
                            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={value => value.replace(/\$\s?|(,*)/g, '')}
                        />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" block icon={<CheckCircleOutlined />}>
                        Hoàn thành bảo trì
                    </Button>
                </Form>
            </Modal>

            {/* MODAL LỊCH SỬ */}
            <Modal
                title="Lịch sử bảo trì"
                open={isHistoryModalOpen}
                onCancel={() => setIsHistoryModalOpen(false)}
                footer={null}
                width={600}
            >
                <Table 
                    dataSource={historyLogs} 
                    rowKey="id"
                    pagination={false}
                    size="small"
                    columns={[
                        { title: 'Ngày', dataIndex: 'date', render: val => dayjs(val).format('DD/MM/YYYY') },
                        { title: 'Nội dung', dataIndex: 'description' },
                        { title: 'Người làm', dataIndex: 'performer' },
                        { title: 'Chi phí', dataIndex: 'cost', render: val => val > 0 ? `${parseInt(val).toLocaleString()}đ` : '-' },
                    ]}
                />
            </Modal>
        </Card>
    );
};

export default DeviceManager;