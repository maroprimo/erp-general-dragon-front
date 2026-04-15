import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import KpiCard from "../components/KpiCard";
import useReferences from "../hooks/useReferences";
import { useAuth } from "../context/AuthContext";
import { formatQty, formatMoney } from "../utils/formatters";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
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

function text(value, fallback = "-") {
  return value ?? fallback;
}

function formatAxisLabel(value) {
  if (!value) return "-";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return String(value);
  }
}

export default function StockDashboardSite() {
  const { user } = useAuth();
  const {
    sites = [],
    warehouses = [],
    products = [],
    loading: refsLoading,
  } = useReferences();

  const isRestrictedSiteUser = ["stock", "cuisine", "security", "sécurité"].includes(
    String(user?.role || "").toLowerCase()
  );

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    site_id: "",
    warehouse_id: "",
    product_id: "",
    period: "7d",
    date_from: "",
    date_to: "",
  });

  const visibleSites = useMemo(() => {
    if (isRestrictedSiteUser && user?.site_id) {
      return (sites ?? []).filter((site) => Number(site.id) === Number(user.site_id));
    }
    return sites ?? [];
  }, [sites, user, isRestrictedSiteUser]);

  const visibleWarehouses = useMemo(() => {
    const effectiveSiteId = filters.site_id || user?.site_id || "";
    if (!effectiveSiteId) return warehouses ?? [];

    return (warehouses ?? []).filter(
      (warehouse) => Number(warehouse.site_id) === Number(effectiveSiteId)
    );
  }, [warehouses, filters.site_id, user]);

  const goToPurchasePOS = () => {
    window.location.hash = "purchasePOS";
    window.dispatchEvent(new CustomEvent("open-page", { detail: "purchasePOS" }));
  };

  const loadData = async (customFilters = filters) => {
    try {
      setLoading(true);

      const params = {
        period: customFilters.period || "7d",
      };

      const effectiveSiteId =
        isRestrictedSiteUser && user?.site_id
          ? String(user.site_id)
          : customFilters.site_id || "";

      if (effectiveSiteId) params.site_id = effectiveSiteId;
      if (customFilters.warehouse_id) params.warehouse_id = customFilters.warehouse_id;
      if (customFilters.product_id) params.product_id = customFilters.product_id;
      if (customFilters.date_from) params.date_from = customFilters.date_from;
      if (customFilters.date_to) params.date_to = customFilters.date_to;

      const res = await api.get("/dashboard/stock/site", { params });
      setData(res.data || {});
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger le dashboard site");
      setData({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (refsLoading) return;

    const defaultSiteId =
      (isRestrictedSiteUser ? user?.site_id : null) ||
      visibleSites?.[0]?.id ||
      "";

    setFilters((prev) => ({
      ...prev,
      site_id: defaultSiteId ? String(defaultSiteId) : prev.site_id,
    }));

    loadData({
      ...filters,
      site_id: defaultSiteId ? String(defaultSiteId) : filters.site_id,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refsLoading, user?.site_id, isRestrictedSiteUser]);

  const kpis = data?.kpis || {};
  const alerts = data?.alerts || {};
  const charts = data?.charts || {};
  const comparisons = data?.comparisons || {};
  const recommendations = data?.recommendations || {};
  const reporting = data?.reporting || {};
  const operational = data?.operational || {};
  const weekly = data?.weekly || {};
  const ai = data?.ai || {};

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

  const consumptionData = useMemo(() => {
    return asArray(
      charts.consumption_trend ||
        charts.product_consumption ||
        charts.price_evolution ||
        reporting.consumption ||
        []
    ).map((row, index) => ({
      label: row.day || row.date || row.period || row.product_name || `P${index + 1}`,
      quantity: num(row.quantity ?? row.total_out ?? row.consumed_qty ?? row.qty),
      pmp: num(row.pmp ?? row.weighted_avg_price ?? row.average_price ?? row.unit_price),
      total: num(row.total ?? row.total_cost ?? row.amount),
      unit: row.unit || row.unit_name || "",
    }));
  }, [charts, reporting]);

  const topOutgoing = useMemo(() => {
    return asArray(
      charts.top_5_outgoing_products ||
        charts.top_outgoing_products ||
        weekly.top_outgoing_products ||
        []
    ).map((row) => ({
      product_name: row.product_name || row.name || "-",
      total_out: num(row.total_out ?? row.quantity ?? row.qty),
    }));
  }, [charts, weekly]);

  const stockByWarehouse = useMemo(() => {
    return asArray(
      comparisons.stock_by_warehouse ||
        comparisons.stock_value_by_warehouse ||
        charts.stock_by_warehouse ||
        []
    ).map((row) => ({
      warehouse_name: row.warehouse_name || row.name || "-",
      stock_value: num(row.stock_value ?? row.total_value ?? row.value),
    }));
  }, [comparisons, charts]);

  const movements = useMemo(() => {
    return asArray(
      data?.tables?.movements ||
        reporting.movements ||
        operational.movements ||
        data?.movements ||
        []
    );
  }, [data, reporting, operational]);

  const losses = useMemo(() => {
    return asArray(
      data?.tables?.losses ||
        reporting.losses ||
        data?.losses?.items ||
        data?.losses ||
        []
    );
  }, [data, reporting]);

  const dailyPurchases = useMemo(() => {
    return asArray(
      data?.tables?.daily_purchases ||
        reporting.daily_purchases ||
        reporting.supplier_purchases ||
        data?.daily_purchases ||
        []
    );
  }, [data, reporting]);

  const topCostly = useMemo(() => {
    return asArray(
      weekly.top_costly_products ||
        comparisons.top_costly_products ||
        charts.top_costly_products ||
        []
    );
  }, [weekly, comparisons, charts]);

  const topIncrease = useMemo(() => {
    return asArray(
      weekly.top_price_increase ||
        comparisons.top_price_increase ||
        ai.price_increase_products ||
        []
    );
  }, [weekly, comparisons, ai]);

  const handleChange = (field, value) => {
    if (field === "site_id" && isRestrictedSiteUser) return;

    setFilters((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "site_id" ? { warehouse_id: "" } : {}),
    }));
  };

  const applyFilters = () => {
    loadData(filters);
  };

  if (refsLoading || loading) {
    return <div className="p-6">Chargement du dashboard site...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Dashboard Stock Site</h1>
          <p className="text-slate-500">
            Vue opérationnelle, consommation, achats, pertes et alertes intelligentes.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
            <select
              className="rounded-xl border p-3 disabled:bg-slate-100"
              value={filters.site_id}
              disabled={isRestrictedSiteUser}
              onChange={(e) => handleChange("site_id", e.target.value)}
            >
              {!isRestrictedSiteUser && <option value="">Choisir un site</option>}
              {visibleSites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border p-3"
              value={filters.warehouse_id}
              onChange={(e) => handleChange("warehouse_id", e.target.value)}
            >
              <option value="">Tous les dépôts</option>
              {visibleWarehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border p-3"
              value={filters.product_id}
              onChange={(e) => handleChange("product_id", e.target.value)}
            >
              <option value="">Tous les articles</option>
              {(products ?? []).map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border p-3"
              value={filters.period}
              onChange={(e) => handleChange("period", e.target.value)}
            >
              <option value="1d">Jour</option>
              <option value="7d">Semaine</option>
              <option value="30d">Mois</option>
              <option value="90d">90 jours</option>
            </select>

            <input
              type="date"
              className="rounded-xl border p-3"
              value={filters.date_from}
              onChange={(e) => handleChange("date_from", e.target.value)}
            />

            <div className="flex gap-2">
              <input
                type="date"
                className="w-full rounded-xl border p-3"
                value={filters.date_to}
                onChange={(e) => handleChange("date_to", e.target.value)}
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
          title="Valeur stock"
          value={`${formatMoney(kpis.total_stock_value ?? kpis.stock_value ?? 0)} Ar`}
        />
        <KpiCard
          title="Rotation"
          value={formatQty(kpis.rotation_rate ?? kpis.turnover_rate ?? 0)}
        />
        <KpiCard
          title="Valeur transferts"
          value={`${formatMoney(
            kpis.transfer_value ?? comparisons.transfer_value ?? 0
          )} Ar`}
        />
        <KpiCard
          title="Cash out jour"
          value={`${formatMoney(
            kpis.daily_cash_out ?? reporting.daily_cash_out ?? 0
          )} Ar`}
        />
        <KpiCard title="Stocks critiques" value={num(kpis.critical_count)} />
        <KpiCard title="Ruptures" value={num(kpis.out_of_stock_count)} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold">Flux entrées / sorties</h2>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={flowData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="entries" name="Entrées" />
                <Bar dataKey="exits" name="Sorties" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold">
            Consommation & PMP / prix moyen
          </h2>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={consumptionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="quantity"
                  name="Quantité"
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="pmp"
                  name="PMP / Prix moyen"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold">Top produits les plus sortis</h2>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={topOutgoing}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="product_name" hide={topOutgoing.length > 8} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total_out" name="Sortie" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold">Valeur stock par dépôt</h2>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={stockByWarehouse}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="warehouse_name" hide={stockByWarehouse.length > 8} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="stock_value" name="Valeur stock" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Mouvements & état des stocks</h2>
          <div className="text-sm text-slate-500">
            {movements.length} mouvement(s)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr className="text-slate-600">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Article</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Dépôt</th>
                <th className="px-4 py-3">Qté</th>
                <th className="px-4 py-3">PU</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Référence</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((row, index) => (
                <tr key={row.id || index} className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    {formatAxisLabel(row.movement_date || row.date || row.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    {text(row.product_name || row.product?.name || row.article_name)}
                  </td>
                  <td className="px-4 py-3">
                    {text(row.movement_type || row.type || row.label)}
                  </td>
                  <td className="px-4 py-3">
                    {text(row.warehouse_name || row.warehouse?.name)}
                  </td>
                  <td className="px-4 py-3">
                    {formatQty(row.quantity)} {text(row.unit_name || row.unit, "")}
                  </td>
                  <td className="px-4 py-3">{formatMoney(row.unit_cost ?? 0)} Ar</td>
                  <td className="px-4 py-3">{formatMoney(row.total_cost ?? 0)} Ar</td>
                  <td className="px-4 py-3">
                    {text(row.reference_number || row.reference || row.reference_type)}
                  </td>
                </tr>
              ))}

              {movements.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                    Aucun mouvement disponible pour ces filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold">Pertes & impact financier</h2>
          <div className="space-y-2">
            {losses.map((item, index) => (
              <div
                key={item.id || index}
                className="rounded-xl border border-red-100 bg-red-50 p-3"
              >
                <div className="font-semibold text-slate-800">
                  {text(item.product_name || item.product?.name)}
                </div>
                <div className="text-sm text-slate-600">
                  {formatAxisLabel(item.date || item.loss_date || item.created_at)} •
                  Écart : {formatQty(item.quantity || item.loss_qty)}{" "}
                  {text(item.unit_name || item.unit, "")}
                </div>
                <div className="text-sm text-red-700">
                  Cause : {text(item.cause)} • Coût :{" "}
                  {formatMoney(item.loss_value || item.total_cost || item.cost)} Ar
                </div>
              </div>
            ))}

            {losses.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Aucune perte enregistrée sur la période.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold">Reporting journalier achats</h2>
          <div className="space-y-2">
            {dailyPurchases.map((item, index) => (
              <div
                key={item.id || `${item.product_id || "p"}-${index}`}
                className="rounded-xl border border-slate-200 p-3"
              >
                <div className="font-semibold text-slate-800">
                  {text(item.product_name || item.product?.name)}
                </div>
                <div className="text-sm text-slate-600">
                  Fournisseur : {text(item.supplier_name || item.supplier?.company_name)}
                </div>
                <div className="text-sm text-slate-600">
                  Qté : {formatQty(item.quantity || item.qty)}{" "}
                  {text(item.unit_name || item.unit, "")} • PU :{" "}
                  {formatMoney(item.unit_price ?? 0)} Ar • Total :{" "}
                  {formatMoney(item.total ?? item.total_cost ?? 0)} Ar
                </div>
              </div>
            ))}

            {dailyPurchases.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Aucun achat journalier trouvé.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold">Alertes critiques</h2>
          <div className="space-y-2">
            {asArray(alerts.critical_stock).map((item) => (
              <div
                key={item.id}
                className="rounded-xl bg-red-50 p-3 text-red-700 animate-pulse"
              >
                <div className="font-semibold">{item.product?.name || item.product_name}</div>
                <div className="text-sm">
                  Stock : {formatQty(item.quantity_on_hand ?? item.stock_now)} / Sécurité :{" "}
                  {formatQty(item.product?.safety_stock ?? item.safety_stock ?? item.product?.min_stock)}
                </div>
              </div>
            ))}

            {asArray(alerts.critical_stock).length === 0 && (
              <div className="rounded-xl bg-emerald-50 p-4 text-emerald-700">
                Aucun article en zone rouge.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold">Suggestions IA / commandes</h2>
          <div className="space-y-2">
            {asArray(recommendations.reorder).map((item, index) => (
              <div key={item.product_id || index} className="rounded-xl bg-blue-50 p-3">
                <div className="font-semibold text-slate-800">
                  {item.product_name || item.name}
                </div>
                <div className="text-sm text-slate-600">
                  Stock : {formatQty(item.current_stock ?? item.stock_now)} / Suggestion :{" "}
                  {formatQty(item.suggested_qty ?? item.recommended_qty)}
                </div>
                <button
                  onClick={goToPurchasePOS}
                  className="mt-2 rounded-lg bg-slate-900 px-3 py-2 text-white"
                >
                  Commander
                </button>
              </div>
            ))}

            {asArray(recommendations.reorder).length === 0 && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Aucune suggestion de commande.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold">IA prix / anomalies</h2>
          <div className="space-y-2">
            {topIncrease.map((item, index) => (
              <div key={item.product_id || index} className="rounded-xl bg-amber-50 p-3">
                <div className="font-semibold text-slate-800">
                  {item.product_name || item.name}
                </div>
                <div className="text-sm text-slate-600">
                  Hausse : {formatQty(item.price_increase_percent ?? item.delta_percent ?? 0)}%
                </div>
                <div className="text-sm text-amber-700">
                  {text(item.message || item.comment || item.supplier_name)}
                </div>
              </div>
            ))}

            {topIncrease.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Aucune anomalie de prix détectée.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold">Top 5 produits coûteux</h2>
          <div className="space-y-2">
            {topCostly.map((item, index) => (
              <div key={item.product_id || index} className="rounded-xl bg-slate-50 p-3">
                <div className="font-semibold text-slate-800">
                  {item.product_name || item.name}
                </div>
                <div className="text-sm text-slate-600">
                  Valeur : {formatMoney(item.total_value ?? item.cost ?? item.amount ?? 0)} Ar
                </div>
              </div>
            ))}

            {topCostly.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Aucun classement disponible.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold">Transferts & production</h2>
          <div className="space-y-2">
            {asArray(operational.transfers_in_transit).map((item) => (
              <div key={`transfer-${item.id}`} className="rounded-xl bg-amber-50 p-3">
                <div className="font-semibold">{item.request_number}</div>
                <div className="text-sm text-slate-600">
                  {item.from_site?.name} → {item.to_site?.name}
                </div>
              </div>
            ))}

            {asArray(operational.productions_in_progress).map((item) => (
              <div key={`prod-${item.id}`} className="rounded-xl bg-emerald-50 p-3">
                <div className="font-semibold">{item.order_number}</div>
                <div className="text-sm text-slate-600">
                  {item.recipe?.product?.name ?? "-"} / {item.status}
                </div>
              </div>
            ))}

            {asArray(operational.transfers_in_transit).length === 0 &&
              asArray(operational.productions_in_progress).length === 0 && (
                <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                  Aucun transfert en transit ni production en cours.
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}