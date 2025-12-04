import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, Form, Button, TimePicker, InputNumber, Radio, message, Divider, Row, Col, Spin } from 'antd';
import { SettingOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const SettingManager = () => {
    const [loading, setLoading] = useState(false);
    const [settingId, setSettingId] = useState(null);
    const [branches, setBranches] = useState([]); 
    const [form] = Form.useForm();
    
    // Theo dõi giá trị overtime_method để ẩn/hiện ô nhập liệu tương ứng
    const overtimeMethod = Form.useWatch('overtime_method', form);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Lấy danh sách cấu hình
            const res = await axios.get('/api/settings/');
            // Lấy danh sách chi nhánh (để gán cấu hình cho chi nhánh đầu tiên)
            const branchRes = await axios.get('/api/branches/');
            setBranches(branchRes.data);

            if (res.data && res.data.length > 0) {
                const setting = res.data[0]; // Mặc định lấy cấu hình đầu tiên
                setSettingId(setting.id);
                
                // Format dữ liệu giờ để TimePicker hiểu
                form.setFieldsValue({
                    ...setting,
                    check_in_time: setting.check_in_time ? dayjs(setting.check_in_time, 'HH:mm:ss') : null,
                    check_out_time: setting.check_out_time ? dayjs(setting.check_out_time, 'HH:mm:ss') : null,
                });
            } else {
                // Nếu chưa có cấu hình, set giá trị mặc định
                form.setFieldsValue({
                    check_in_time: dayjs('14:00', 'HH:mm'),
                    check_out_time: dayjs('12:00', 'HH:mm'),
                    overtime_method: 'PERCENT',
                    overtime_percent: 10,
                    overtime_fixed: 50000,
                    overtime_threshold_hours: 4
                });
            }
        } catch (error) {
            message.error("Lỗi tải cấu hình");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async (values) => {
        if (branches.length === 0) {
            message.error("Hệ thống chưa có chi nhánh nào để lưu cấu hình!");
            return;
        }

        // Chuẩn bị dữ liệu gửi lên
        const payload = {
            ...values,
            branch: branches[0].id, // Mặc định gán cho chi nhánh đầu tiên
            check_in_time: values.check_in_time ? values.check_in_time.format('HH:mm') : null,
            check_out_time: values.check_out_time ? values.check_out_time.format('HH:mm') : null,
        };

        try {
            if (settingId) {
                await axios.put(`/api/settings/${settingId}/`, payload);
                message.success("Đã cập nhật cấu hình thành công!");
            } else {
                await axios.post('/api/settings/', payload);
                message.success("Đã tạo cấu hình mới thành công!");
                fetchData(); // Load lại để lấy ID mới
            }
        } catch (error) {
            message.error("Lỗi khi lưu cấu hình");
        }
    };

    if (loading) return <div style={{textAlign: 'center', marginTop: 50}}><Spin size="large" /></div>;

    return (
        <Card title={<span><SettingOutlined /> Thiết lập Vận hành & Giá</span>}>
            <Form form={form} layout="vertical" onFinish={handleSave}>
                
                <Divider orientation="left" style={{borderColor: '#1890ff', color: '#1890ff'}}>Quy định Giờ chuẩn</Divider>
                <Row gutter={24}>
                    <Col span={12}>
                        <Form.Item name="check_in_time" label="Giờ nhận phòng tiêu chuẩn (Check-in)" rules={[{required: true}]}>
                            <TimePicker format="HH:mm" style={{width: '100%'}} size="large" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="check_out_time" label="Giờ trả phòng tiêu chuẩn (Check-out)" rules={[{required: true}]}>
                            <TimePicker format="HH:mm" style={{width: '100%'}} size="large" />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider orientation="left" style={{borderColor: '#faad14', color: '#faad14'}}>Phụ thu Quá giờ (Late Check-out)</Divider>
                <Row gutter={24}>
                    <Col span={24}>
                        <Form.Item name="overtime_method" label="Phương pháp tính phụ thu">
                            <Radio.Group buttonStyle="solid">
                                <Radio.Button value="PERCENT">Theo Phần trăm (%) giá phòng</Radio.Button>
                                <Radio.Button value="FIXED">Theo Số tiền cố định (VNĐ)</Radio.Button>
                            </Radio.Group>
                        </Form.Item>
                    </Col>
                </Row>
                
                <Row gutter={24}>
                    <Col span={12}>
                        {/* Dùng dependencies để render lại khi overtime_method thay đổi */}
                        <Form.Item 
                            noStyle 
                            shouldUpdate={(prev, curr) => prev.overtime_method !== curr.overtime_method}
                        >
                            {({ getFieldValue }) => 
                                getFieldValue('overtime_method') === 'PERCENT' ? (
                                    <Form.Item 
                                        name="overtime_percent" 
                                        label="Phần trăm phụ thu mỗi giờ (%)" 
                                        rules={[{required: true, message: 'Nhập số %'}]}
                                    >
                                        <InputNumber min={0} max={100} addonAfter="%" style={{width: '100%'}} size="large" />
                                    </Form.Item>
                                ) : (
                                    <Form.Item 
                                        name="overtime_fixed" 
                                        label="Số tiền phụ thu mỗi giờ (VNĐ)" 
                                        rules={[{required: true, message: 'Nhập số tiền'}]}
                                    >
                                        <InputNumber 
                                            style={{width: '100%'}} 
                                            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                            parser={value => value.replace(/\$\s?|(,*)/g, '')}
                                            addonAfter="đ"
                                            size="large"
                                        />
                                    </Form.Item>
                                )
                            }
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item 
                            name="overtime_threshold_hours" 
                            label="Giới hạn quá giờ (Tính 1 ngày)" 
                            help="Nếu khách ở quá số giờ này, hệ thống sẽ tự động tính tròn 1 ngày tiền phòng."
                        >
                            <InputNumber min={0} addonAfter="giờ" style={{width: '100%'}} size="large" />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider />
                <div style={{textAlign: 'right'}}>
                    <Button type="primary" htmlType="submit" icon={<SaveOutlined />} size="large">
                        Lưu Cấu Hình
                    </Button>
                </div>
            </Form>
        </Card>
    );
};

export default SettingManager;