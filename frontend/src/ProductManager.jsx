import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
    Table, Button, Modal, Form, Input, InputNumber, message, 
    Space, Popconfirm, Card, Row, Col, Tag 
} from 'antd';
import { 
    PlusOutlined, EditOutlined, DeleteOutlined, ShopOutlined, 
    DownloadOutlined, ImportOutlined 
} from '@ant-design/icons';

const ProductManager = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Modal Thêm/Sửa thông tin sản phẩm
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [form] = Form.useForm();

    // Modal Nhập hàng (Import)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importingProduct, setImportingProduct] = useState(null);
    const [importForm] = Form.useForm();
    
    const [defaultBranchId, setDefaultBranchId] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/products/');
            setProducts(res.data);

            if (!defaultBranchId) {
                const branchRes = await axios.get('/api/branches/');
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

    // --- XỬ LÝ THÊM / SỬA SẢN PHẨM ---
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
                await axios.put(`/api/products/${editingProduct.id}/`, data);
                message.success("Cập nhật thành công!");
            } else {
                await axios.post('/api/products/', data);
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
            await axios.delete(`/api/products/${id}/`);
            message.success("Đã xóa sản phẩm");
            fetchData();
        } catch (error) {
            message.error("Không thể xóa (có thể do món này đã có trong hóa đơn cũ)");
        }
    };

    // --- XỬ LÝ NHẬP HÀNG (IMPORT) ---
    const handleOpenImport = (product) => {
        setImportingProduct(product);
        importForm.resetFields();
        importForm.setFieldsValue({ quantity: 10, total_cost: 0 }); // Mặc định
        setIsImportModalOpen(true);
    };

    const handleImport = async (values) => {
        try {
            await axios.post(`/api/products/${importingProduct.id}/import_goods/`, values);
            message.success(`Đã nhập kho cho ${importingProduct.name}`);
            setIsImportModalOpen(false);
            fetchData(); // Load lại để thấy tồn kho tăng
        } catch (error) {
            message.error("Lỗi khi nhập hàng");
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
            render: (val) => {
                let color = 'green';
                if (val === 0) color = 'orange';
                if (val < 0) color = 'red';
                return <Tag color={color} style={{fontWeight: 'bold', fontSize: 14}}>{val}</Tag>;
            }
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button 
                        icon={<DownloadOutlined />} 
                        onClick={() => handleOpenImport(record)} 
                        type="primary" ghost
                        title="Nhập hàng thêm"
                    >
                        Nhập
                    </Button>
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
                Thêm hàng hóa mới
            </Button>
        }>
            <Table 
                dataSource={products} 
                columns={columns} 
                rowKey="id" 
                loading={loading}
                pagination={{ pageSize: 10 }} 
            />

            {/* MODAL THÊM / SỬA THÔNG TIN */}
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
                    
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="selling_price" label="Giá bán (VNĐ)" rules={[{ required: true }]}>
                                <InputNumber 
                                    style={{ width: '100%' }} 
                                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="stock_quantity" label="Tồn kho ban đầu" initialValue={0}>
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

            {/* MODAL NHẬP HÀNG (IMPORT) */}
            <Modal
                title={<span><ImportOutlined /> Nhập kho: <b>{importingProduct?.name}</b></span>}
                open={isImportModalOpen}
                onCancel={() => setIsImportModalOpen(false)}
                footer={null}
            >
                <Form form={importForm} layout="vertical" onFinish={handleImport}>
                    <p style={{fontStyle: 'italic', color: '#666'}}>
                        Nhập số lượng hàng mới về. Hệ thống sẽ cộng vào tồn kho hiện tại và tự động tạo phiếu chi tiền nhập hàng.
                    </p>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="quantity" label="Số lượng nhập" rules={[{ required: true }]}>
                                <InputNumber style={{ width: '100%' }} min={1} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="total_cost" label="Tổng tiền nhập hàng (VNĐ)" initialValue={0}>
                                <InputNumber 
                                    style={{ width: '100%' }} 
                                    min={0}
                                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <div style={{ textAlign: 'right', marginTop: 10 }}>
                        <Button onClick={() => setIsImportModalOpen(false)} style={{ marginRight: 10 }}>Hủy</Button>
                        <Button type="primary" htmlType="submit" icon={<DownloadOutlined />}>Xác nhận Nhập</Button>
                    </div>
                </Form>
            </Modal>
        </Card>
    );
};

export default ProductManager;