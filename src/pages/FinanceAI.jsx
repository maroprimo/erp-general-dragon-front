import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import useReferences from "../hooks/useReferences";
import { formatMoney, formatQty } from "../utils/formatters";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
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

function Card({ title, value, color = "text-slate-800", subtitle = "" }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow">
      <div className="text-sm text-slate-500">{title}</div>
      <div className={`mt-2 text-2xl font-bold ${color}`}>{value}</div>
      {subtitle ? <div className="mt-1 text-xs text-slate-400">{subtitle}</div> : null}
    </div>
  );
}

export default function FinanceAI() {
  const { sites = [], loading: refsLoading } = useReferences();

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    site_id: "",
    horizon: "7d",
    date_from: "",
    date_to: "",
  });

  const loadData = async (customFilters = filters) => {
    try {
      setLoading(true);

      const params = {
        horizon: customFilters.horizon || "7d",
      };

      if (customFilters.site_id) params.site_id = customFilters.site_id;
      if (customFilters.date_from) params.date_from = customFilters.date_from;
      if (customFilters.date_to) params.date_to = customFilters.date_to;

      const res = await api.get("/finance/ai", { params });
      setData(res.data || {});
      setError("");
    } catch (err) {
      console.error(err);
      setError("Impossible de charger l’IA financière");
      setData({});
      toast.error("Impossible de charger l’IA financière");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (refsLoading) return;
    loadData(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refsLoading]);

  const balanceColor = (value) =>
    Number(value) < 0 ? "text-red-600" : "text-emerald-600";

  const forecastCurve = useMemo(() => {
    return asArray(
      data?.forecast_curve ||
        data?.daily_forecast ||
        data?.cash_need_next_days ||
        data?.forecast_days ||
        []
    ).map((row, index) => ({
      label: row.day || row.date || row.period || `J${index + 1}`,
      predicted_balance: num(row.predicted_balance ?? row.balance),
      required_cash: num(row.required_cash ?? row.cash_need ?? row.amount),
    }));
  }, [data]);

  const purchaseTrend = useMemo(() => {
    return asArray(
      data?.purchase_trend ||
        data?.weekly_purchase_trend ||
        data?.daily_purchases ||
        []
    ).map((row, index) => ({
      label: row.day || row.date || row.period || `P${index + 1}`,
      amount: num(row.amount ?? row.total ?? row.total_cost),
    }));
  }, [data]);

  const alerts = asArray(data?.alerts);
  const recommendations = asArray(data?.recommendations);
  const upcomingPayments = asArray(data?.upcoming_payments);
  const patterns = asArray(data?.patterns || data?.trend_detections);
  const correlations = asArray(data?.correlations);
  const supplierAnomalies = asArray(
    data?.supplier_price_anomalies || data?.price_anomalies
  );

  if (refsLoading || loading) {
    return <div>Chargement de l’IA financière...</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">IA Trésorerie</h1>
          <p className="text-slate-500">
            Prévisions, alertes, tendances, cash requis et recommandations automatiques.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
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
              value={filters.horizon}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, horizon: e.target.value }))
              }
            >
              <option value="3d">3 jours</option>
              <option value="7d">7 jours</option>
              <option value="30d">30 jours</option>
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
                onClick={() => loadData(filters)}
                className="rounded-xl bg-slate-900 px-4 py-3 text-white"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card
          title="Prévision à 3 jours"
          value={`${formatMoney(data?.forecast_3_days?.predicted_balance ?? 0)} Ar`}
          color={balanceColor(data?.forecast_3_days?.predicted_balance)}
        />
        <Card
          title="Prévision à 7 jours"
          value={`${formatMoney(data?.forecast_7_days?.predicted_balance ?? 0)} Ar`}
          color={balanceColor(data?.forecast_7_days?.predicted_balance)}
        />
        <Card
          title="Prévision à 30 jours"
          value={`${formatMoney(data?.forecast_30_days?.predicted_balance ?? 0)} Ar`}
          color={balanceColor(data?.forecast_30_days?.predicted_balance)}
        />
        <Card
          title="Cash requis 7 jours"
          value={`${formatMoney(data?.cash_need_7_days ?? data?.required_cash_7_days ?? 0)} Ar`}
          color="text-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">
            Projection de trésorerie
          </h2>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={forecastCurve}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="predicted_balance"
                  name="Solde prévisionnel"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="required_cash"
                  name="Cash requis"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">
            Tendance achats / cash out
          </h2>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={purchaseTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="amount" name="Montant" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">Alertes</h2>
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={`rounded-xl p-3 ${
                  alert.level === "critical"
                    ? "bg-red-50 text-red-700"
                    : alert.level === "high"
                    ? "bg-orange-50 text-orange-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                <div className="font-semibold">{alert.title || "Alerte"}</div>
                <div>{alert.message || alert.description}</div>
              </div>
            ))}

            {alerts.length === 0 && (
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                Aucune alerte majeure.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">
            Recommandations IA
          </h2>
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div key={index} className="rounded-xl bg-blue-50 p-3 text-blue-700">
                <div className="font-semibold">{rec.title || "Conseil"}</div>
                <div>{rec.message || rec.description}</div>
              </div>
            ))}

            {recommendations.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Aucune recommandation disponible.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow xl:col-span-1">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">
            Tendances détectées
          </h2>
          <div className="space-y-2">
            {patterns.map((item, index) => (
              <div key={index} className="rounded-xl bg-slate-50 p-3">
                <div className="font-semibold text-slate-800">
                  {item.title || "Tendance"}
                </div>
                <div className="text-sm text-slate-600">
                  {item.message || item.description}
                </div>
              </div>
            ))}

            {patterns.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Aucune tendance détectée.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow xl:col-span-1">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">
            Corrélations IA
          </h2>
          <div className="space-y-2">
            {correlations.map((item, index) => (
              <div key={index} className="rounded-xl bg-indigo-50 p-3 text-indigo-700">
                <div className="font-semibold">{item.title || "Corrélation"}</div>
                <div>{item.message || item.description}</div>
              </div>
            ))}

            {correlations.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Aucune corrélation calculée.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow xl:col-span-1">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">
            Anomalies fournisseurs
          </h2>
          <div className="space-y-2">
            {supplierAnomalies.map((item, index) => (
              <div key={index} className="rounded-xl bg-amber-50 p-3">
                <div className="font-semibold text-slate-800">
                  {item.product_name || item.name}
                </div>
                <div className="text-sm text-slate-600">
                  {item.supplier_name || "-"}
                </div>
                <div className="text-sm text-amber-700">
                  Hausse : {formatQty(item.price_increase_percent ?? item.delta_percent ?? 0)}%
                </div>
              </div>
            ))}

            {supplierAnomalies.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Aucune anomalie fournisseur détectée.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow">
        <h2 className="mb-4 text-xl font-semibold text-slate-800">
          Paiements à venir (7 jours)
        </h2>
        <div className="space-y-3">
          {upcomingPayments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 p-4"
            >
              <div>
                <div className="font-semibold text-slate-800">
                  {payment.supplier_name || "-"}
                </div>
                <div className="text-sm text-slate-500">
                  Échéance : {payment.due_date || "-"}{" "}
                  {payment.site_name
                    ? `/ ${payment.site_name}`
                    : payment.site_id
                    ? `/ Site ${payment.site_id}`
                    : ""}
                </div>
              </div>
              <div className="text-lg font-bold text-slate-800">
                {formatMoney(payment.amount ?? 0)} Ar
              </div>
            </div>
          ))}

          {upcomingPayments.length === 0 && (
            <div className="text-slate-500">Aucun paiement prévu dans les 7 jours.</div>
          )}
        </div>
      </div>
    </div>
  );
}