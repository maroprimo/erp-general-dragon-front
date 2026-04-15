import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import useReferences from "../hooks/useReferences";
import { formatMoney, formatQty } from "../utils/formatters";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function num(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function Analytics() {
  const { sites = [], loading: refsLoading } = useReferences();

  const [dashboard, setDashboard] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [financeData, setFinanceData] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    site_id: "",
    period: "7d",
  });

  const loadData = async (customFilters = filters) => {
    try {
      setLoading(true);
      setError("");

      const params = {
        period: customFilters.period || "7d",
      };

      if (customFilters.site_id) params.site_id = customFilters.site_id;

      const [weeklyRes, stockRes, financeRes] = await Promise.allSettled([
        api.get("/analytics/weekly", { params }),
        api.get("/dashboard/stock/global", { params }),
        api.get("/finance/ai", { params }),
      ]);

      if (weeklyRes.status === "fulfilled") {
        setWeeklyData(asArray(weeklyRes.value.data));
      } else {
        console.error(weeklyRes.reason);
        setWeeklyData([]);
      }

      if (stockRes.status === "fulfilled") {
        setDashboard(stockRes.value.data || {});
      } else {
        console.error(stockRes.reason);
        setDashboard({});
      }

      if (financeRes.status === "fulfilled") {
        setFinanceData(financeRes.value.data || {});
      } else {
        console.error(financeRes.reason);
        setFinanceData({});
      }
    } catch (err) {
      console.error(err);
      setError("Impossible de charger les statistiques");
      toast.error("Impossible de charger les statistiques");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (refsLoading) return;
    loadData(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refsLoading]);

  const kpiData = useMemo(() => {
    return [
      {
        name: "Stock",
        value: num(dashboard?.kpis?.total_stock_value ?? dashboard?.kpis?.stock?.total_value),
      },
      { name: "Dépenses", value: num(financeData?.expenses ?? dashboard?.kpis?.expenses) },
      { name: "Pertes", value: num(dashboard?.kpis?.losses ?? dashboard?.kpis?.loss_value) },
      { name: "Sorties", value: num(dashboard?.kpis?.outflows ?? dashboard?.kpis?.total_out) },
    ];
  }, [dashboard, financeData]);

  const pieData = useMemo(() => {
    return [
      {
        name: "Stock",
        value: num(dashboard?.kpis?.total_stock_value ?? dashboard?.kpis?.stock?.total_value),
      },
      { name: "Dépenses", value: num(financeData?.expenses ?? dashboard?.kpis?.expenses) },
      { name: "Pertes", value: num(dashboard?.kpis?.losses ?? dashboard?.kpis?.loss_value) },
    ];
  }, [dashboard, financeData]);

  const trendData = useMemo(() => {
    if (weeklyData.length > 0) return weeklyData;

    const flow = asArray(
      dashboard?.charts?.flow_period ||
        dashboard?.charts?.flow_7_days ||
        dashboard?.charts?.flow ||
        []
    );

    return flow.map((row, index) => ({
      day: row.day || row.date || row.period || `P${index + 1}`,
      stock: num(row.stock_value),
      depenses: num(row.entries ?? row.in ?? row.total_in),
      pertes: num(row.losses ?? row.loss_value),
    }));
  }, [weeklyData, dashboard]);

  const topCostly = useMemo(() => {
    return asArray(
      dashboard?.weekly?.top_costly_products ||
        dashboard?.comparisons?.top_costly_products ||
        dashboard?.charts?.top_costly_products ||
        []
    ).map((row) => ({
      label: row.product_name || row.name || "-",
      value: num(row.total_value ?? row.cost ?? row.amount),
    }));
  }, [dashboard]);

  const topPriceIncrease = useMemo(() => {
    return asArray(
      dashboard?.weekly?.top_price_increase ||
        dashboard?.comparisons?.top_price_increase ||
        financeData?.price_anomalies ||
        []
    ).map((row) => ({
      label: row.product_name || row.name || "-",
      value: num(row.price_increase_percent ?? row.delta_percent ?? 0),
    }));
  }, [dashboard, financeData]);

  const lowStockItems = useMemo(() => {
    return asArray(dashboard?.alerts?.critical_stock || dashboard?.alerts?.low_stock || []);
  }, [dashboard]);

  const COLORS = ["#0f172a", "#2563eb", "#dc2626"];

  if (refsLoading || loading) {
    return <div>Chargement des graphiques...</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Analytics</h1>
          <p className="text-slate-500">
            Vue hebdomadaire, top/flop, urgence stock et lecture stratégique.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="flex flex-col gap-3 md:flex-row">
            <select
              className="rounded-xl border p-3"
              value={filters.site_id}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, site_id: e.target.value }))
              }
            >
              <option value="">Global</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border p-3"
              value={filters.period}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, period: e.target.value }))
              }
            >
              <option value="7d">Hebdo</option>
              <option value="30d">Mensuel</option>
              <option value="90d">90 jours</option>
            </select>

            <button
              onClick={() => loadData(filters)}
              className="rounded-xl bg-slate-900 px-4 py-3 text-white"
            >
              Actualiser
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">
            Vue globale des KPI
          </h2>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={kpiData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">
            Répartition
          </h2>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={110}
                  label
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow">
        <h2 className="mb-4 text-xl font-semibold text-slate-800">
          Tendance hebdomadaire
        </h2>
        <div style={{ width: "100%", height: 360 }}>
          <ResponsiveContainer>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="stock" name="Stock" dot={false} />
              <Line type="monotone" dataKey="depenses" name="Dépenses" dot={false} />
              <Line type="monotone" dataKey="pertes" name="Pertes" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">
            Top 5 produits les plus coûteux
          </h2>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={topCostly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" hide={topCostly.length > 8} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" name="Valeur" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">
            Top 5 hausses de prix
          </h2>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={topPriceIncrease}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" hide={topPriceIncrease.length > 8} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" name="% hausse" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow">
        <h2 className="mb-4 text-xl font-semibold text-slate-800">
          Code urgence stock
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {lowStockItems.map((item, index) => (
            <div
              key={item.id || index}
              className="rounded-xl bg-red-50 p-4 text-red-700 animate-pulse"
            >
              <div className="font-semibold">
                {item.product?.name || item.product_name || "-"}
              </div>
              <div className="text-sm">
                Site : {item.site?.name || item.site_name || "-"}
              </div>
              <div className="text-sm">
                Stock : {formatQty(item.quantity_on_hand ?? item.stock_now)} / sécurité :{" "}
                {formatQty(item.product?.safety_stock ?? item.safety_stock ?? item.product?.min_stock)}
              </div>
              <div className="text-xs mt-1">
                Valeur : {formatMoney(item.stock_value ?? item.value ?? 0)} Ar
              </div>
            </div>
          ))}

          {lowStockItems.length === 0 && (
            <div className="rounded-xl bg-emerald-50 p-4 text-emerald-700">
              Aucun article sous le stock de sécurité.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}