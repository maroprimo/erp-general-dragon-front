import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import KpiCard from "../components/KpiCard";
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

export default function StockDashboardGlobal() {
  const { sites = [], products = [], loading: refsLoading } = useReferences();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    site_id: "",
    product_id: "",
    period: "7d",
    date_from: "",
    date_to: "",
  });

  const loadData = async (customFilters = filters) => {
    try {
      setLoading(true);

      const params = {
        period: customFilters.period || "7d",
      };

      if (customFilters.site_id) params.site_id = customFilters.site_id;
      if (customFilters.product_id) params.product_id = customFilters.product_id;
      if (customFilters.date_from) params.date_from = customFilters.date_from;
      if (customFilters.date_to) params.date_to = customFilters.date_to;

      const res = await api.get("/dashboard/stock/global", { params });
      setData(res.data || {});
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger le dashboard global");
      setData({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (refsLoading) return;
    loadData(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refsLoading]);

  const kpis = data?.kpis || {};
  const comparisons = data?.comparisons || {};
  const charts = data?.charts || {};
  const alerts = data?.alerts || {};
  const weekly = data?.weekly || {};
  const operational = data?.operational || {};
  const recommendations = data?.recommendations || {};
  const ai = data?.ai || {};

  const stockBySite = useMemo(() => {
    return asArray(
      comparisons.stock_by_site ||
        comparisons.stock_value_by_site ||
        charts.stock_by_site ||
        []
    ).map((row) => ({
      site_name: row.site_name || row.name || "-",
      stock_value: num(row.stock_value ?? row.total_value ?? row.value),
    }));
  }, [comparisons, charts]);

  const lossBySite = useMemo(() => {
    return asArray(comparisons.loss_by_site || charts.loss_by_site || []).map((row) => ({
      site_name: row.site_name || row.name || "-",
      loss_value: num(row.loss_value ?? row.total_loss ?? row.value),
    }));
  }, [comparisons, charts]);

  const transferBySite = useMemo(() => {
    return asArray(
      comparisons.transfer_value_by_site ||
        comparisons.transfer_by_site ||
        charts.transfer_by_site ||
        []
    ).map((row) => ({
      site_name: row.site_name || row.name || "-",
      transfer_value: num(row.transfer_value ?? row.value ?? row.total_value),
    }));
  }, [comparisons, charts]);

  const flowData = useMemo(() => {
    return asArray(
      charts.flow_period ||
        charts.flow_7_days ||
        charts.flow ||
        charts.entries_vs_exits ||
        []
    ).map((row, index) => ({
      label: row.day || row.date || row.period || `P${index + 1}`,
      entries: num(row.entries ?? row.in ?? row.total_in),
      exits: num(row.exits ?? row.out ?? row.total_out),
    }));
  }, [charts]);

  const topCostly = useMemo(() => {
    return asArray(
      weekly.top_costly_products ||
        comparisons.top_costly_products ||
        charts.top_costly_products ||
        []
    );
  }, [weekly, comparisons, charts]);

  const topPriceIncrease = useMemo(() => {
    return asArray(
      weekly.top_price_increase ||
        comparisons.top_price_increase ||
        ai.price_increase_products ||
        []
    );
  }, [weekly, comparisons, ai]);

  const criticalStock = useMemo(() => {
    return asArray(alerts.critical_stock || alerts.low_stock || []);
  }, [alerts]);

  const transfersInTransit = useMemo(() => {
    return asArray(alerts.transfers_in_transit || operational.transfers_in_transit || []);
  }, [alerts, operational]);

  const correlations = useMemo(() => {
    return asArray(ai.correlations || ai.patterns || recommendations.correlations || []);
  }, [ai, recommendations]);

  const applyFilters = () => {
    loadData(filters);
  };

  if (refsLoading || loading) {
    return <div className="p-6">Chargement du dashboard global...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Dashboard PDG Stock</h1>
          <p className="text-slate-500">
            Vision consolidée du réseau, multi-site, hebdo, top/flop et alertes IA.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
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
              value={filters.product_id}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, product_id: e.target.value }))
              }
            >
              <option value="">Tous les articles</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
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

            <input
              type="date"
              className="rounded-xl border p-3"
              value={filters.date_from}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, date_from: e.target.value }))
              }
            />

            <div className="flex gap-2">
              <input
                type="date"
                className="w-full rounded-xl border p-3"
                value={filters.date_to}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, date_to: e.target.value }))
                }
              />
              <button
                onClick={applyFilters}
                className="rounded-xl bg-slate-900 px-4 py-3 text-white"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard
          title="Valeur stock réseau"
          value={`${formatMoney(kpis.total_stock_value ?? 0)} Ar`}
        />
        <KpiCard
          title="Valeur transferts"
          value={`${formatMoney(
            kpis.transfer_value ?? comparisons.transfer_value ?? 0
          )} Ar`}
        />
        <KpiCard
          title="Rotation réseau"
          value={formatQty(kpis.rotation_rate ?? kpis.turnover_rate ?? 0)}
        />
        <KpiCard title="Stocks critiques" value={num(kpis.critical_count)} />
        <KpiCard title="Transferts en transit" value={num(kpis.transfers_in_transit)} />
        <KpiCard title="Alertes globales" value={num(kpis.global_alert_count)} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow xl:col-span-1">
          <h2 className="mb-4 text-xl font-semibold">Valeur stock par site</h2>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={stockBySite}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="site_name" hide={stockBySite.length > 8} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="stock_value" name="Valeur stock" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow xl:col-span-1">
          <h2 className="mb-4 text-xl font-semibold">Pertes par site</h2>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={lossBySite}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="site_name" hide={lossBySite.length > 8} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="loss_value" name="Pertes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow xl:col-span-1">
          <h2 className="mb-4 text-xl font-semibold">Valeur transférée par site</h2>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={transferBySite}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="site_name" hide={transferBySite.length > 8} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="transfer_value" name="Transferts" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow">
        <h2 className="mb-4 text-xl font-semibold">Entrées vs sorties réseau</h2>
        <div style={{ width: "100%", height: 340 }}>
          <ResponsiveContainer>
            <LineChart data={flowData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="entries" name="Entrées" dot={false} />
              <Line type="monotone" dataKey="exits" name="Sorties" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold">Top 5 produits les plus coûteux</h2>
          <div className="space-y-2">
            {topCostly.map((item, index) => (
              <div key={item.product_id || index} className="rounded-xl bg-slate-50 p-3">
                <div className="font-semibold text-slate-800">
                  {item.product_name || item.name}
                </div>
                <div className="text-sm text-slate-600">
                  {formatMoney(item.total_value ?? item.cost ?? item.amount ?? 0)} Ar
                </div>
              </div>
            ))}

            {topCostly.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Données indisponibles.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold">Top 5 hausses de prix</h2>
          <div className="space-y-2">
            {topPriceIncrease.map((item, index) => (
              <div key={item.product_id || index} className="rounded-xl bg-amber-50 p-3">
                <div className="font-semibold text-slate-800">
                  {item.product_name || item.name}
                </div>
                <div className="text-sm text-amber-700">
                  {formatQty(item.price_increase_percent ?? item.delta_percent ?? 0)}%
                </div>
                <div className="text-sm text-slate-600">
                  {item.supplier_name || item.message || "-"}
                </div>
              </div>
            ))}

            {topPriceIncrease.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Aucune hausse notable détectée.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold">Urgences stock</h2>
          <div className="space-y-2">
            {criticalStock.map((item, index) => (
              <div
                key={item.id || index}
                className="rounded-xl bg-red-50 p-3 text-red-700 animate-pulse"
              >
                <div className="font-semibold">
                  {item.product?.name || item.product_name}
                </div>
                <div className="text-sm">
                  Site : {item.site?.name || item.site_name || "-"}
                </div>
                <div className="text-sm">
                  Stock : {formatQty(item.quantity_on_hand ?? item.stock_now)} / sécurité :{" "}
                  {formatQty(item.product?.safety_stock ?? item.safety_stock ?? item.product?.min_stock)}
                </div>
              </div>
            ))}

            {criticalStock.length === 0 && (
              <div className="rounded-xl bg-emerald-50 p-4 text-emerald-700">
                Aucune alerte rouge.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold">Transferts non réceptionnés</h2>
          <div className="space-y-2">
            {transfersInTransit.map((item) => (
              <div key={item.id} className="rounded-xl bg-amber-50 p-3">
                <div className="font-semibold">{item.request_number}</div>
                <div className="text-sm text-slate-600">
                  {item.from_site?.name || item.from_site_name} →{" "}
                  {item.to_site?.name || item.to_site_name}
                </div>
                <div className="text-sm text-slate-600">
                  Valeur : {formatMoney(item.transfer_value ?? item.total_value ?? 0)} Ar
                </div>
              </div>
            ))}

            {transfersInTransit.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Aucun transfert en transit.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold">Corrélations IA</h2>
          <div className="space-y-2">
            {correlations.map((item, index) => (
              <div key={index} className="rounded-xl bg-blue-50 p-3">
                <div className="font-semibold text-slate-800">
                  {item.title || "Corrélation détectée"}
                </div>
                <div className="text-sm text-blue-700">
                  {item.message || item.description || "-"}
                </div>
              </div>
            ))}

            {correlations.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Aucune corrélation disponible.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}