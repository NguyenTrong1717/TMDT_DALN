import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FaArrowDown,
  FaChartLine,
  FaBoxOpen,
  FaCalendarAlt,
  FaChartBar,
  FaCoins,
  FaSyncAlt,
  FaShoppingBag,
  FaUndoAlt,
  FaUserPlus,
} from "react-icons/fa";
import { apiFetch, readJson } from "../../utils/api";
import "./Statistics.css";

const money = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const compactMoney = (value) =>
  new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

const defaultRange = () => {
  const now = new Date();
  return {
    from: new Date(now.getTime() - 29 * 86400000).toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
};

const STATUS_LABELS = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  processing: "Đang xử lý",
  shipping: "Đang giao",
  delivered: "Đã giao",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
  returned: "Trả hàng",
};

const percent = (value) => {
  if (value == null) {
    return { label: "Chưa có kỳ đối chiếu", direction: "neutral" };
  }
  return {
    label: `${value >= 0 ? "+" : ""}${value.toFixed(1)}% so với kỳ trước`,
    direction: value >= 0 ? "up" : "down",
  };
};

const StatCard = ({ label, value, growth, icon: Icon, tone }) => {
  const trend = growth === undefined ? null : percent(growth);
  return (
    <article className={`stats-kpi stats-kpi--${tone}`}>
      <div className="stats-kpi__top">
        <span>{label}</span>
        <div className="stats-kpi__icon"><Icon /></div>
      </div>
      <strong>{value}</strong>
      {trend ? (
        <small className={`stats-kpi__trend stats-kpi__trend--${trend.direction}`}>
          {trend.direction === "up" && <FaChartLine />}
          {trend.direction === "down" && <FaArrowDown />}
          {trend.label}
        </small>
      ) : (
        <small className="stats-kpi__trend stats-kpi__trend--neutral">
          Ghi nhận trong kỳ
        </small>
      )}
    </article>
  );
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="stats-tooltip">
      <strong>{STATUS_LABELS[label] || label}</strong>
      <span>{payload[0].value} đơn hàng</span>
    </div>
  );
};

export default function Statistics() {
  const [range, setRange] = useState(defaultRange);
  const [appliedRange, setAppliedRange] = useState(defaultRange);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch(
        `/api/admin/statistics?from=${appliedRange.from}&to=${appliedRange.to}`,
      );
      setData(await readJson(response, "Không thể tải thống kê."));
    } catch (err) {
      setData(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [appliedRange.from, appliedRange.to]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const chartData = useMemo(
    () =>
      Object.entries(data?.statusCounts || {}).map(([status, count]) => ({
        status,
        label: STATUS_LABELS[status] || status,
        count,
      })),
    [data?.statusCounts],
  );

  const invalidRange = range.from && range.to && range.from > range.to;
  const applyRange = () => {
    if (range.from === appliedRange.from && range.to === appliedRange.to) {
      load();
      return;
    }
    setAppliedRange(range);
  };

  return (
    <section className="page-stats">
      <header className="stats-header">
        <div className="stats-header__copy">
          <span className="stats-eyebrow"><FaChartBar /> Báo cáo vận hành</span>
          <h1>Thống kê kinh doanh</h1>
          <p>Theo dõi doanh thu, đơn hàng và tồn kho từ dữ liệu thực tế.</p>
        </div>
        <div className="stats-range" aria-label="Chọn khoảng thời gian thống kê">
          <FaCalendarAlt className="stats-range__icon" />
          <label>
            <span>Từ ngày</span>
            <input
              type="date"
              value={range.from}
              max={range.to}
              onChange={(event) => setRange((old) => ({ ...old, from: event.target.value }))}
            />
          </label>
          <span className="stats-range__divider">-</span>
          <label>
            <span>Đến ngày</span>
            <input
              type="date"
              value={range.to}
              min={range.from}
              onChange={(event) => setRange((old) => ({ ...old, to: event.target.value }))}
            />
          </label>
          <button type="button" onClick={applyRange} disabled={loading || invalidRange}>
            <FaSyncAlt className={loading ? "is-spinning" : ""} />
            {loading ? "Đang tải" : "Áp dụng"}
          </button>
        </div>
      </header>

      {invalidRange && (
        <div className="stats-notice stats-notice--error">
          Ngày bắt đầu không được lớn hơn ngày kết thúc.
        </div>
      )}

      {error && (
        <div className="stats-state stats-state--error">
          <FaChartBar />
          <strong>Chưa thể tải báo cáo</strong>
          <p>{error}</p>
          <button type="button" onClick={load}><FaSyncAlt /> Thử lại</button>
        </div>
      )}

      {loading && !data && !error && (
        <div className="stats-loading" aria-label="Đang tổng hợp dữ liệu">
          {[1, 2, 3, 4, 5].map((item) => <span key={item} />)}
        </div>
      )}

      {data && (
        <>
          <div className="stats-notice">
            <FaCoins />
            <span>{data.recognitionRule || "Doanh thu được ghi nhận theo trạng thái thanh toán."}</span>
          </div>

          <div className="stats-kpi-grid">
            <StatCard label="Doanh thu thuần" value={money(data.current?.revenue)} growth={data.growth?.revenue} icon={FaChartLine} tone="revenue" />
            <StatCard label="Đơn tạo mới" value={Number(data.current?.orders || 0).toLocaleString("vi-VN")} growth={data.growth?.orders} icon={FaShoppingBag} tone="orders" />
            <StatCard label="Tiền đã thu" value={money(data.current?.collected)} growth={data.growth?.collected} icon={FaCoins} tone="collected" />
            <StatCard label="Khách hàng mới" value={Number(data.current?.newCustomers || 0).toLocaleString("vi-VN")} growth={data.growth?.newCustomers} icon={FaUserPlus} tone="customers" />
            <StatCard label="Hoàn tiền" value={money(data.current?.refunds)} icon={FaUndoAlt} tone="refunds" />
          </div>

          <div className="stats-grid">
            <article className="stats-panel stats-panel--chart">
              <div className="stats-panel__header">
                <div><span>Phân bổ vận hành</span><h2>Đơn hàng theo trạng thái</h2></div>
                <strong>{chartData.reduce((sum, item) => sum + Number(item.count), 0)} đơn</strong>
              </div>
              {chartData.length ? (
                <ResponsiveContainer width="100%" height={285}>
                  <BarChart data={chartData} margin={{ top: 12, right: 8, left: -18, bottom: 12 }}>
                    <CartesianGrid vertical={false} stroke="#e8edf3" strokeDasharray="4 4" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={58} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(200, 134, 45, 0.07)" }} />
                    <Bar dataKey="count" fill="#c8862d" radius={[6, 6, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="stats-empty">Chưa có đơn hàng trong khoảng thời gian này.</div>}
            </article>

            <article className="stats-panel stats-panel--products">
              <div className="stats-panel__header">
                <div><span>Hiệu suất sản phẩm</span><h2>Bán chạy nhất</h2></div>
              </div>
              {!data.topProducts?.length ? (
                <div className="stats-empty"><FaBoxOpen /> Chưa có dữ liệu bán hàng.</div>
              ) : (
                <div className="stats-product-list">
                  {data.topProducts.map((item, index) => (
                    <div className="stats-product" key={`${item.name}-${index}`}>
                      <span className={`stats-product__rank stats-product__rank--${index + 1}`}>{String(index + 1).padStart(2, "0")}</span>
                      <div><strong title={item.name}>{item.name}</strong><span>{item.quantity} sản phẩm</span></div>
                      <b>{compactMoney(item.revenue)} đ</b>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>

          <article className="stats-panel stats-stock">
            <div className="stats-panel__header">
              <div><span>Cảnh báo kho</span><h2>Sản phẩm sắp hết hàng</h2></div>
              <strong>{data.lowStock?.length || 0} sản phẩm</strong>
            </div>
            {!data.lowStock?.length ? (
              <div className="stats-empty stats-empty--success">Tồn kho đang ở mức an toàn.</div>
            ) : (
              <div className="stats-stock__table-wrap">
                <table className="stats-stock__table">
                  <thead><tr><th>Sản phẩm</th><th>Nguồn</th><th>Tồn khả dụng</th><th>Mức độ</th></tr></thead>
                  <tbody>
                    {data.lowStock.map((item) => (
                      <tr key={`${item.fromTable}-${item.id}`}>
                        <td>{item.name}</td>
                        <td>{item.fromTable}</td>
                        <td><strong>{item.available}</strong></td>
                        <td><span className={Number(item.available) <= 0 ? "stock-badge stock-badge--danger" : "stock-badge"}>{Number(item.available) <= 0 ? "Hết hàng" : "Sắp hết"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {data.profitNote && <p className="stats-footnote">{data.profitNote}</p>}
          </article>
        </>
      )}
    </section>
  );
}
