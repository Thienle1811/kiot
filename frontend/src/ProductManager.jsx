import { useEffect, useState } from 'react';
import axios from 'axios';
// --- ĐÃ BỔ SUNG Row, Col VÀO DÒNG DƯỚI ĐÂY ---
import { Table, Button, Modal, Form, Input, InputNumber, message, Space, Popconfirm, Card, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ShopOutlined } from '@ant-design/icons';

const ProductManager = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null); 
    const [form] = Form.useForm();
    
    const [defaultBranchId, setDefaultBranchId] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://127.0.0.1:8000/api/products/');
            setProducts(res.data);

            if (!defaultBranchId) {
                const branchRes = await axios.get('http://127.0.0.1:8000/api/branches/');
                if (branchRes.data.length > 0) {
                    setDefaultBranchId(branchRes.data[0].id);
                }
            }
        } catch (error) {
            message.error("Lỗi tải dữ liệu hàng hóa");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = (product = null) => {
        setEditingProduct(product);
        if (product) {
            form.setFieldsValue(product); 
        } else {
            form.resetFields(); 
        }
        setIsModalOpen(true);
    };

    const handleSave = async (values) => {
        if (!defaultBranchId) {
            message.error("Chưa có chi nhánh nào trong hệ thống!");
            return;
        }

        try {
            const data = { ...values, branch: defaultBranchId };
            
            if (editingProduct) {
                await axios.put(`http://127.0.0.1:8000/api/products/${editingProduct.id}/`, data);
                message.success("Cập nhật thành công!");
            } else {
                await axios.post('http://127.0.0.1:8000/api/products/', data);
                message.success("Thêm mới thành công!");
            }
            setIsModalOpen(false);
            fetchData(); 
        } catch (error) {
            message.error("Lỗi khi lưu sản phẩm");
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`http://127.0.0.1:8000/api/products/${id}/`);
            message.success("Đã xóa sản phẩm");
            fetchData();
        } catch (error) {
            message.error("Không thể xóa (có thể do món này đã có trong hóa đơn cũ)");
        }
    };

    const columns = [
        {
            title: 'Tên hàng hóa / Dịch vụ',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <b>{text}</b>
        },
        {
            title: 'Giá bán',
            dataIndex: 'selling_price',
            key: 'selling_price',
            render: (val) => `${parseInt(val).toLocaleString()} đ`
        },
        {
            title: 'Tồn kho',
            dataIndex: 'stock_quantity',
            key: 'stock_quantity',
            render: (val) => <span style={{color: val < 10 ? 'red' : 'green'}}>{val}</span>
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => handleOpenModal(record)} />
                    <Popconfirm title="Bạn chắc chắn muốn xóa?" onConfirm={() => handleDelete(record.id)}>
                        <Button icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Card title={<span><ShopOutlined /> Quản lý Hàng hóa & Kho</span>} extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal(null)}>
                Thêm hàng hóa
            </Button>
        }>
            <Table 
                dataSource={products} 
                columns={columns} 
                rowKey="id" 
                loading={loading}
                pagination={{ pageSize: 5 }} 
            />

            <Modal
                title={editingProduct ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item name="name" label="Tên hàng hóa" rules={[{ required: true, message: 'Nhập tên hàng!' }]}>
                        <Input placeholder="Ví dụ: Nước suối, Giặt là..." />
                    </Form.Item>
                    
                    {/* KHU VỰC GÂY LỖI CŨ (Giờ đã có Row, Col import ở trên) */}
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="selling_price" label="Giá bán (VNĐ)" rules={[{ required: true }]}>
                                <InputNumber style={{ width: '100%' }} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/\$\s?|(,*)/g, '')}/>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="stock_quantity" label="Số lượng tồn kho" initialValue={100}>
                                <InputNumber style={{ width: '100%' }} />
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

export default ProductManager;