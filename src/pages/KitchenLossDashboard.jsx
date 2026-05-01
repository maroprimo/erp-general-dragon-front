import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function money(v) {
  return Number(v || 0).toLocaleString("fr-FR");
}

function qty(v) {
  return Number(v || 0).toLocaleString("fr-FR", {
    maximumFractionDigits: 3,
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function alertBadge(level) {
  switch (String(level || "").toLowerCase()) {
    case "danger":
      return "bg-red-100 text-red-700";
    case "warning":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function KitchenLossDashboard() {
  const [loading, setLoading] = useState(true);

  const [sites, setSites] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [data, setData] = useState({
    summary: {},
    by_warehouse: [],
    by_product: [],
    by_date: [],
    recent_alerts: [],
  });

  const [filters, setFilters] = useState({
    site_id: "",
    warehouse_id: "",
    date_from: firstDayOfMonth(),
    date_to: today(),
  });

  const visibleWarehouses = useMemo(() => {
    if (!filters.site_id) return warehouses;
    return warehouses.filter(
      (w) => Number(w.site_id) === Number(filters.site_id)
    );
  }, [warehouses, filters.site_id]);

  const loadReferences = async () => {
    try {
      const [sitesRes, warehousesRes] = await Promise.all([
        api.get("/sites"),
        api.get("/warehouses"),
      ]);

      setSites(asArray(sitesRes.data));
      setWarehouses(asArray(warehousesRes.data));
    } catch (err) {
      console.error(err);
    }
  };

  const loadDashboard = async (customFilters = filters) => {
    try {
      setLoading(true);

      const params = {};
      Object.entries(customFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params[key] = value;
        }
      });

      const res = await api.get("/kitchen-inventory-checks/dashboard", {
        params,
      });

      setData({
        summary: res.data?.summary || {},
        by_warehouse: res.data?.by_warehouse || [],
        by_product: res.data?.by_product || [],
        by_date: res.data?.by_date || [],
        recent_alerts: res.data?.recent_alerts || [],
      });
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger le dashboard pertes cuisine");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReferences();
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => {
    loadDashboard(filters);
  };

  const resetFilters = () => {
    const next = {
      site_id: "",
      warehouse_id: "",
      date_from: firstDayOfMonth(),
      date_to: today(),
    };

    setFilters(next);
    loadDashboard(next);
  };

  const summary = data.summary || {};

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-red-950 via-slate-900 to-slate-700 p-5 text-white shadow-xl">
        <h1 className="text-3xl font-black">Dashboard pertes cuisine</h1>
        <p className="mt-1 text-sm text-slate-200">
          Analyse des écarts inventaire par dépôt, produit et période.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <select
            className="rounded-xl border p-3"
            value={filters.site_id}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                site_id: e.target.value,
                warehouse_id: "",
              }))
            }
          >
            <option value="">Tous les sites</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border p-3"
            value={filters.warehouse_id}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                warehouse_id: e.target.value,
              }))
            }
          >
            <option value="">Tous les dépôts</option>
            {visibleWarehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            className="rounded-xl border p-3"
            value={filters.date_from}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, date_from: e.target.value }))
            }
          />

          <input
            type="date"
            className="rounded-xl border p-3"
            value={filters.date_to}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, date_to: e.target.value }))
            }
          />

          <button
            onClick={applyFilters}
            className="rounded-xl bg-slate-900 px-4 py-3 font-bold text-white"
          >
            OK
          </button>

          <button
            onClick={resetFilters}
            className="rounded-xl bg-slate-100 px-4 py-3 font-bold text-slate-700"
          >
            Reset
          </button>
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl bg-white p-5 text-slate-500 shadow">
          Chargement du dashboard...
        </div>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-2xl bg-white p-4 shadow">
              <div className="text-sm text-slate-500">Contrôles validés</div>
              <div className="text-2xl font-black text-slate-900">
                {summary.checks_count || 0}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow">
              <div className="text-sm text-slate-500">Lignes contrôlées</div>
              <div className="text-2xl font-black text-slate-900">
                {summary.lines_count || 0}
              </div>
            </div>

            <div className="rounded-2xl bg-red-50 p-4 shadow">
              <div className="text-sm text-red-600">Pertes</div>
              <div className="text-2xl font-black text-red-700">
                {money(summary.total_loss_value)} Ar
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-50 p-4 shadow">
              <div className="text-sm text-emerald-600">Surplus</div>
              <div className="text-2xl font-black text-emerald-700">
                {money(summary.total_surplus_value)} Ar
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 shadow">
              <div className="text-sm text-slate-500">Écart net</div>
              <div
                className={`text-2xl font-black ${
                  Number(summary.net_difference_value || 0) < 0
                    ? "text-red-700"
                    : "text-emerald-700"
                }`}
              >
                {money(summary.net_difference_value)} Ar
              </div>
            </div>

            <div className="rounded-2xl bg-amber-50 p-4 shadow">
              <div className="text-sm text-amber-600">Alertes</div>
              <div className="text-2xl font-black text-amber-700">
                {(summary.danger_count || 0) + (summary.warning_count || 0)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="xl:col-span-6">
              <div className="rounded-2xl bg-white p-5 shadow">
                <h2 className="mb-4 text-xl font-bold text-slate-800">
                  Pertes par dépôt
                </h2>

                <div className="space-y-3">
                  {data.by_warehouse.length === 0 && (
                    <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                      Aucune donnée.
                    </div>
                  )}

                  {data.by_warehouse.map((row) => (
                    <div
                      key={row.warehouse_id || row.warehouse_name}
                      className="rounded-xl border p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-slate-900">
                            {row.warehouse_name}
                          </div>
                          <div className="text-sm text-slate-500">
                            {row.line_count} lignes • {row.alert_lines} alertes
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-black text-red-700">
                            Perte {money(row.loss_value)} Ar
                          </div>
                          <div className="text-sm text-emerald-700">
                            Surplus {money(row.surplus_value)} Ar
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl bg-slate-50 p-3">
                        <div className="text-xs text-slate-500">Écart net</div>
                        <div
                          className={`font-bold ${
                            Number(row.net_difference_value || 0) < 0
                              ? "text-red-700"
                              : "text-emerald-700"
                          }`}
                        >
                          {money(row.net_difference_value)} Ar
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="xl:col-span-6">
              <div className="rounded-2xl bg-white p-5 shadow">
                <h2 className="mb-4 text-xl font-bold text-slate-800">
                  Top produits à problème
                </h2>

                <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
                  {data.by_product.length === 0 && (
                    <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                      Aucune donnée.
                    </div>
                  )}

                  {data.by_product.slice(0, 30).map((row) => (
                    <div
                      key={row.product_id || row.product_name}
                      className="rounded-xl border p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-slate-900">
                            {row.product_name}
                          </div>
                          <div className="text-sm text-slate-500">
                            {row.product_code || "-"} • {row.unit_name || "-"}
                          </div>
                        </div>

                        <span className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700">
                          {money(row.loss_value)} Ar
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                        <div className="rounded-lg bg-red-50 p-3">
                          <div className="text-xs text-red-600">Qté perdue</div>
                          <div className="font-bold text-red-700">
                            {qty(row.loss_quantity)}
                          </div>
                        </div>

                        <div className="rounded-lg bg-emerald-50 p-3">
                          <div className="text-xs text-emerald-600">Qté surplus</div>
                          <div className="font-bold text-emerald-700">
                            {qty(row.surplus_quantity)}
                          </div>
                        </div>

                        <div className="rounded-lg bg-slate-50 p-3">
                          <div className="text-xs text-slate-500">Écart net</div>
                          <div
                            className={`font-bold ${
                              Number(row.net_difference_value || 0) < 0
                                ? "text-red-700"
                                : "text-emerald-700"
                            }`}
                          >
                            {money(row.net_difference_value)}
                          </div>
                        </div>

                        <div className="rounded-lg bg-amber-50 p-3">
                          <div className="text-xs text-amber-600">Alertes</div>
                          <div className="font-bold text-amber-700">
                            {row.alert_lines}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="xl:col-span-5">
              <div className="rounded-2xl bg-white p-5 shadow">
                <h2 className="mb-4 text-xl font-bold text-slate-800">
                  Évolution par date
                </h2>

                <div className="space-y-3">
                  {data.by_date.length === 0 && (
                    <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                      Aucune donnée.
                    </div>
                  )}

                  {data.by_date.map((row) => (
                    <div key={row.date} className="rounded-xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-bold">{row.date}</div>
                          <div className="text-sm text-slate-500">
                            {row.alert_lines} alertes
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-bold text-red-700">
                            -{money(row.loss_value)} Ar
                          </div>
                          <div className="text-sm text-emerald-700">
                            +{money(row.surplus_value)} Ar
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 text-sm">
                        Écart net :{" "}
                        <strong
                          className={
                            Number(row.net_difference_value || 0) < 0
                              ? "text-red-700"
                              : "text-emerald-700"
                          }
                        >
                          {money(row.net_difference_value)} Ar
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="xl:col-span-7">
              <div className="rounded-2xl bg-white p-5 shadow">
                <h2 className="mb-4 text-xl font-bold text-slate-800">
                  Alertes récentes
                </h2>

                <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
                  {data.recent_alerts.length === 0 && (
                    <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                      Aucune alerte.
                    </div>
                  )}

                  {data.recent_alerts.map((row, index) => (
                    <div
                      key={`${row.check_id}-${row.product_id}-${index}`}
                      className="rounded-xl border p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-slate-900">
                            {row.product_name}
                          </div>
                          <div className="text-sm text-slate-500">
                            {row.check_number} • {row.check_date} •{" "}
                            {row.warehouse_name}
                          </div>
                        </div>

                        <span
                          className={`rounded-lg px-2 py-1 text-xs font-bold ${alertBadge(
                            row.alert_level
                          )}`}
                        >
                          {row.alert_level}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                        <div className="rounded-lg bg-slate-50 p-3">
                          <div className="text-xs text-slate-500">Théorique</div>
                          <div className="font-bold">
                            {qty(row.theoretical_quantity)}
                          </div>
                        </div>

                        <div className="rounded-lg bg-slate-50 p-3">
                          <div className="text-xs text-slate-500">Réel</div>
                          <div className="font-bold">
                            {qty(row.actual_quantity)}
                          </div>
                        </div>

                        <div className="rounded-lg bg-slate-50 p-3">
                          <div className="text-xs text-slate-500">Écart qté</div>
                          <div
                            className={`font-bold ${
                              Number(row.difference_quantity || 0) < 0
                                ? "text-red-700"
                                : "text-emerald-700"
                            }`}
                          >
                            {qty(row.difference_quantity)}
                          </div>
                        </div>

                        <div className="rounded-lg bg-slate-50 p-3">
                          <div className="text-xs text-slate-500">Écart valeur</div>
                          <div
                            className={`font-bold ${
                              Number(row.difference_value || 0) < 0
                                ? "text-red-700"
                                : "text-emerald-700"
                            }`}
                          >
                            {money(row.difference_value)} Ar
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}