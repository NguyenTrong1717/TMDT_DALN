import "./Statistics.css";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const revenueData = [
  { month: "T1", revenue: 12000000, orders: 32 },
  { month: "T2", revenue: 18500000, orders: 48 },
  { month: "T3", revenue: 14200000, orders: 39 },
  { month: "T4", revenue: 21000000, orders: 57 },
  { month: "T5", revenue: 19800000, orders: 53 },
  { month: "T6", revenue: 26500000, orders: 71 },
];

const categoryData = [
  { name: "LapTop", value: 42 },
  { name: "PC Gamming", value: 28 },
  { name: "Linh kiện", value: 18 },
  { name: "Máy Tính Đặc Biệt", value: 12 },
];

const COLORS = ["#6c63ff", "#43e97b", "#f7b731", "#ff5f6d"];

const topProducts = [
  {
    name: "PC GAMING RYZEN ",
    sold: 124,
    revenue: 18600000,
  },
  { name: "PC GAMING RYZEN 7-RTX 5070", sold: 58, revenue: 51620000 },
  { name: "Laptop TP 15s-fq1017TU ", sold: 87, revenue: 39150000 },
  { name: "Chuột không dây Logitech M221", sold: 43, revenue: 9460000 },
  { name: "Thế Giới Trò Chơi", sold: 96, revenue: 11520000 },
];

const fmt = (v) =>
  v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}:{" "}
          {typeof p.value === "number" && p.value > 1000
            ? fmt(p.value) + "₫"
            : p.value}
        </div>
      ))}
    </div>
  );
};

export default function Statistics() {
  const totalRevenue = revenueData.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = revenueData.reduce((s, d) => s + d.orders, 0);

  return (
    <div className="page-stats">
      <div className="stats-header">
        <h1>Thống kê</h1>
        <p>Tổng quan hiệu suất kinh doanh</p>
      </div>

      <div className="kpi-row">
        <div className="kpi" style={{ "--kpi-accent": "#6c63ff" }}>
          <div className="label">Doanh thu</div>
          <div className="value">{fmt(totalRevenue)}₫</div>
          <div className="delta">↑ 18% so với tháng trước</div>
        </div>
        <div className="kpi" style={{ "--kpi-accent": "#43e97b" }}>
          <div className="label">Đơn hàng</div>
          <div className="value">{totalOrders}</div>
          <div className="delta">↑ 12% so với tháng trước</div>
        </div>
        <div className="kpi" style={{ "--kpi-accent": "#f7b731" }}>
          <div className="label">Giá trị TB / đơn</div>
          <div className="value">{fmt(totalRevenue / totalOrders)}₫</div>
          <div className="delta">↑ 5% so với tháng trước</div>
        </div>
        <div className="kpi" style={{ "--kpi-accent": "#ff5f6d" }}>
          <div className="label">Khách hàng mới</div>
          <div className="value">34</div>
          <div className="delta">↑ 8% so với tháng trước</div>
        </div>
      </div>

      {/* Row 1: Area chart + Pie chart */}
      <div className="charts-grid charts-grid--2-1">
        <div className="chart-card">
          <div className="chart-title">Doanh thu theo tháng</div>
          <div className="chart-sub">6 tháng đầu năm 2025</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6c63ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6c63ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="month"
                tick={{ fill: "#555c75", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={fmt}
                tick={{ fill: "#555c75", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Doanh thu"
                stroke="#6c63ff"
                strokeWidth={2}
                fill="url(#revGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-title">Danh mục bán chạy</div>
          <div className="chart-sub">Tỷ lệ theo số đơn</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="45%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, color: "#8b90a7" }}
              />
              <Tooltip
                contentStyle={{
                  background: "#1e2336",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Bar chart + Top products */}
      <div className="charts-grid charts-grid--1-1">
        <div className="chart-card">
          <div className="chart-title">Số đơn hàng theo tháng</div>
          <div className="chart-sub">6 tháng đầu năm 2025</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={revenueData} barSize={24}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fill: "#555c75", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#555c75", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="orders"
                name="Đơn hàng"
                fill="#6c63ff"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="top-products">
          <div className="top-products-header">
            <div className="chart-title">Top sản phẩm bán chạy</div>
          </div>
          {topProducts.map((p, i) => {
            const maxSold = Math.max(...topProducts.map((x) => x.sold));
            return (
              <div className="tp-row" key={p.name}>
                <div className="tp-rank">#{i + 1}</div>
                <div className="tp-name">{p.name}</div>
                <div className="tp-bar-wrap">
                  <div className="tp-bar">
                    <div
                      className="tp-bar-fill"
                      style={{ width: `${(p.sold / maxSold) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="tp-sold">{p.sold} đơn</div>
                <div className="tp-rev">{fmt(p.revenue)}₫</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
