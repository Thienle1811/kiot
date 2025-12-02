import { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, Button, Modal, Form, Input, InputNumber, message, Card, Row, Col, Statistic, Tag, Select, Radio } from 'antd';
import { PlusOutlined, DollarOutlined, ArrowUpOutlined, ArrowDownOutlined, WalletOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Option } = Select;

const CashFlowManager = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [branches, setBranches] = useState([]);
    
    // State thống kê
    const [stats, setStats] = useState({ total_receipt: 0, total_payment: 0, balance: 0 });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [flowRes, branchRes] = await Promise.all([
                axios.get('/api/cash-flows/'),
                axios.get('/api/branches/')
            ]);
            setData(flowRes.data);
            setBranches(branchRes.data);
            
            // Tính toán thống kê
            let receipt = 0;
            let payment = 0;
            flowRes.data.forEach(item => {
                if (item.flow_type === 'RECEIPT') receipt += parseInt(item.amount);
                else payment += parseInt(item.amount);
            });
            setStats({ total_receipt: receipt, total_payment: payment, balance: receipt - payment });

        } catch (error) {
            message.error("Lỗi tải dữ liệu sổ quỹ");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async (values) => {
        try {
            // Mặc định lấy chi nhánh đầu tiên nếu chưa chọn
            if (!values.branch && branches.length > 0) values.branch = branches[0].id;
            
            await axios.post('/api/cash-flows/', values);
            message.success("Lập phiếu thành công!");
            setIsModalOpen(false);
            form.resetFields();
            fetchData();
        } catch (error) {
            message.error("Lỗi khi lưu phiếu");
        }
    };

    const columns = [
        {
            title: 'Loại phiếu',
            dataIndex: 'flow_type',
            key: 'flow_type',
            render: type => type === 'RECEIPT' ? <Tag color="green">Phiếu Thu</Tag> : <Tag color="red">Phiếu Chi</Tag>
        },
        {
            title: 'Hạng mục',
            dataIndex: 'category',
            key: 'category',
            render: text => <b>{text}</b>
        },
        {
            title: 'Số tiền',
            dataIndex: 'amount',
            key: 'amount',
            render: (val, record) => (
                <span style={{ color: record.flow_type === 'RECEIPT' ? 'green' : 'red', fontWeight: 'bold' }}>
                    {record.flow_type === 'RECEIPT' ? '+' : '-'}{parseInt(val).toLocaleString()} đ
                </span>
            )
        },
        {
            title: 'Diễn giải',
            dataIndex: 'description',
            key: 'description',
        },
        {
            title: 'Thời gian',
            dataIndex: 'created_at',
            key: 'created_at',
            render: val => dayjs(val).format('DD/MM/YYYY HH:mm')
        },
    ];

    return (
        <div>
            {/* THỐNG KÊ */}
            <Row gutter={16} style={{ marginBottom: 20 }}>
                <Col span={8}>
                    <Card bordered={false}>
                        <Statistic title="Tổng Thu" value={stats.total_receipt} suffix="đ" valueStyle={{ color: '#3f8600' }} prefix={<ArrowUpOutlined />} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card bordered={false}>
                        <Statistic title="Tổng Chi" value={stats.total_payment} suffix="đ" valueStyle={{ color: '#cf1322' }} prefix={<ArrowDownOutlined />} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card bordered={false} style={{ background: '#f0f5ff', border: '1px solid #adc6ff' }}>
                        <Statistic title="Tồn Quỹ (Tiền mặt)" value={stats.balance} suffix="đ" valueStyle={{ color: '#10239e', fontWeight: 'bold' }} prefix={<WalletOutlined />} />
                    </Card>
                </Col>
            </Row>

            <Card title="Sổ Quỹ (Thu/Chi)" extra={
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>Lập Phiếu Thu/Chi</Button>
            }>
                <Table dataSource={data} columns={columns} rowKey="id" loading={loading} />
            </Card>

            {/* MODAL LẬP PHIẾU */}
            <Modal
                title="Lập phiếu Thu / Chi mới"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
            >
                <Form form={form} layout="vertical" onFinish={handleSave} initialValues={{ flow_type: 'PAYMENT' }}>
                    <Form.Item name="flow_type" label="Loại phiếu">
                        <Radio.Group buttonStyle="solid">
                            <Radio.Button value="RECEIPT">Phiếu Thu (Tiền vào)</Radio.Button>
                            <Radio.Button value="PAYMENT">Phiếu Chi (Tiền ra)</Radio.Button>
                        </Radio.Group>
                    </Form.Item>

                    <Form.Item name="category" label="Lý do / Hạng mục" rules={[{ required: true }]}>
                        <Input placeholder="Ví dụ: Mua nước, Tiền điện, Thu khác..." />
                    </Form.Item>

                    <Form.Item name="amount" label="Số tiền (VNĐ)" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/\$\s?|(,*)/g, '')} />
                    </Form.Item>

                    <Form.Item name="description" label="Diễn giải chi tiết">
                        <Input.TextArea rows={3} />
                    </Form.Item>

                    <Form.Item name="branch" label="Chi nhánh" rules={[{ required: true }]}>
                        <Select>
                            {branches.map(b => <Option key={b.id} value={b.id}>{b.name}</Option>)}
                        </Select>
                    </Form.Item>

                    <div style={{ textAlign: 'right', marginTop: 10 }}>
                        <Button onClick={() => setIsModalOpen(false)} style={{ marginRight: 10 }}>Hủy</Button>
                        <Button type="primary" htmlType="submit">Lưu Phiếu</Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default CashFlowManager;