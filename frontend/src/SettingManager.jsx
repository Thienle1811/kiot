import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
    Card, Form, Button, TimePicker, InputNumber, Radio, message, 
    Divider, Row, Col, Spin, Tabs, Table, Tag, Modal, Checkbox 
} from 'antd';
import { 
    SettingOutlined, SaveOutlined, UserSwitchOutlined, 
    SafetyCertificateOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';

// Danh sách các quyền trong hệ thống (Mã quyền - Tên hiển thị)
const PERMISSION_LIST = [
    { label: 'Xem Tổng quan (Dashboard)', value: 'view_dashboard' },
    { label: 'Sơ đồ & Đặt phòng', value: 'manage_booking' },
    { label: 'Quản lý Hàng hóa & Kho', value: 'manage_goods' },
    { label: 'Thiết bị & Tài sản', value: 'manage_device' },
    { label: 'Sổ quỹ (Thu/Chi)', value: 'manage_cashflow' },
    { label: 'Xem Báo cáo', value: 'view_report' },
    { label: 'Cài đặt hệ thống (Admin)', value: 'manage_settings' },
];

const SettingManager = () => {
    const [loading, setLoading] = useState(false);
    
    // --- STATE TAB 1: CẤU HÌNH ---
    const [settingId, setSettingId] = useState(null);
    const [branches, setBranches] = useState([]); 
    const [formConfig] = Form.useForm();
    const overtimeMethod = Form.useWatch('overtime_method', formConfig);
    const earlyCheckinMethod = Form.useWatch('early_checkin_method', formConfig);

    // --- STATE TAB 2: PHÂN QUYỀN ---
    const [users, setUsers] = useState([]);
    const [isPermModalOpen, setIsPermModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedPermissions, setSelectedPermissions] = useState([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [settingRes, branchRes, userRes] = await Promise.all([
                axios.get('/api/settings/'),
                axios.get('/api/branches/'),
                axios.get('/api/users/')
            ]);

            // Load Settings
            setBranches(branchRes.data);
            if (settingRes.data && settingRes.data.length > 0) {
                const setting = settingRes.data[0];
                setSettingId(setting.id);
                formConfig.setFieldsValue({
                    ...setting,
                    check_in_time: setting.check_in_time ? dayjs(setting.check_in_time, 'HH:mm:ss') : null,
                    check_out_time: setting.check_out_time ? dayjs(setting.check_out_time, 'HH:mm:ss') : null,
                });
            } else {
                formConfig.setFieldsValue({
                    check_in_time: dayjs('14:00', 'HH:mm'),
                    check_out_time: dayjs('12:00', 'HH:mm'),
                    overtime_method: 'PERCENT', overtime_percent: 10, overtime_fixed: 50000, overtime_threshold_hours: 4,
                    early_checkin_method: 'PERCENT', early_checkin_percent: 10, early_checkin_fixed: 50000, early_checkin_threshold_hours: 4, early_checkin_free_hours: 1
                });
            }

            // Load Users
            setUsers(userRes.data);

        } catch (error) {
            message.error("Lỗi tải dữ liệu");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- XỬ LÝ LƯU CẤU HÌNH ---
    const handleSaveConfig = async (values) => {
        if (branches.length === 0) return message.error("Chưa có chi nhánh!");
        const payload = {
            ...values,
            branch: branches[0].id,
            check_in_time: values.check_in_time ? values.check_in_time.format('HH:mm') : null,
            check_out_time: values.check_out_time ? values.check_out_time.format('HH:mm') : null,
        };
        try {
            if (settingId) {
                await axios.put(`/api/settings/${settingId}/`, payload);
                message.success("Đã cập nhật cấu hình!");
            } else {
                await axios.post('/api/settings/', payload);
                message.success("Đã tạo cấu hình mới!");
                fetchData();
            }
        } catch (error) { message.error("Lỗi lưu cấu hình"); }
    };

    // --- XỬ LÝ PHÂN QUYỀN ---
    const handleOpenPermModal = (user) => {
        setSelectedUser(user);
        // Load quyền hiện tại của user (Nếu null thì mặc định rỗng)
        setSelectedPermissions(user.permissions_config || []);
        setIsPermModalOpen(true);
    };

    const handleSavePerm = async () => {
        try {
            await axios.patch(`/api/users/${selectedUser.id}/`, {
                permissions_config: selectedPermissions
            });
            message.success(`Đã cập nhật quyền cho ${selectedUser.username}`);
            setIsPermModalOpen(false);
            fetchData(); // Reload lại danh sách user
        } catch (error) {
            message.error("Lỗi lưu phân quyền");
        }
    };

    // --- TAB 1: FORM CẤU HÌNH ---
    const ConfigTab = () => (
        <Form form={formConfig} layout="vertical" onFinish={handleSaveConfig}>
            <Divider orientation="left" style={{borderColor: '#1890ff', color: '#1890ff'}}>Quy định Giờ chuẩn</Divider>
            <Row gutter={24}>
                <Col span={12}><Form.Item name="check_in_time" label="Giờ nhận phòng (Check-in)" rules={[{required: true}]}><TimePicker format="HH:mm" style={{width: '100%'}} /></Form.Item></Col>
                <Col span={12}><Form.Item name="check_out_time" label="Giờ trả phòng (Check-out)" rules={[{required: true}]}><TimePicker format="HH:mm" style={{width: '100%'}} /></Form.Item></Col>
            </Row>

            <Divider orientation="left" style={{borderColor: '#faad14', color: '#faad14'}}>1. Phụ thu Quá giờ (Late Check-out)</Divider>
            <Row gutter={24}>
                <Col span={24}>
                    <Form.Item name="overtime_method" label="Cách tính">
                        <Radio.Group buttonStyle="solid"><Radio.Button value="PERCENT">Theo % giá phòng</Radio.Button><Radio.Button value="FIXED">Theo số tiền (VNĐ)</Radio.Button></Radio.Group>
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={24}>
                <Col span={12}>
                    <Form.Item noStyle shouldUpdate>
                        {() => overtimeMethod === 'PERCENT' ? 
                            <Form.Item name="overtime_percent" label="Phần trăm mỗi giờ (%)"><InputNumber min={0} max={100} addonAfter="%" style={{width: '100%'}} /></Form.Item> : 
                            <Form.Item name="overtime_fixed" label="Số tiền mỗi giờ (VNĐ)"><InputNumber style={{width: '100%'}} addonAfter="đ" formatter={v=>`${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v=>v.replace(/\$\s?|(,*)/g, '')}/></Form.Item>
                        }
                    </Form.Item>
                </Col>
                <Col span={12}><Form.Item name="overtime_threshold_hours" label="Giới hạn tính 1 ngày (giờ)"><InputNumber min={0} addonAfter="giờ" style={{width: '100%'}} /></Form.Item></Col>
            </Row>

            <Divider orientation="left" style={{borderColor: '#52c41a', color: '#52c41a'}}>2. Phụ thu Nhận sớm (Early Check-in)</Divider>
            <Row gutter={24}>
                <Col span={12}><Form.Item name="early_checkin_free_hours" label="Số giờ miễn phí đầu"><InputNumber min={0} addonAfter="giờ" style={{width: '100%'}} /></Form.Item></Col>
                <Col span={12}>
                    <Form.Item name="early_checkin_method" label="Cách tính">
                        <Radio.Group buttonStyle="solid"><Radio.Button value="PERCENT">Theo %</Radio.Button><Radio.Button value="FIXED">Theo Tiền</Radio.Button></Radio.Group>
                    </Form.Item>
                </Col>
            </Row>
            <Row gutter={24}>
                <Col span={12}>
                    <Form.Item noStyle shouldUpdate>
                        {() => earlyCheckinMethod === 'PERCENT' ? 
                            <Form.Item name="early_checkin_percent" label="Phần trăm mỗi giờ (%)"><InputNumber min={0} max={100} addonAfter="%" style={{width: '100%'}} /></Form.Item> : 
                            <Form.Item name="early_checkin_fixed" label="Số tiền mỗi giờ (VNĐ)"><InputNumber style={{width: '100%'}} addonAfter="đ" formatter={v=>`${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v=>v.replace(/\$\s?|(,*)/g, '')}/></Form.Item>
                        }
                    </Form.Item>
                </Col>
                <Col span={12}><Form.Item name="early_checkin_threshold_hours" label="Giới hạn tính 1 ngày (giờ)"><InputNumber min={0} addonAfter="giờ" style={{width: '100%'}} /></Form.Item></Col>
            </Row>

            <div style={{textAlign: 'right', marginTop: 20}}><Button type="primary" htmlType="submit" icon={<SaveOutlined />} size="large">Lưu Cấu Hình</Button></div>
        </Form>
    );

    // --- TAB 2: DANH SÁCH NHÂN VIÊN & PHÂN QUYỀN ---
    const UserTab = () => {
        const columns = [
            { title: 'Tên đăng nhập', dataIndex: 'username', key: 'username', render: t => <b>{t}</b> },
            { title: 'Họ tên', key: 'fullname', render: (_, r) => `${r.last_name || ''} ${r.first_name || ''}` },
            { title: 'Vai trò', dataIndex: 'role', key: 'role', render: r => <Tag color="blue">{r}</Tag> },
            { 
                title: 'Quyền hạn riêng', 
                dataIndex: 'permissions_config', 
                key: 'perms',
                render: perms => (
                    perms && perms.length > 0 ? 
                    perms.map(p => <Tag key={p} color="cyan">{PERMISSION_LIST.find(x => x.value === p)?.label || p}</Tag>) 
                    : <span style={{color: '#ccc'}}>Mặc định theo vai trò</span>
                )
            },
            {
                title: 'Hành động',
                key: 'action',
                render: (_, record) => (
                    <Button 
                        icon={<SafetyCertificateOutlined />} 
                        onClick={() => handleOpenPermModal(record)}
                        type="primary" ghost
                    >
                        Phân quyền
                    </Button>
                )
            }
        ];

        return <Table dataSource={users} columns={columns} rowKey="id" pagination={false} />;
    };

    if (loading && branches.length === 0) return <div style={{textAlign: 'center', marginTop: 50}}><Spin size="large" /></div>;

    return (
        <Card title={<span><SettingOutlined /> Cài đặt Hệ thống</span>}>
            <Tabs
                defaultActiveKey="1"
                items={[
                    { label: <span><SettingOutlined /> Vận hành & Giá</span>, key: '1', children: <ConfigTab /> },
                    { label: <span><UserSwitchOutlined /> Phân quyền Nhân viên</span>, key: '2', children: <UserTab /> },
                ]}
            />

            {/* MODAL PHÂN QUYỀN */}
            <Modal
                title={`Phân quyền cho: ${selectedUser?.username}`}
                open={isPermModalOpen}
                onCancel={() => setIsPermModalOpen(false)}
                onOk={handleSavePerm}
                okText="Lưu quyền hạn"
                cancelText="Hủy"
                destroyOnClose
            >
                <p>Tích chọn các chức năng mà nhân viên này được phép truy cập:</p>
                <Checkbox.Group 
                    style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}
                    value={selectedPermissions}
                    onChange={(checkedValues) => setSelectedPermissions(checkedValues)}
                >
                    {PERMISSION_LIST.map(perm => (
                        <Checkbox key={perm.value} value={perm.value} style={{marginLeft: 0}}>
                            {perm.label}
                        </Checkbox>
                    ))}
                </Checkbox.Group>
            </Modal>
        </Card>
    );
};

export default SettingManager;