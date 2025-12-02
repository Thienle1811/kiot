import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, Row, Col, Statistic, Select, Table, Tabs, DatePicker, Button, message, Empty, Spin } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarOutlined, ShoppingCartOutlined, BankOutlined, FileExcelOutlined, HomeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
// --- IMPORT THƯ VIỆN EXCEL ---
import * as XLSX from 'xlsx';

const { Option } = Select;
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const ReportManager = () => {
    const [filter, setFilter] = useState('this_month');
    const [revenueData, setRevenueData] = useState(null);
    const [financeData, setFinanceData] = useState(null);
    const [goodsData, setGoodsData] = useState([]);
    const [roomData, setRoomData] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const [revRes, finRes, goodsRes, roomRes] = await Promise.all([
                axios.get(`/api/reports/revenue/?filter=${filter}`),
                axios.get(`/api/reports/finance/?filter=${filter}`),
                axios.get(`/api/reports/goods/?filter=${filter}`),
                axios.get(`/api/reports/room_performance/?filter=${filter}`)
            ]);

            if (revRes.data && typeof revRes.data === 'object') setRevenueData(revRes.data);
            if (finRes.data && typeof finRes.data === 'object') setFinanceData(finRes.data);
            if (Array.isArray(goodsRes.data)) setGoodsData(goodsRes.data);
            if (Array.isArray(roomRes.data)) setRoomData(roomRes.data);

        } catch (error) {
            console.error("Lỗi tải báo cáo:", error);
            message.error("Không thể tải dữ liệu báo cáo. Vui lòng kiểm tra Server.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [filter]);

    // --- HÀM XUẤT EXCEL (LOGIC MỚI) ---
    const handleExportExcel = () => {
        if (!revenueData || !financeData) {
            message.warning("Dữ liệu chưa tải xong, vui lòng đợi...");
            return;
        }

        // Tạo Workbook mới
        const workbook = XLSX.utils.book_new();

        // 1. SHEET DOANH THU
        const revSheetData = revenueData.chart_data.map(item => ({
            "Ngày": dayjs(item.date).format('DD/MM/YYYY'),
            "Doanh thu ngày": item.total
        }));
        // Thêm dòng tổng kết
        revSheetData.push({}); // Dòng trống
        revSheetData.push({ "Ngày": "TỔNG CỘNG", "Doanh thu ngày": revenueData.summary.total });
        revSheetData.push({ "Ngày": "Tiền phòng", "Doanh thu ngày": revenueData.summary.room_revenue });
        revSheetData.push({ "Ngày": "Tiền dịch vụ", "Doanh thu ngày": revenueData.summary.service_revenue });

        const wsRev = XLSX.utils.json_to_sheet(revSheetData);
        XLSX.utils.book_append_sheet(workbook, wsRev, "Doanh Thu");

        // 2. SHEET TÀI CHÍNH (SỔ QUỸ)
        const finSheetData = financeData.chart_data.map(item => ({
            "Ngày": dayjs(item.date).format('DD/MM/YYYY'),
            "Loại phiếu": item.flow_type === 'RECEIPT' ? 'Thu' : 'Chi',
            "Số tiền": item.amount
        }));
        finSheetData.push({});
        finSheetData.push({ "Ngày": "Tổng Thu", "Số tiền": financeData.summary.receipt });
        finSheetData.push({ "Ngày": "Tổng Chi", "Số tiền": financeData.summary.payment });
        finSheetData.push({ "Ngày": "Lợi Nhuận", "Số tiền": financeData.summary.profit });

        const wsFin = XLSX.utils.json_to_sheet(finSheetData);
        XLSX.utils.book_append_sheet(workbook, wsFin, "Tài Chính");

        // 3. SHEET HÀNG HÓA
        const goodsSheetData = goodsData.map(item => ({
            "Tên sản phẩm": item.product__name,
            "Số lượng bán": item.total_qty,
            "Doanh số": item.total_sales
        }));
        const wsGoods = XLSX.utils.json_to_sheet(goodsSheetData);
        XLSX.utils.book_append_sheet(workbook, wsGoods, "Hàng Hóa");

        // 4. SHEET HIỆU SUẤT PHÒNG
        const roomSheetData = roomData.map(item => ({
            "Tên phòng": item.room__name,
            "Loại phòng": item.room__room_class__name,
            "Số lượt khách": item.booking_count,
            "Doanh thu mang lại": item.total_revenue
        }));
        const wsRoom = XLSX.utils.json_to_sheet(roomSheetData);
        XLSX.utils.book_append_sheet(workbook, wsRoom, "Hiệu Suất Phòng");

        // Xuất file
        const fileName = `Bao_cao_WeTech_${dayjs().format('DDMMYYYY_HHmm')}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        message.success(`Đã xuất file: ${fileName}`);
    };

    // --- TAB 1: DOANH THU ---
    const RevenueTab = () => {
        if (!revenueData || !revenueData.chart_data || !revenueData.summary) return <Empty description="Chưa có dữ liệu doanh thu" />;
        
        const chartData = revenueData.chart_data.map(d => ({
            date: dayjs(d.date).format('DD/MM'),
            total: d.total
        }));

        const pieData = [
            { name: 'Tiền phòng', value: revenueData.summary.room_revenue || 0 },
            { name: 'Dịch vụ', value: revenueData.summary.service_revenue || 0 }
        ];

        return (
            <div>
                <Row gutter={16} style={{marginBottom: 20}}>
                    <Col span={8}><Card><Statistic title="Tổng Doanh Thu" value={revenueData.summary.total} suffix="đ" valueStyle={{color: '#3f8600'}} /></Card></Col>
                    <Col span={8}><Card><Statistic title="Tiền Phòng" value={revenueData.summary.room_revenue} suffix="đ" valueStyle={{color: '#1890ff'}} /></Card></Col>
                    <Col span={8}><Card><Statistic title="Dịch Vụ" value={revenueData.summary.service_revenue} suffix="đ" valueStyle={{color: '#faad14'}} /></Card></Col>
                </Row>
                <Row gutter={16}>
                    <Col span={16}>
                        <Card title="Biểu đồ doanh thu theo thời gian">
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip formatter={(val) => `${parseInt(val).toLocaleString()} đ`} />
                                        <Bar dataKey="total" name="Doanh thu" fill="#8884d8" barSize={50} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card title="Cơ cấu doanh thu">
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label>
                                            {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip formatter={(val) => `${parseInt(val).toLocaleString()} đ`} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </Col>
                </Row>
            </div>
        );
    };

    // --- TAB 2: TÀI CHÍNH ---
    const FinanceTab = () => {
        if (!financeData || !financeData.chart_data) return <Empty description="Chưa có dữ liệu tài chính" />;
        const chartMap = {};
        financeData.chart_data.forEach(item => {
            const d = dayjs(item.date).format('DD/MM');
            if (!chartMap[d]) chartMap[d] = { date: d, thu: 0, chi: 0 };
            if (item.flow_type === 'RECEIPT') chartMap[d].thu = item.amount;
            else chartMap[d].chi = item.amount;
        });
        const chartData = Object.values(chartMap);

        return (
            <div>
                <Row gutter={16} style={{marginBottom: 20}}>
                    <Col span={8}><Card><Statistic title="Tổng Thu" value={financeData.summary.receipt} suffix="đ" valueStyle={{color: 'green'}} /></Card></Col>
                    <Col span={8}><Card><Statistic title="Tổng Chi" value={financeData.summary.payment} suffix="đ" valueStyle={{color: 'red'}} /></Card></Col>
                    <Col span={8}><Card><Statistic title="Lợi Nhuận Ròng" value={financeData.summary.profit} suffix="đ" valueStyle={{color: 'blue'}} /></Card></Col>
                </Row>
                <Card title="Biểu đồ dòng tiền (Thu - Chi)">
                    <div style={{ width: '100%', height: 400 }}>
                        <ResponsiveContainer>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip formatter={(val) => `${parseInt(val).toLocaleString()} đ`} />
                                <Legend />
                                <Bar dataKey="thu" name="Thu" fill="#52c41a" />
                                <Bar dataKey="chi" name="Chi" fill="#ff4d4f" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        );
    };

    // --- TAB 3: HÀNG HÓA ---
    const GoodsTab = () => (
        <Card title="Top Hàng hóa / Dịch vụ bán chạy">
            <Table 
                dataSource={goodsData} 
                rowKey="product__name"
                pagination={{ pageSize: 5 }}
                columns={[
                    { title: 'Tên sản phẩm', dataIndex: 'product__name', key: 'name' },
                    { title: 'Số lượng bán', dataIndex: 'total_qty', key: 'qty', sorter: (a, b) => a.total_qty - b.total_qty },
                    { title: 'Doanh số', dataIndex: 'total_sales', key: 'sales', render: val => `${parseInt(val || 0).toLocaleString()} đ`, sorter: (a, b) => a.total_sales - b.total_sales },
                ]}
            />
        </Card>
    );

    // --- TAB 4: HIỆU SUẤT PHÒNG ---
    const RoomTab = () => (
        <Card title="Hiệu quả kinh doanh theo Phòng">
            <Table 
                dataSource={roomData} 
                rowKey="room__name"
                pagination={{ pageSize: 5 }}
                columns={[
                    { title: 'Phòng', dataIndex: 'room__name', key: 'name' },
                    { title: 'Loại phòng', dataIndex: 'room__room_class__name', key: 'class' },
                    { title: 'Số lượt khách', dataIndex: 'booking_count', key: 'count', sorter: (a, b) => a.booking_count - b.booking_count },
                    { title: 'Tổng doanh thu', dataIndex: 'total_revenue', key: 'rev', render: val => val ? `${parseInt(val).toLocaleString()} đ` : '0 đ', sorter: (a, b) => a.total_revenue - b.total_revenue },
                ]}
            />
        </Card>
    );

    if (loading && !revenueData) return <div style={{textAlign:'center', padding: 50}}><Spin size="large" tip="Đang tải báo cáo..." /></div>;

    return (
        <div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
                <div style={{fontSize: 20, fontWeight: 'bold', color: '#0050b3'}}>TRUNG TÂM BÁO CÁO</div>
                <div style={{display: 'flex', gap: 10}}>
                    <Select defaultValue="this_month" style={{ width: 150 }} onChange={setFilter}>
                        <Option value="today">Hôm nay</Option>
                        <Option value="yesterday">Hôm qua</Option>
                        <Option value="last_7_days">7 ngày qua</Option>
                        <Option value="this_month">Tháng này</Option>
                    </Select>
                    {/* NÚT XUẤT EXCEL ĐÃ CÓ LOGIC */}
                    <Button icon={<FileExcelOutlined />} onClick={handleExportExcel}>Xuất Excel</Button>
                </div>
            </div>

            <Tabs
                defaultActiveKey="1"
                type="card"
                items={[
                    { label: <span><DollarOutlined />Doanh thu</span>, key: '1', children: <RevenueTab /> },
                    { label: <span><BankOutlined />Tài chính</span>, key: '2', children: <FinanceTab /> },
                    { label: <span><ShoppingCartOutlined />Hàng hóa</span>, key: '3', children: <GoodsTab /> },
                    { label: <span><HomeOutlined />Hiệu suất phòng</span>, key: '4', children: <RoomTab /> },
                ]}
            />
        </div>
    );
};

export default ReportManager;