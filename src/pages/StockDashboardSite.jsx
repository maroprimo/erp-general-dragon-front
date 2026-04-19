import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
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

function firstText(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
}

function firstNumber(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function toDateSafe(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatAxisLabel(value) {
  if (!value) return "-";
  const date = toDateSafe(value);
  if (!date) return String(value);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatFullDate(value) {
  if (!value) return "-";
  const date = toDateSafe(value);
  if (!date) return String(value);
  return date.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function shortMoney(value) {
  const n = num(value);
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return `${n}`;
}

function movementLabel(type) {
  const key = String(type || "").toLowerCase();

  const map = {
    purchase_in: "Entrée achat",
    transfer_in: "Entrée transfert",
    transfer_out: "Sortie transfert",
    kitchen_issue_in: "Entrée cuisine",
    kitchen_issue_out: "Sortie cuisine",
    production_in: "Entrée fabrication",
    production_out: "Consommation fabrication",
    adjustment_in: "Ajustement +",
    adjustment_out: "Ajustement -",
    loss: "Perte",
    stock_loss: "Perte stock",
  };

  return map[key] || text(type, "-");
}

function movementTone(type, quantity = 0) {
  const key = String(type || "").toLowerCase();

  if (
    key.includes("out") ||
    key.includes("loss") ||
    key.includes("consumption") ||
    num(quantity) < 0
  ) {
    return {
      badge: "bg-rose-100 text-rose-700",
      row: "hover:bg-rose-50/40",
    };
  }

  if (key.includes("transfer")) {
    return {
      badge: "bg-amber-100 text-amber-700",
      row: "hover:bg-amber-50/40",
    };
  }

  return {
    badge: "bg-emerald-100 text-emerald-700",
    row: "hover:bg-emerald-50/30",
  };
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="space-y-1 text-sm">
        {payload.map((item, index) => (
          <div key={`${item.dataKey}-${index}`} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-slate-600">{item.name} :</span>
            <span className="font-semibold text-slate-800">
              {String(item.dataKey).toLowerCase().includes("value") ||
              String(item.dataKey).toLowerCase().includes("cost") ||
              String(item.dataKey).toLowerCase().includes("pmp") ||
              String(item.dataKey).toLowerCase().includes("price") ||
              String(item.dataKey).toLowerCase().includes("total")
                ? `${formatMoney(item.value)} Ar`
                : formatQty(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionCard({ title, subtitle, children, accent = "from-slate-500 to-slate-700", action = null }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className={`bg-gradient-to-r ${accent} px-5 py-4 text-white`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-white/85">{subtitle}</p>}
          </div>
          {action}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, tone = "slate" }) {
  const tones = {
    emerald: "from-emerald-500 to-teal-600 text-white border-emerald-300",
    blue: "from-blue-500 to-indigo-600 text-white border-blue-300",
    amber: "from-amber-400 to-orange-500 text-white border-amber-300",
    rose: "from-rose-500 to-pink-600 text-white border-rose-300",
    violet: "from-violet-500 to-fuchsia-600 text-white border-violet-300",
    cyan: "from-cyan-500 to-sky-600 text-white border-cyan-300",
    slate: "from-slate-700 to-slate-900 text-white border-slate-300",
  };

  return (
    <div
      className={`rounded-3xl border bg-gradient-to-br p-5 shadow-sm ${
        tones[tone] || tones.slate
      }`}
    >
      <div className="text-xs uppercase tracking-[0.18em] text-white/80">{title}</div>
      <div className="mt-3 text-2xl font-extrabold">{value}</div>
      {subtitle ? <div className="mt-2 text-sm text-white/85">{subtitle}</div> : null}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
      {message}
    </div>
  );
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

  useEffect(() => {
    if (!filters.warehouse_id) return;
    const stillValid = visibleWarehouses.some(
      (warehouse) => Number(warehouse.id) === Number(filters.warehouse_id)
    );

    if (!stillValid) {
      setFilters((prev) => ({
        ...prev,
        warehouse_id: "",
      }));
    }
  }, [visibleWarehouses, filters.warehouse_id]);

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

  const kpis = data?.kpis || {};
  const alerts = data?.alerts || {};
  const charts = data?.charts || {};
  const comparisons = data?.comparisons || {};
  const recommendations = data?.recommendations || {};
  const reporting = data?.reporting || {};
  const operational = data?.operational || {};
  const weekly = data?.weekly || {};
  const ai = data?.ai || {};
  const tables = data?.tables || {};

  const normalizedMovements = useMemo(() => {
    const raw = asArray(
      tables.movements ||
        reporting.movements ||
        operational.movements ||
        data?.movements ||
        []
    );

    return raw
      .map((row, index) => ({
        id: row.id || index,
        date: firstText(row.movement_date, row.date, row.created_at),
        productName: firstText(row.product_name, row.product?.name, row.article_name, row.name, "-"),
        movementType: firstText(row.movement_type, row.type, row.label, row.reference_type, "-"),
        warehouseName: firstText(row.warehouse_name, row.warehouse?.name, row.depot_name, "-"),
        quantity: firstNumber(row.quantity, row.qty),
        unitCost: firstNumber(row.unit_cost, row.unit_price, row.price),
        totalCost: firstNumber(row.total_cost, row.total, row.amount, row.value),
        reference: firstText(row.reference_number, row.reference, row.reference_type, row.document_number, "-"),
        unitName: firstText(row.unit_name, row.unit, ""),
      }))
      .sort((a, b) => {
        const da = toDateSafe(a.date)?.getTime() || 0;
        const db = toDateSafe(b.date)?.getTime() || 0;
        return db - da;
      });
  }, [tables, reporting, operational, data]);

  const flowData = useMemo(() => {
    const fromApi = asArray(
      charts.flow_period ||
        charts.flow_7_days ||
        charts.flow ||
        charts.entries_vs_exits ||
        []
    ).map((row, index) => ({
      label: firstText(row.day, row.date, row.period, `P${index + 1}`),
      entries: firstNumber(row.entries, row.in, row.total_in),
      exits: firstNumber(row.exits, row.out, row.total_out),
    }));

    if (fromApi.length > 0) return fromApi;

    const grouped = normalizedMovements.reduce((acc, row) => {
      const dateKey = row.date ? formatFullDate(row.date) : "Sans date";
      if (!acc[dateKey]) {
        acc[dateKey] = { label: dateKey, entries: 0, exits: 0 };
      }

      if (num(row.quantity) >= 0) {
        acc[dateKey].entries += Math.abs(num(row.quantity));
      } else {
        acc[dateKey].exits += Math.abs(num(row.quantity));
      }

      return acc;
    }, {});

    return Object.values(grouped).slice(-12);
  }, [charts, normalizedMovements]);

  const consumptionData = useMemo(() => {
    const fromApi = asArray(
      charts.consumption_trend ||
        charts.product_consumption ||
        charts.price_evolution ||
        reporting.consumption ||
        []
    ).map((row, index) => ({
      label: firstText(row.day, row.date, row.period, row.product_name, `P${index + 1}`),
      quantity: firstNumber(row.quantity, row.total_out, row.consumed_qty, row.qty),
      pmp: firstNumber(row.pmp, row.weighted_avg_price, row.average_price, row.unit_price),
      total: firstNumber(row.total, row.total_cost, row.amount),
      unit: firstText(row.unit, row.unit_name, ""),
    }));

    if (fromApi.length > 0) return fromApi;

    return normalizedMovements
      .filter((row) => num(row.quantity) < 0)
      .slice(0, 12)
      .map((row, index) => ({
        label: firstText(row.productName, formatFullDate(row.date), `P${index + 1}`),
        quantity: Math.abs(num(row.quantity)),
        pmp: num(row.unitCost),
        total: num(row.totalCost),
        unit: firstText(row.unitName, ""),
      }));
  }, [charts, reporting, normalizedMovements]);

  const topOutgoing = useMemo(() => {
    const fromApi = asArray(
      charts.top_5_outgoing_products ||
        charts.top_outgoing_products ||
        weekly.top_outgoing_products ||
        []
    ).map((row) => ({
      product_name: firstText(row.product_name, row.name, "-"),
      total_out: firstNumber(row.total_out, row.quantity, row.qty),
    }));

    if (fromApi.length > 0) return fromApi;

    const grouped = normalizedMovements
      .filter((row) => num(row.quantity) < 0)
      .reduce((acc, row) => {
        const key = row.productName || "-";
        acc[key] = (acc[key] || 0) + Math.abs(num(row.quantity));
        return acc;
      }, {});

    return Object.entries(grouped)
      .map(([product_name, total_out]) => ({ product_name, total_out }))
      .sort((a, b) => b.total_out - a.total_out)
      .slice(0, 5);
  }, [charts, weekly, normalizedMovements]);

  const stockByWarehouse = useMemo(() => {
    const fromApi = asArray(
      comparisons.stock_by_warehouse ||
        comparisons.stock_value_by_warehouse ||
        charts.stock_by_warehouse ||
        data?.stock_by_warehouse ||
        data?.warehouse_stock_values ||
        []
    ).map((row) => ({
      warehouse_name: firstText(row.warehouse_name, row.name, row.warehouse?.name, "-"),
      stock_value: firstNumber(row.stock_value, row.total_value, row.value),
    }));

    if (fromApi.length > 0) return fromApi;

    const raw = asArray(
      tables.stock_state ||
        data?.stock_levels ||
        data?.current_stock ||
        []
    );

    const grouped = raw.reduce((acc, row) => {
      const warehouseName = firstText(row.warehouse_name, row.warehouse?.name, row.depot_name, "-");
      const stockValue = firstNumber(row.stock_value, row.total_value, row.value);
      if (!acc[warehouseName]) acc[warehouseName] = 0;
      acc[warehouseName] += stockValue;
      return acc;
    }, {});

    return Object.entries(grouped).map(([warehouse_name, stock_value]) => ({
      warehouse_name,
      stock_value,
    }));
  }, [comparisons, charts, tables, data]);

  const losses = useMemo(() => {
    return asArray(
      tables.losses ||
        reporting.losses ||
        data?.losses?.items ||
        data?.losses ||
        []
    ).map((item, index) => ({
      id: item.id || index,
      product_name: firstText(item.product_name, item.product?.name, "-"),
      date: firstText(item.date, item.loss_date, item.created_at),
      quantity: firstNumber(item.quantity, item.loss_qty, item.qty),
      unit_name: firstText(item.unit_name, item.unit, ""),
      cause: firstText(item.cause, item.reason, "-"),
      loss_value: firstNumber(item.loss_value, item.total_cost, item.cost, item.amount),
    }));
  }, [tables, reporting, data]);

  const dailyPurchases = useMemo(() => {
    return asArray(
      tables.daily_purchases ||
        reporting.daily_purchases ||
        reporting.supplier_purchases ||
        data?.daily_purchases ||
        []
    ).map((item, index) => ({
      id: item.id || `${item.product_id || "p"}-${index}`,
      product_name: firstText(item.product_name, item.product?.name, "-"),
      supplier_name: firstText(item.supplier_name, item.supplier?.company_name, item.supplier?.name, "-"),
      quantity: firstNumber(item.quantity, item.qty),
      unit_name: firstText(item.unit_name, item.unit, ""),
      unit_price: firstNumber(item.unit_price, item.price),
      total: firstNumber(item.total, item.total_cost, item.amount),
    }));
  }, [tables, reporting, data]);

  const topCostly = useMemo(() => {
    return asArray(
      weekly.top_costly_products ||
        comparisons.top_costly_products ||
        charts.top_costly_products ||
        []
    ).map((item, index) => ({
      id: item.product_id || index,
      product_name: firstText(item.product_name, item.name, "-"),
      total_value: firstNumber(item.total_value, item.cost, item.amount),
    }));
  }, [weekly, comparisons, charts]);

  const topIncrease = useMemo(() => {
    return asArray(
      weekly.top_price_increase ||
        comparisons.top_price_increase ||
        ai.price_increase_products ||
        []
    ).map((item, index) => ({
      id: item.product_id || index,
      product_name: firstText(item.product_name, item.name, "-"),
      price_increase_percent: firstNumber(item.price_increase_percent, item.delta_percent, item.percent),
      message: firstText(item.message, item.comment, item.supplier_name, "-"),
    }));
  }, [weekly, comparisons, ai]);

  const criticalStockItems = useMemo(() => {
    return asArray(alerts.critical_stock || alerts.low_stock || []).map((item, index) => ({
      id: item.id || index,
      product_name: firstText(item.product?.name, item.product_name, "-"),
      quantity_on_hand: firstNumber(item.quantity_on_hand, item.stock_now, item.current_stock),
      safety_stock: firstNumber(
        item.product?.safety_stock,
        item.safety_stock,
        item.product?.min_stock,
        item.min_stock
      ),
    }));
  }, [alerts]);

  const reorderSuggestions = useMemo(() => {
    return asArray(recommendations.reorder || recommendations.suggestions || []).map(
      (item, index) => ({
        id: item.product_id || index,
        product_name: firstText(item.product_name, item.name, "-"),
        current_stock: firstNumber(item.current_stock, item.stock_now),
        suggested_qty: firstNumber(item.suggested_qty, item.recommended_qty, item.qty),
      })
    );
  }, [recommendations]);

  const transfersInTransit = useMemo(() => {
    return asArray(operational.transfers_in_transit || []).map((item, index) => ({
      id: item.id || index,
      request_number: firstText(item.request_number, "-"),
      from_site_name: firstText(item.from_site?.name, item.fromSite?.name, "-"),
      to_site_name: firstText(item.to_site?.name, item.toSite?.name, "-"),
    }));
  }, [operational]);

  const productionsInProgress = useMemo(() => {
    return asArray(operational.productions_in_progress || []).map((item, index) => ({
      id: item.id || index,
      order_number: firstText(item.order_number, "-"),
      recipe_product_name: firstText(item.recipe?.product?.name, item.product_name, "-"),
      status: firstText(item.status, "-"),
    }));
  }, [operational]);

  const derivedTotalStockValue = useMemo(() => {
    return stockByWarehouse.reduce((sum, row) => sum + num(row.stock_value), 0);
  }, [stockByWarehouse]);

  const derivedTransferValue = useMemo(() => {
    return normalizedMovements
      .filter((row) => {
        const type = String(row.movementType || "").toLowerCase();
        return (
          type.includes("transfer") ||
          type.includes("kitchen_issue") ||
          type.includes("sortie cuisine") ||
          type.includes("entrée cuisine")
        );
      })
      .filter((row) => num(row.quantity) < 0)
      .reduce((sum, row) => sum + Math.abs(num(row.totalCost)), 0);
  }, [normalizedMovements]);

  const derivedDailyCashOut = useMemo(() => {
    return dailyPurchases.reduce((sum, row) => sum + num(row.total), 0);
  }, [dailyPurchases]);

  const derivedCriticalCount = criticalStockItems.length;
  const derivedOutOfStockCount = criticalStockItems.filter(
    (item) => num(item.quantity_on_hand) <= 0
  ).length;

  const dashboardTitle = useMemo(() => {
    const siteName =
      visibleSites.find((site) => String(site.id) === String(filters.site_id))?.name ||
      user?.site?.name ||
      "Site";
    return `Pilotage stock - ${siteName}`;
  }, [visibleSites, filters.site_id, user]);

  if (refsLoading || loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-24 animate-pulse rounded-3xl bg-slate-200" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl bg-slate-200" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-3xl bg-slate-200" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-blue-800 px-6 py-6 text-white">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/90">
                ERP Dragon • Stock Site
              </div>
              <h1 className="mt-3 text-3xl font-black">{dashboardTitle}</h1>
              <p className="mt-2 max-w-3xl text-sm text-blue-100">
                Vue opérationnelle, consommation, transferts, pertes, achats et alertes intelligentes pour le site sélectionné.
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
                <select
                  className="rounded-xl border border-white/20 bg-white/90 p-3 text-slate-800 disabled:bg-slate-100"
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
                  className="rounded-xl border border-white/20 bg-white/90 p-3 text-slate-800"
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
                  className="rounded-xl border border-white/20 bg-white/90 p-3 text-slate-800"
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
                  className="rounded-xl border border-white/20 bg-white/90 p-3 text-slate-800"
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
                  className="rounded-xl border border-white/20 bg-white/90 p-3 text-slate-800"
                  value={filters.date_from}
                  onChange={(e) => handleChange("date_from", e.target.value)}
                />

                <div className="flex gap-2">
                  <input
                    type="date"
                    className="w-full rounded-xl border border-white/20 bg-white/90 p-3 text-slate-800"
                    value={filters.date_to}
                    onChange={(e) => handleChange("date_to", e.target.value)}
                  />
                  <button
                    onClick={applyFilters}
                    className="rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-white shadow hover:bg-emerald-600"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard
            title="Valeur stock"
            value={`${formatMoney(
              firstNumber(kpis.total_stock_value, kpis.stock_value, derivedTotalStockValue)
            )} Ar`}
            subtitle="Valeur estimée du stock courant"
            tone="blue"
          />
          <MetricCard
            title="Rotation"
            value={formatQty(firstNumber(kpis.rotation_rate, kpis.turnover_rate))}
            subtitle="Taux de rotation"
            tone="violet"
          />
          <MetricCard
            title="Valeur transferts"
            value={`${formatMoney(
              firstNumber(kpis.transfer_value, comparisons.transfer_value, derivedTransferValue)
            )} Ar`}
            subtitle="Transferts / mouvements internes"
            tone="amber"
          />
          <MetricCard
            title="Cash out jour"
            value={`${formatMoney(
              firstNumber(kpis.daily_cash_out, reporting.daily_cash_out, derivedDailyCashOut)
            )} Ar`}
            subtitle="Achats décaissés sur la période"
            tone="rose"
          />
          <MetricCard
            title="Stocks critiques"
            value={String(firstNumber(kpis.critical_count, derivedCriticalCount))}
            subtitle="Articles sous seuil critique"
            tone="cyan"
          />
          <MetricCard
            title="Ruptures"
            value={String(firstNumber(kpis.out_of_stock_count, derivedOutOfStockCount))}
            subtitle="Articles en rupture"
            tone="slate"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="Flux entrées / sorties"
          subtitle="Vision rapide des mouvements du stock"
          accent="from-emerald-500 to-cyan-600"
        >
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={flowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 12 }} />
                <YAxis tick={{ fill: "#475569", fontSize: 12 }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Bar dataKey="entries" name="Entrées" fill="#10b981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="exits" name="Sorties" fill="#f97316" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="Consommation & PMP"
          subtitle="Suivi quantité, prix moyen et inflation interne"
          accent="from-violet-500 to-fuchsia-600"
        >
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={consumptionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 12 }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: "#475569", fontSize: 12 }}
                  tickFormatter={(v) => formatQty(v)}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: "#475569", fontSize: 12 }}
                  tickFormatter={(v) => shortMoney(v)}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="quantity"
                  name="Quantité"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="pmp"
                  name="PMP / Prix moyen"
                  stroke="#ec4899"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="Top produits les plus sortis"
          subtitle="Articles les plus consommés"
          accent="from-rose-500 to-orange-500"
        >
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={topOutgoing}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="product_name"
                  hide={topOutgoing.length > 8}
                  tick={{ fill: "#475569", fontSize: 12 }}
                />
                <YAxis tick={{ fill: "#475569", fontSize: 12 }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="total_out" name="Sortie" fill="#fb7185" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="Valeur stock par dépôt"
          subtitle="Répartition de la valeur actuelle"
          accent="from-blue-500 to-indigo-600"
        >
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={stockByWarehouse}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="warehouse_name"
                  hide={stockByWarehouse.length > 8}
                  tick={{ fill: "#475569", fontSize: 12 }}
                />
                <YAxis
                  tick={{ fill: "#475569", fontSize: 12 }}
                  tickFormatter={(v) => shortMoney(v)}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="stock_value" name="Valeur stock" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Mouvements & état des stocks"
        subtitle="Liste détaillée des mouvements détectés"
        accent="from-slate-700 to-slate-900"
        action={
          <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
            {normalizedMovements.length} mouvement(s)
          </div>
        }
      >
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
              {normalizedMovements.map((row) => {
                const tone = movementTone(row.movementType, row.quantity);
                const isOut = num(row.quantity) < 0;

                return (
                  <tr
                    key={row.id}
                    className={`border-b border-slate-100 ${tone.row}`}
                  >
                    <td className="px-4 py-3">{formatAxisLabel(row.date)}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{row.productName}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone.badge}`}>
                        {movementLabel(row.movementType)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{row.warehouseName}</td>
                    <td className={`px-4 py-3 font-semibold ${isOut ? "text-rose-600" : "text-emerald-600"}`}>
                      {isOut ? "-" : "+"}
                      {formatQty(Math.abs(num(row.quantity)))} {text(row.unitName, "")}
                    </td>
                    <td className="px-4 py-3">{formatMoney(row.unitCost)} Ar</td>
                    <td className="px-4 py-3 font-semibold">{formatMoney(row.totalCost)} Ar</td>
                    <td className="px-4 py-3 text-slate-500">{row.reference}</td>
                  </tr>
                );
              })}

              {normalizedMovements.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                    Aucun mouvement disponible pour ces filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="Pertes & impact financier"
          subtitle="Suivi des écarts et des pertes déclarées"
          accent="from-rose-500 to-red-600"
        >
          <div className="space-y-3">
            {losses.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-red-100 bg-gradient-to-r from-red-50 to-rose-50 p-4"
              >
                <div className="font-bold text-slate-800">{item.product_name}</div>
                <div className="mt-1 text-sm text-slate-600">
                  {formatAxisLabel(item.date)} • Écart : {formatQty(item.quantity)} {item.unit_name}
                </div>
                <div className="mt-1 text-sm font-medium text-red-700">
                  Cause : {item.cause} • Coût : {formatMoney(item.loss_value)} Ar
                </div>
              </div>
            ))}

            {losses.length === 0 && <EmptyState message="Aucune perte enregistrée sur la période." />}
          </div>
        </SectionCard>

        <SectionCard
          title="Reporting journalier achats"
          subtitle="Achat par article et fournisseur"
          accent="from-amber-400 to-orange-500"
        >
          <div className="space-y-3">
            {dailyPurchases.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 p-4"
              >
                <div className="font-bold text-slate-800">{item.product_name}</div>
                <div className="mt-1 text-sm text-slate-600">
                  Fournisseur : {item.supplier_name}
                </div>
                <div className="mt-1 text-sm text-slate-700">
                  Qté : {formatQty(item.quantity)} {item.unit_name} • PU : {formatMoney(item.unit_price)} Ar • Total :{" "}
                  <span className="font-semibold">{formatMoney(item.total)} Ar</span>
                </div>
              </div>
            ))}

            {dailyPurchases.length === 0 && <EmptyState message="Aucun achat journalier trouvé." />}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard
          title="Alertes critiques"
          subtitle="Articles en tension"
          accent="from-red-500 to-pink-600"
        >
          <div className="space-y-3">
            {criticalStockItems.map((item) => (
              <div
                key={item.id}
                className="animate-pulse rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700"
              >
                <div className="font-bold">{item.product_name}</div>
                <div className="mt-1 text-sm">
                  Stock : {formatQty(item.quantity_on_hand)} / Sécurité : {formatQty(item.safety_stock)}
                </div>
              </div>
            ))}

            {criticalStockItems.length === 0 && (
              <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-700">
                Aucun article en zone rouge.
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Suggestions IA / commandes"
          subtitle="Commandes recommandées"
          accent="from-blue-500 to-cyan-600"
        >
          <div className="space-y-3">
            {reorderSuggestions.map((item) => (
              <div key={item.id} className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <div className="font-bold text-slate-800">{item.product_name}</div>
                <div className="mt-1 text-sm text-slate-600">
                  Stock : {formatQty(item.current_stock)} / Suggestion : {formatQty(item.suggested_qty)}
                </div>
                <button
                  onClick={goToPurchasePOS}
                  className="mt-3 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  Commander
                </button>
              </div>
            ))}

            {reorderSuggestions.length === 0 && (
              <EmptyState message="Aucune suggestion de commande." />
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="IA prix / anomalies"
          subtitle="Hausses de prix détectées"
          accent="from-fuchsia-500 to-violet-600"
        >
          <div className="space-y-3">
            {topIncrease.map((item) => (
              <div key={item.id} className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
                <div className="font-bold text-slate-800">{item.product_name}</div>
                <div className="mt-1 text-sm text-slate-600">
                  Hausse : {formatQty(item.price_increase_percent)}%
                </div>
                <div className="mt-1 text-sm text-violet-700">{item.message}</div>
              </div>
            ))}

            {topIncrease.length === 0 && (
              <EmptyState message="Aucune anomalie de prix détectée." />
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="Top 5 produits coûteux"
          subtitle="Articles les plus lourds en valeur"
          accent="from-slate-700 to-indigo-800"
        >
          <div className="space-y-3">
            {topCostly.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">{item.product_name}</div>
                    <div className="text-sm text-slate-500">Valeur élevée</div>
                  </div>
                </div>
                <div className="text-right font-bold text-slate-800">
                  {formatMoney(item.total_value)} Ar
                </div>
              </div>
            ))}

            {topCostly.length === 0 && <EmptyState message="Aucun classement disponible." />}
          </div>
        </SectionCard>

        <SectionCard
          title="Transferts & production"
          subtitle="Actions opérationnelles en cours"
          accent="from-emerald-500 to-lime-600"
        >
          <div className="space-y-3">
            {transfersInTransit.map((item) => (
              <div key={`transfer-${item.id}`} className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <div className="font-bold text-slate-800">{item.request_number}</div>
                <div className="mt-1 text-sm text-slate-600">
                  {item.from_site_name} → {item.to_site_name}
                </div>
              </div>
            ))}

            {productionsInProgress.map((item) => (
              <div key={`prod-${item.id}`} className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="font-bold text-slate-800">{item.order_number}</div>
                <div className="mt-1 text-sm text-slate-600">
                  {item.recipe_product_name} / {item.status}
                </div>
              </div>
            ))}

            {transfersInTransit.length === 0 && productionsInProgress.length === 0 && (
              <EmptyState message="Aucun transfert en transit ni production en cours." />
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}