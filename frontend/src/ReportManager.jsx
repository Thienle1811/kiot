import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, Row, Col, Statistic, Select, Table, Tabs, DatePicker, Button, message, Empty, Spin, Tag } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarOutlined, ShoppingCartOutlined, BankOutlined, FileExcelOutlined, HomeOutlined, HistoryOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

const { Option } = Select;
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const ReportManager = () => {
    const [filter, setFilter] = useState('this_month');
    const [revenueData, setRevenueData] = useState(null);
    const [financeData, setFinanceData] = useState(null);
    const [goodsData, setGoodsData] = useState([]);
    const [roomData, setRoomData] = useState([]);
    const [activityLogs, setActivityLogs] = useState([]); // <--- State mới cho Log
    const [loading, setLoading] = useState(false);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const [revRes, finRes, goodsRes, roomRes, actRes] = await Promise.all([
                axios.get(`/api/reports/revenue/?filter=${filter}`),
                axios.get(`/api/reports/finance/?filter=${filter}`),
                axios.get(`/api/reports/goods/?filter=${filter}`),
                axios.get(`/api/reports/room_performance/?filter=${filter}`),
                axios.get('/api/activity-logs/') // <--- Gọi API lấy Log
            ]);

            if (revRes.data && typeof revRes.data === 'object') setRevenueData(revRes.data);
            if (finRes.data && typeof finRes.data === 'object') setFinanceData(finRes.data);
            if (Array.isArray(goodsRes.data)) setGoodsData(goodsRes.data);
            if (Array.isArray(roomRes.data)) setRoomData(roomRes.data);
            if (Array.isArray(actRes.data)) setActivityLogs(actRes.data);

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

    // --- HÀM XUẤT EXCEL ---
    const handleExportExcel = () => {
        if (!revenueData || !financeData) {
            message.warning("Dữ liệu chưa tải xong, vui lòng đợi...");
            return;
        }

        const workbook = XLSX.utils.book_new();

        // 1. DOANH THU
        const revSheetData = revenueData.chart_data.map(item => ({
            "Ngày": dayjs(item.date).format('DD/MM/YYYY'),
            "Doanh thu ngày": item.total
        }));
        revSheetData.push({});
        revSheetData.push({ "Ngày": "TỔNG CỘNG", "Doanh thu ngày": revenueData.summary.total });
        revSheetData.push({ "Ngày": "Tiền phòng", "Doanh thu ngày": revenueData.summary.room_revenue });
        revSheetData.push({ "Ngày": "Tiền dịch vụ", "Doanh thu ngày": revenueData.summary.service_revenue });
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(revSheetData), "Doanh Thu");

        // 2. TÀI CHÍNH
        const finSheetData = financeData.chart_data.map(item => ({
            "Ngày": dayjs(item.date).format('DD/MM/YYYY'),
            "Loại phiếu": item.flow_type === 'RECEIPT' ? 'Thu' : 'Chi',
            "Số tiền": item.amount
        }));
        finSheetData.push({});
        finSheetData.push({ "Ngày": "Tổng Thu", "Số tiền": financeData.summary.receipt });
        finSheetData.push({ "Ngày": "Tổng Chi", "Số tiền": financeData.summary.payment });
        finSheetData.push({ "Ngày": "Lợi Nhuận", "Số tiền": financeData.summary.profit });
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(finSheetData), "Tài Chính");

        // 3. HÀNG HÓA
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(goodsData.map(item => ({
            "Tên sản phẩm": item.product__name,
            "Số lượng bán": item.total_qty,
            "Doanh số": item.total_sales
        }))), "Hàng Hóa");

        // 4. HIỆU SUẤT PHÒNG
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(roomData.map(item => ({
            "Tên phòng": item.room__name,
            "Loại phòng": item.room__room_class__name,
            "Số lượt khách": item.booking_count,
            "Doanh thu mang lại": item.total_revenue
        }))), "Hiệu Suất Phòng");

        // 5. NHẬT KÝ HOẠT ĐỘNG (MỚI)
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(activityLogs.map(log => ({
            "Thời gian": dayjs(log.created_at).format('DD/MM/YYYY HH:mm'),
            "Người thực hiện": log.user_name || 'Hệ thống',
            "Hành động": log.action,
            "Chi tiết": log.content
        }))), "Nhật Ký Hoạt Động");

        const fileName = `Bao_cao_WeTech_${dayjs().format('DDMMYYYY_HHmm')}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        message.success(`Đã xuất file: ${fileName}`);
    };

    // --- CÁC TAB CON ---
    const RevenueTab = () => {
        if (!revenueData || !revenueData.chart_data || !revenueData.summary) return <Empty description="Chưa có dữ liệu doanh thu" />;
        const chartData = revenueData.chart_data.map(d => ({ date: dayjs(d.date).format('DD/MM'), total: d.total }));
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

    // --- TAB HOẠT ĐỘNG (ACTIVITY LOG) ---
    const ActivityTab = () => (
        <Card title="Nhật ký hoạt động hệ thống (Gần đây)">
            <Table 
                dataSource={activityLogs} 
                rowKey="id"
                pagination={{ pageSize: 10 }}
                columns={[
                    { title: 'Thời gian', dataIndex: 'created_at', width: 180, render: val => dayjs(val).format('DD/MM/YYYY HH:mm') },
                    { title: 'Người thực hiện', dataIndex: 'user_name', width: 150, render: text => <Tag color="blue">{text || 'Hệ thống'}</Tag> },
                    { title: 'Hành động', dataIndex: 'action', width: 200, render: text => <b>{text}</b> },
                    { title: 'Chi tiết', dataIndex: 'content' },
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
                    { label: <span><HistoryOutlined />Hoạt động</span>, key: '5', children: <ActivityTab /> }, // <--- TAB MỚI
                ]}
            />
        </div>
    );
};

export default ReportManager;