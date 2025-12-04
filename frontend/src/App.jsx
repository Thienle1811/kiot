import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, Tag, Typography, Row, Col, Badge, Spin, Modal, Button, Form, Input, DatePicker, message, Descriptions, Table, Tabs, Statistic, Layout, Select, InputNumber, Divider, Menu, Radio } from 'antd';
import { 
  HomeOutlined, UserOutlined, CheckCircleOutlined, HistoryOutlined, AppstoreOutlined, 
  PieChartOutlined, ArrowUpOutlined, LogoutOutlined, PlusOutlined, CoffeeOutlined, 
  PrinterOutlined, ShopOutlined, SettingOutlined, GoldOutlined, UsergroupAddOutlined, 
  MinusCircleOutlined, SearchOutlined, EyeOutlined, TeamOutlined, WalletOutlined, 
  CalendarOutlined, FileTextOutlined, FileExcelOutlined, ToolOutlined // <--- Import thêm icon ToolOutlined
} from '@ant-design/icons';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

import Login from './Login';
import ProductManager from './ProductManager';
import RoomManager from './RoomManager';
import RoomClassManager from './RoomClassManager';
import CustomerManager from './CustomerManager';
import EmployeeManager from './EmployeeManager';
import CashFlowManager from './CashFlowManager';
import ReservationManager from './ReservationManager';
import ReportManager from './ReportManager';
import DeviceManager from './DeviceManager'; // <--- Import Component mới

const { Title, Text } = Typography;
const { Header, Content } = Layout;
const { Option } = Select;

function App() {
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({ revenue_chart: [], occupancy_chart: [], total_rooms: 0 });
  const [timeFilter, setTimeFilter] = useState('this_month');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [currentKey, setCurrentKey] = useState("2");
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailBooking, setDetailBooking] = useState(null);
  
  const [checkInForm] = Form.useForm();

  useEffect(() => {
    if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        fetchData();
    }
  }, [token, currentKey, timeFilter]);

  const fetchData = async () => {
    if (rooms.length === 0) setLoading(true);
    try {
      const [roomRes, bookingRes, productRes, statsRes] = await Promise.all([
        axios.get('/api/rooms/'),
        axios.get('/api/bookings/'),
        axios.get('/api/products/'),
        axios.get(`/api/bookings/stats/?filter=${timeFilter}`)
      ]);
      setRooms(roomRes.data);
      setBookings(bookingRes.data);
      setProducts(productRes.data);
      setDashboardStats(statsRes.data);
    } catch (error) {
      if (error.response && error.response.status === 401) handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
      localStorage.removeItem('access_token');
      setToken(null);
      setRooms([]);
      message.info('Đã đăng xuất');
  };

  const handleExportDashboard = () => {
      if (bookings.length === 0) { message.warning("Chưa có dữ liệu!"); return; }
      const data = bookings.map(b => ({
          "Mã đơn": b.code, "Ngày tạo": dayjs(b.created_at).format('DD/MM/YYYY HH:mm'),
          "Khách hàng": b.customer_name, "Phòng": b.room_name, "Tổng tiền": parseInt(b.total_amount),
          "Trạng thái": b.status === 'COMPLETED' ? 'Đã thanh toán' : 'Chưa thanh toán'
      }));
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Danh sách đơn hàng");
      XLSX.writeFile(workbook, `DoanhThu_TongQuan_${dayjs().format('DDMMYYYY')}.xlsx`);
      message.success("Đã xuất file Excel!");
  };

  const handleRoomClick = (room) => {
    setSelectedRoom(room);
    setSelectedProduct(null);
    setQuantity(1);
    if (room.status === 'AVAILABLE') {
        checkInForm.resetFields();
        checkInForm.setFieldsValue({ 
            identity_type: 'CCCD', 
            accompanying_people: [], 
            check_in_time: dayjs(),
            booking_type: 'DAILY' 
        });
    }
    setIsModalOpen(true);
  };

  const handleViewDetail = (record) => {
      setDetailBooking(record);
      setIsDetailModalOpen(true);
  };

  const printBill = (data) => {
    const customerName = data.customer || data.customer_name;
    const totalMoney = data.total_money || data.total_amount;
    const roomName = data.room_name;
    const code = data.code;
    const bookingType = data.booking_type || ''; 
    let serviceMoney = data.service_money;
    if (serviceMoney === undefined && data.service_orders) {
        serviceMoney = data.service_orders.reduce((sum, item) => sum + parseInt(item.total_price), 0);
    }
    let roomMoney = data.room_money;
    if (roomMoney === undefined) roomMoney = parseInt(totalMoney) - (serviceMoney || 0);

    const printContent = `<html><head><title>Hóa đơn</title><style>body{font-family:'Courier New';font-size:14px;width:300px;margin:0 auto}.header{text-align:center;border-bottom:1px dashed #000;padding-bottom:10px}.table{width:100%;margin-top:10px}.price{text-align:right}.total{border-top:1px dashed #000;margin-top:10px;font-weight:bold;text-align:right}</style></head><body><div class="header"><div style="font-size:18px;font-weight:bold">WETECH HOTEL</div></div><div>Mã: <b>${code}</b></div><div>Khách: ${customerName}</div><div>Phòng: ${roomName}</div><div style="font-style:italic">Hình thức: ${bookingType}</div><table class="table"><tr><td>Tiền phòng</td><td class="price">${parseInt(roomMoney || 0).toLocaleString()}</td></tr><tr><td>Dịch vụ</td><td class="price">${parseInt(serviceMoney || 0).toLocaleString()}</td></tr></table><div class="total">TỔNG: ${parseInt(totalMoney).toLocaleString()} VNĐ</div></body></html>`;
    const win = window.open('', '', 'height=600,width=400');
    win.document.write(printContent);
    win.document.close();
    win.print();
  };

  const handleAddService = async () => {
      if (!selectedProduct) return message.warning("Chọn món!");
      try {
          await axios.post(`/api/rooms/${selectedRoom.id}/add_service/`, { product_id: selectedProduct, quantity: quantity });
          message.success("Thêm thành công!");
          setSelectedProduct(null); setQuantity(1);
      } catch (error) { message.error("Lỗi thêm dịch vụ"); }
  };

  const handleOk = async () => {
    if (!selectedRoom) return;
    if (selectedRoom.status === 'AVAILABLE') {
        try {
            const values = await checkInForm.validateFields();
            const payload = {
                ...values,
                birth_date: values.birth_date ? values.birth_date.format('YYYY-MM-DD') : null,
                accompanying_people: values.accompanying_people ? values.accompanying_people.map(p => ({ ...p, birth_date: p.birth_date ? p.birth_date.format('YYYY-MM-DD') : null })) : []
            };
            await axios.post(`/api/rooms/${selectedRoom.id}/check_in/`, payload);
            message.success('Nhận phòng thành công!');
            setIsModalOpen(false);
            fetchData(); 
        } catch (error) {
            if (error.errorFields) message.error('Điền đủ thông tin (*)');
            else message.error('Lỗi khi nhận phòng');
        }
    } else {
        try {
            const res = await axios.post(`/api/rooms/${selectedRoom.id}/check_out/`);
            const data = res.data.data;
            Modal.success({
                title: 'Thanh toán thành công!',
                content: (<div><p>Khách: <b>{data.customer}</b></p><p>Hình thức: <b>{data.booking_type}</b></p><h2 style={{color:'red'}}>TỔNG: {parseInt(data.total_money).toLocaleString()} đ</h2><Button type="primary" icon={<PrinterOutlined />} onClick={() => printBill(data)}>In Hóa Đơn</Button></div>),
            });
            setIsModalOpen(false);
            fetchData(); 
        } catch (error) { message.error('Lỗi khi trả phòng'); }
    }
  };

  const roomsByArea = rooms.reduce((acc, room) => {
    const areaName = room.area_name || "Chưa phân khu";
    if (!acc[areaName]) acc[areaName] = [];
    acc[areaName].push(room);
    return acc;
  }, {});

  const bookingColumns = [
    { title: 'Mã đơn', dataIndex: 'code', key: 'code', render: (text, record) => <a onClick={() => handleViewDetail(record)} style={{fontWeight:'bold', color:'#1890ff', cursor: 'pointer'}}>{text} <EyeOutlined /></a> },
    { title: 'Khách hàng', dataIndex: 'customer_name', key: 'customer_name' },
    { title: 'Phòng', dataIndex: 'room_name', key: 'room_name', render: text => <Tag color="blue">{text}</Tag> },
    { title: 'Tổng tiền', dataIndex: 'total_amount', key: 'total_amount', render: val => <b style={{color:'red'}}>{parseInt(val).toLocaleString()} đ</b> },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: val => val === 'COMPLETED' ? <Tag color="green">Đã thanh toán</Tag> : <Tag color="orange">Đang ở</Tag> },
    { title: 'Ngày tạo', dataIndex: 'created_at', key: 'created_at', render: val => dayjs(val).format('DD/MM HH:mm') },
  ];

  const revenueChartData = dashboardStats.revenue_chart.map(item => ({ date: dayjs(item.date).format('DD/MM'), amount: item.total }));
  const occupancyChartData = dashboardStats.occupancy_chart.map(item => ({ date: dayjs(item.date).format('DD/MM'), rate: ((item.count / dashboardStats.total_rooms) * 100).toFixed(0) }));

  const menuItems = [
    { label: 'Tổng quan', key: '1', icon: <PieChartOutlined /> },
    { label: 'Buồng phòng', key: 'group_room', icon: <AppstoreOutlined />, children: [
            { label: 'Sơ đồ phòng', key: '2', icon: <AppstoreOutlined /> },
            { label: 'Quản lý Phòng', key: '5', icon: <SettingOutlined /> },
            { label: 'Hạng phòng & Giá', key: '6', icon: <GoldOutlined /> },
            { label: 'Thiết bị & Tài sản', key: '12', icon: <ToolOutlined /> }, // <--- THÊM MENU THIẾT BỊ
    ]},
    { label: 'Lịch sử GD', key: '3', icon: <HistoryOutlined /> },
    { label: 'Sổ quỹ', key: '9', icon: <WalletOutlined /> },
    { label: 'Báo cáo', key: '11', icon: <FileTextOutlined /> },
    { label: 'Đặt phòng', key: '10', icon: <CalendarOutlined /> },
    { label: 'Hàng hóa', key: '4', icon: <ShopOutlined /> },
    { label: 'Khách hàng', key: '7', icon: <UsergroupAddOutlined /> },
    { label: 'Nhân viên', key: '8', icon: <TeamOutlined /> },
  ];

  const renderContent = () => {
      switch (currentKey) {
          case '1': return (
                <div>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
                        <Title level={4}>Báo cáo hoạt động kinh doanh</Title>
                        <div style={{display: 'flex', gap: 10}}><Select defaultValue="this_month" style={{ width: 150 }} onChange={setTimeFilter}><Option value="today">Hôm nay</Option><Option value="last_7_days">7 ngày qua</Option><Option value="this_month">Tháng này</Option></Select><Button icon={<FileExcelOutlined />} onClick={handleExportDashboard}>Xuất Excel</Button></div>
                    </div>
                    <Row gutter={16} style={{ marginBottom: 20 }}>
                        <Col span={8}><Card bordered={false}><Statistic title="Doanh thu" value={revenueChartData.reduce((a,b)=>a+b.amount,0)} suffix="đ" valueStyle={{ color: '#3f8600' }} prefix={<ArrowUpOutlined />}/></Card></Col>
                        <Col span={8}><Card bordered={false}><Statistic title="Phòng đang có khách" value={rooms.filter(r => r.status === 'OCCUPIED').length} suffix={`/ ${rooms.length}`} valueStyle={{ color: '#cf1322' }}/></Card></Col>
                        <Col span={8}><Card bordered={false}><Statistic title="Công suất" value={rooms.length ? ((rooms.filter(r => r.status === 'OCCUPIED').length / rooms.length) * 100).toFixed(0) : 0} suffix="%" valueStyle={{ color: '#1890ff' }}/></Card></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}><Card title="Biểu đồ Doanh thu (VNĐ)"><div style={{ width: '99%', height: 300, minHeight: 300 }}><ResponsiveContainer><BarChart data={revenueChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip formatter={(value) => `${value.toLocaleString()} đ`} /><Bar dataKey="amount" name="Doanh thu" fill="#8884d8" barSize={40} /></BarChart></ResponsiveContainer></div></Card></Col>
                        <Col span={12}><Card title="Biểu đồ Công suất phòng (%)"><div style={{ width: '99%', height: 300, minHeight: 300 }}><ResponsiveContainer><LineChart data={occupancyChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis domain={[0, 100]} /><Tooltip formatter={(value) => `${value} %`} /><Line type="monotone" dataKey="rate" name="Công suất" stroke="#82ca9d" strokeWidth={3} /></LineChart></ResponsiveContainer></div></Card></Col>
                    </Row>
                </div>
              );
          case '2': return (<div>{Object.keys(roomsByArea).map(area => (<Card key={area} title={area} size="small" style={{ marginBottom: 20 }}><Row gutter={[16, 16]}>{roomsByArea[area].map(room => (<Col key={room.id} xs={24} sm={12} md={8} lg={6} xl={4}><Badge.Ribbon text={room.room_class_name} color="blue"><Card hoverable onClick={() => handleRoomClick(room)} style={{ background: room.status === 'AVAILABLE' ? '#f6ffed' : '#fff7e6', textAlign: 'center' }}><Title level={4}>{room.name}</Title><Tag color={room.status === 'AVAILABLE' ? 'success' : 'warning'}>{room.status === 'AVAILABLE' ? 'Trống' : 'Có khách'}</Tag></Card></Badge.Ribbon></Col>))}</Row></Card>))}</div>);
          case '3': return <Card title="Danh sách hóa đơn"><Table dataSource={bookings} columns={bookingColumns} rowKey="id" /></Card>;
          case '4': return <ProductManager />;
          case '5': return <RoomManager />;
          case '6': return <RoomClassManager />;
          case '7': return <CustomerManager />;
          case '8': return <EmployeeManager />;
          case '9': return <CashFlowManager />;
          case '10': return <ReservationManager />;
          case '11': return <ReportManager />;
          case '12': return <DeviceManager />; // <--- RENDER COMPONENT THIẾT BỊ
          default: return null;
      }
  };

  if (!token) return <Login onLoginSuccess={() => setToken(localStorage.getItem('access_token'))} />;
  if (loading && rooms.length === 0) return <div style={{textAlign: 'center', marginTop: 100}}><Spin size="large" /></div>;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', background: '#fff', padding: '0 20px', boxShadow: '0 2px 8px #f0f1f2' }}>
         <div style={{ marginRight: 20, display: 'flex', alignItems: 'center' }}><Title level={4} style={{ color: '#0050b3', margin: 0, marginRight: 10 }}>WeTech</Title></div>
         <Menu theme="light" mode="horizontal" selectedKeys={[currentKey]} items={menuItems} onClick={(e) => setCurrentKey(e.key)} style={{ flex: 1, borderBottom: 'none' }} />
         <Button icon={<LogoutOutlined />} onClick={handleLogout}>Đăng xuất</Button>
      </Header>
      <Content style={{ padding: '30px', background: '#f0f2f5' }}>
        <div style={{ textAlign: 'right', marginBottom: 20 }}><Button type="primary" onClick={fetchData}>🔄 Cập nhật</Button></div>
        
        {renderContent()}

        {/* Modal Xử lý phòng (Giữ nguyên) */}
        <Modal title={selectedRoom ? `Xử lý: ${selectedRoom.name}` : "Thông tin"} open={isModalOpen} onOk={handleOk} onCancel={() => setIsModalOpen(false)} width={selectedRoom?.status === 'AVAILABLE' ? 900 : 600} okText={selectedRoom?.status === 'AVAILABLE' ? "Nhận phòng" : "Thanh toán & Trả"} okButtonProps={{ danger: selectedRoom?.status !== 'AVAILABLE', size: 'large' }} cancelText="Đóng">
            {selectedRoom && (
                <Form form={checkInForm} layout="vertical" style={{ marginTop: 20 }}>
                    {selectedRoom.status === 'AVAILABLE' && (
                        <>
                            <Row gutter={16} style={{marginBottom: 20, background: '#e6f7ff', padding: 10, borderRadius: 5}}>
                                <Col span={24}>
                                    <Form.Item name="booking_type" label="Hình thức đặt phòng" initialValue="DAILY" style={{marginBottom: 0}}>
                                        <Radio.Group buttonStyle="solid">
                                            <Radio.Button value="HOURLY">Theo giờ ({parseInt(selectedRoom.price_hourly).toLocaleString()}đ/h)</Radio.Button>
                                            <Radio.Button value="DAILY">Theo ngày</Radio.Button>
                                            <Radio.Button value="OVERNIGHT">Qua đêm</Radio.Button>
                                        </Radio.Group>
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Divider orientation="left" style={{borderColor: '#1890ff', color: '#1890ff'}}>Khách chính</Divider>
                            <Row gutter={16}>
                                <Col span={12}><Form.Item name="full_name" label="Họ tên (*)" rules={[{ required: true }]}><Input prefix={<UserOutlined />} /></Form.Item></Col>
                                <Col span={12}><Form.Item name="birth_date" label="Ngày sinh (*)" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{width:'100%'}} /></Form.Item></Col>
                                <Col span={8}><Form.Item name="identity_type" label="Giấy tờ" initialValue="CCCD"><Select><Option value="CCCD">CCCD</Option><Option value="PASSPORT">Passport</Option></Select></Form.Item></Col>
                                <Col span={8}><Form.Item name="identity_card" label="Số giấy tờ"><Input /></Form.Item></Col>
                                <Col span={8}><Form.Item name="phone" label="SĐT"><Input /></Form.Item></Col>
                                <Col span={16}><Form.Item name="address" label="Địa chỉ (*)" rules={[{ required: true }]}><Input /></Form.Item></Col>
                                <Col span={8}><Form.Item name="license_plate" label="Biển số"><Input /></Form.Item></Col>
                            </Row>
                            <Divider orientation="left" style={{borderColor: '#52c41a', color: '#52c41a'}}>Người đi cùng</Divider>
                            <Form.List name="accompanying_people">
                                {(fields, { add, remove }) => (<>{fields.map(({ key, name, ...restField }) => (<Card key={key} size="small" style={{ marginBottom: 10, background: '#f6ffed' }} extra={<MinusCircleOutlined onClick={() => remove(name)} style={{color: 'red'}} />}><Row gutter={16}><Col span={12}><Form.Item {...restField} name={[name, 'full_name']} label="Họ tên"><Input /></Form.Item></Col><Col span={12}><Form.Item {...restField} name={[name, 'birth_date']} label="Ngày sinh"><DatePicker format="DD/MM/YYYY" style={{width:'100%'}} /></Form.Item></Col><Col span={8}><Form.Item {...restField} name={[name, 'identity_type']} label="Giấy tờ"><Select><Option value="CCCD">CCCD</Option></Select></Form.Item></Col><Col span={8}><Form.Item {...restField} name={[name, 'identity_card']} label="Số GT"><Input /></Form.Item></Col><Col span={8}><Form.Item {...restField} name={[name, 'phone']} label="SĐT"><Input /></Form.Item></Col><Col span={16}><Form.Item {...restField} name={[name, 'address']} label="Địa chỉ"><Input /></Form.Item></Col><Col span={8}><Form.Item {...restField} name={[name, 'license_plate']} label="Biển số"><Input /></Form.Item></Col></Row></Card>))}<Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Thêm người đi cùng</Button></>)}
                            </Form.List>
                        </>
                    )}
                    {selectedRoom.status !== 'AVAILABLE' && (
                        <div style={{marginTop: 20, background: '#fafafa', padding: 15, borderRadius: 8}}>
                            <Descriptions bordered column={1} size="small" style={{marginBottom: 15}}>
                                <Descriptions.Item label="Loại phòng">{selectedRoom.room_class_name}</Descriptions.Item>
                                <Descriptions.Item label={selectedRoom.current_booking ? `Giá ${selectedRoom.current_booking.booking_type_display}` : "Giá niêm yết"}>
                                    {selectedRoom.current_booking ? parseInt(selectedRoom.current_booking.price).toLocaleString() : parseInt(selectedRoom.price_hourly).toLocaleString()} đ
                                </Descriptions.Item>
                            </Descriptions>
                            <Title level={5}><CoffeeOutlined /> Gọi Dịch vụ / Minibar</Title>
                            <div style={{ display: 'flex', gap: 10 }}><Select placeholder="Chọn món..." style={{ flex: 2 }} value={selectedProduct} onChange={setSelectedProduct}>{products.map(p => <Option key={p.id} value={p.id}>{p.name} - {parseInt(p.selling_price).toLocaleString()} đ</Option>)}</Select><InputNumber min={1} value={quantity} onChange={setQuantity} /><Button type="dashed" onClick={handleAddService}>Thêm</Button></div>
                            <Divider /><div style={{textAlign: 'center', color: '#8c8c8c'}}><CheckCircleOutlined style={{ fontSize: 24, color: 'orange', marginBottom: 5 }} /><p>Bấm nút màu đỏ bên dưới để Thanh toán</p></div>
                        </div>
                    )}
                </Form>
            )}
        </Modal>
        
        {/* Modal Chi tiết (Giữ nguyên) */}
        <Modal title="Chi tiết giao dịch" open={isDetailModalOpen} onCancel={() => setIsDetailModalOpen(false)} footer={[<Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => printBill(detailBooking)}>In Lại Hóa Đơn</Button>,<Button key="close" onClick={() => setIsDetailModalOpen(false)}>Đóng</Button>]} width={700}>
            {detailBooking && (
                <div style={{padding: 10}}>
                    <Descriptions title="Thông tin chung" bordered column={2} size="small"><Descriptions.Item label="Mã đơn">{detailBooking.code}</Descriptions.Item><Descriptions.Item label="Ngày tạo">{dayjs(detailBooking.created_at).format('DD/MM/YYYY HH:mm')}</Descriptions.Item><Descriptions.Item label="Khách hàng">{detailBooking.customer_name}</Descriptions.Item><Descriptions.Item label="Trạng thái">{detailBooking.status === 'COMPLETED' ? <Tag color="green">Đã thanh toán</Tag> : <Tag color="orange">Chưa thanh toán</Tag>}</Descriptions.Item></Descriptions>
                    <Divider orientation="left">Chi tiết phòng & Giờ ở</Divider>
                    {detailBooking.booking_details && detailBooking.booking_details.map((item, index) => (<Card key={index} size="small" style={{marginBottom: 10, background: '#f9f9f9'}}><p><b>Phòng:</b> {item.room_name}</p><p><b>Giờ vào:</b> {dayjs(item.check_in_actual).format('DD/MM/YYYY HH:mm')}</p><p><b>Giờ ra:</b> {item.check_out_actual ? dayjs(item.check_out_actual).format('DD/MM/YYYY HH:mm') : 'Chưa ra'}</p></Card>))}
                    <Divider orientation="left">Dịch vụ đã dùng</Divider>
                    <Table dataSource={detailBooking.service_orders} rowKey="id" pagination={false} size="small" columns={[{ title: 'Tên món', dataIndex: 'product_name' }, { title: 'Đơn giá', dataIndex: 'unit_price_snapshot', render: val => parseInt(val).toLocaleString() }, { title: 'SL', dataIndex: 'quantity' }, { title: 'Thành tiền', dataIndex: 'total_price', render: val => parseInt(val).toLocaleString() }]} />
                    <div style={{marginTop: 20, textAlign: 'right'}}><h2 style={{color: 'red'}}>TỔNG CỘNG: {parseInt(detailBooking.total_amount).toLocaleString()} đ</h2></div>
                </div>
            )}
        </Modal>
      </Content>
    </Layout>
  );
}

export default App;