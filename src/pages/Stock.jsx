import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import useReferences from "../hooks/useReferences";
import { useAuth } from "../context/AuthContext";
import { formatQty, formatMoney } from "../utils/formatters";

function getTodayYmd() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function num(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(value, fallback = "-") {
  return value ?? fallback;
}

function getStatusBadgeClass(status) {
  switch (String(status || "").toLowerCase()) {
    case "out_of_stock":
      return "bg-red-100 text-red-700 border border-red-200";
    case "critical":
      return "bg-orange-100 text-orange-700 border border-orange-200";
    case "warning":
      return "bg-yellow-100 text-yellow-800 border border-yellow-200";
    default:
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
  }
}

function getStatusLabel(status) {
  switch (String(status || "").toLowerCase()) {
    case "out_of_stock":
      return "Rupture";
    case "critical":
      return "Critique";
    case "warning":
      return "Alerte";
    default:
      return "OK";
  }
}

function MetricCard({ title, value, subtitle, tone = "slate" }) {
  const tones = {
    blue: "from-blue-500 to-indigo-600 text-white",
    emerald: "from-emerald-500 to-teal-600 text-white",
    amber: "from-amber-400 to-orange-500 text-white",
    rose: "from-rose-500 to-pink-600 text-white",
    violet: "from-violet-500 to-fuchsia-600 text-white",
    slate: "from-slate-700 to-slate-900 text-white",
  };

  return (
    <div className={`rounded-3xl bg-gradient-to-br p-5 shadow-sm ${tones[tone] || tones.slate}`}>
      <div className="text-xs uppercase tracking-[0.2em] text-white/80">{title}</div>
      <div className="mt-3 text-2xl font-extrabold">{value}</div>
      {subtitle ? <div className="mt-2 text-sm text-white/85">{subtitle}</div> : null}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
      {message}
    </div>
  );
}

export default function Stock() {
  const { sites, warehouses, units, loading: refsLoading } = useReferences();
  const { user } = useAuth();

  const [stocks, setStocks] = useState([]);
  const [error, setError] = useState("");
  const [loadingStocks, setLoadingStocks] = useState(false);

  const [filters, setFilters] = useState({
    site_id: "",
    warehouse_id: "",
    report_date: getTodayYmd(),
    display_unit_id: "",
  });

  const isStockSiteUser = user?.role === "stock";

  const visibleSites = useMemo(() => {
    if (isStockSiteUser) {
      return (sites ?? []).filter(
        (site) => Number(site.id) === Number(user?.site_id)
      );
    }
    return sites ?? [];
  }, [sites, isStockSiteUser, user]);

  const visibleWarehouses = useMemo(() => {
    const effectiveSiteId = filters.site_id || user?.site_id || "";

    if (!effectiveSiteId) {
      return warehouses ?? [];
    }

    return (warehouses ?? []).filter(
      (warehouse) => Number(warehouse.site_id) === Number(effectiveSiteId)
    );
  }, [warehouses, filters.site_id, user]);

  const unitsById = useMemo(() => {
    const map = new Map();
    (units ?? []).forEach((unit) => {
      map.set(Number(unit.id), unit);
    });
    return map;
  }, [units]);

  const getUnitRatio = (unitId) => {
    const unit = unitsById.get(Number(unitId));
    const ratio = Number(unit?.ratio_base ?? 1);
    return Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
  };

  const convertQty = (qty, fromUnitId, toUnitId) => {
    if (!fromUnitId || !toUnitId || Number(fromUnitId) === Number(toUnitId)) {
      return num(qty);
    }

    const fromRatio = getUnitRatio(fromUnitId);
    const toRatio = getUnitRatio(toUnitId);

    return (num(qty) * fromRatio) / toRatio;
  };

  const loadStock = async (customFilters = filters) => {
    try {
      setLoadingStocks(true);
      const params = {};

      const effectiveSiteId =
        isStockSiteUser && user?.site_id
          ? String(user.site_id)
          : customFilters.site_id;

      if (effectiveSiteId) params.site_id = effectiveSiteId;
      if (customFilters.warehouse_id) params.warehouse_id = customFilters.warehouse_id;
      if (customFilters.report_date) params.report_date = customFilters.report_date;
      if (customFilters.display_unit_id) params.display_unit_id = customFilters.display_unit_id;

      const res = await api.get("/stock-levels", { params });

      const rows = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : [];

      setStocks(rows);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Impossible de charger le stock");
    } finally {
      setLoadingStocks(false);
    }
  };

  useEffect(() => {
    if (user?.site_id) {
      const nextFilters = {
        site_id: String(user.site_id),
        warehouse_id: "",
        report_date: getTodayYmd(),
        display_unit_id: "",
      };
      setFilters(nextFilters);
      loadStock(nextFilters);
    } else {
      const nextFilters = {
        site_id: "",
        warehouse_id: "",
        report_date: getTodayYmd(),
        display_unit_id: "",
      };
      setFilters(nextFilters);
      loadStock(nextFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!filters.site_id && !user?.site_id) return;

    const effectiveSiteId = filters.site_id || String(user?.site_id || "");

    const warehouseStillValid = visibleWarehouses.some(
      (warehouse) => Number(warehouse.id) === Number(filters.warehouse_id)
    );

    if (!warehouseStillValid && filters.warehouse_id) {
      setFilters((prev) => ({
        ...prev,
        site_id: isStockSiteUser ? String(user?.site_id || "") : effectiveSiteId,
        warehouse_id: "",
      }));
    }
  }, [
    visibleWarehouses,
    filters.warehouse_id,
    filters.site_id,
    isStockSiteUser,
    user,
  ]);

  const handleChange = (field, value) => {
    if (field === "site_id" && isStockSiteUser) {
      return;
    }

    const nextFilters = { ...filters, [field]: value };

    if (field === "site_id") {
      nextFilters.warehouse_id = "";
    }

    setFilters(nextFilters);
  };

  const applyFilters = () => {
    loadStock(filters);
  };

  const getUnitName = (item) => {
    return (
      item.display_unit_name ||
      unitsById.get(Number(item.display_unit_id))?.name ||
      unitsById.get(Number(item.product?.stock_unit_id))?.name ||
      ""
    );
  };

  const getOpeningQty = (item) => {
    return num(
      item.opening_quantity_display ??
        item.opening_quantity ??
        item.initial_quantity ??
        item.start_quantity ??
        item.quantity_on_hand_display ??
        item.quantity_on_hand ??
        0
    );
  };

  const getIncomingQty = (item) => {
    return num(
      item.incoming_quantity_display ??
        item.incoming_quantity ??
        item.entries_quantity ??
        item.total_in ??
        item.movement_in ??
        0
    );
  };

  const getOutgoingQty = (item) => {
    return num(
      item.outgoing_quantity_display ??
        item.outgoing_quantity ??
        item.exits_quantity ??
        item.total_out ??
        item.movement_out ??
        0
    );
  };

  const getClosingQty = (item) => {
    return num(
      item.closing_quantity_display ??
        item.closing_quantity ??
        item.final_quantity ??
        item.end_quantity ??
        item.quantity_on_hand_display ??
        item.quantity_on_hand ??
        0
    );
  };

  const getNextDayOpeningQty = (item) => {
    return num(
      item.next_day_opening_quantity_display ??
        item.next_day_opening_quantity ??
        item.reported_opening_quantity ??
        item.next_opening_quantity ??
        getClosingQty(item)
    );
  };

  const getAvailableQty = (item) => {
    return num(item.quantity_available_display ?? item.quantity_available ?? 0);
  };

  const getStockValue = (item) => {
    return num(
      item.stock_value ??
        num(item.closing_quantity ?? item.quantity_on_hand ?? 0) *
          num(item.average_unit_cost ?? 0)
    );
  };

  const getMinQty = (item) => {
    const stockUnitId = item.product?.stock_unit_id;
    const displayUnitId =
      item.display_unit_id || item.product?.stock_unit_id;

    return convertQty(item.product?.min_stock ?? 0, stockUnitId, displayUnitId);
  };

  const getReorderQty = (item) => {
    const stockUnitId = item.product?.stock_unit_id;
    const displayUnitId =
      item.display_unit_id || item.product?.stock_unit_id;

    return convertQty(item.product?.reorder_point ?? 0, stockUnitId, displayUnitId);
  };

  const summary = useMemo(() => {
    const totalProducts = stocks.length;
    const totalValue = stocks.reduce((sum, item) => sum + getStockValue(item), 0);
    const criticalCount = stocks.filter((item) => item.stock_status === "critical").length;
    const warningCount = stocks.filter((item) => item.stock_status === "warning").length;
    const ruptureCount = stocks.filter((item) => item.stock_status === "out_of_stock").length;
    const transferableCount = stocks.filter((item) => item.inter_site_transfer_available).length;

    return {
      totalProducts,
      totalValue,
      criticalCount,
      warningCount,
      ruptureCount,
      transferableCount,
    };
  }, [stocks]);

  if (refsLoading) {
    return <div className="p-6">Chargement des références...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-700 px-6 py-6 text-white">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/90">
                Dragon ERP • Stock
              </div>
              <h1 className="mt-3 text-3xl font-black">Stock par dépôt</h1>
              <p className="mt-2 max-w-3xl text-sm text-cyan-50">
                Vue du stock par site et dépôt, avec report journalier, statut des articles,
                valeur du stock et lecture multi-unités.
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm backdrop-blur">
              <span className="font-semibold">Règle de report :</span>{" "}
              <span>Stock final du jour = Stock initial du lendemain</span>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <select
              className="rounded-xl border p-3 disabled:bg-slate-100 disabled:text-slate-500"
              value={filters.site_id}
              disabled={isStockSiteUser}
              onChange={(e) => handleChange("site_id", e.target.value)}
            >
              {!isStockSiteUser && <option value="">Tous les sites</option>}
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

            <input
              type="date"
              className="rounded-xl border p-3"
              value={filters.report_date}
              onChange={(e) => handleChange("report_date", e.target.value)}
            />

            <select
              className="rounded-xl border p-3"
              value={filters.display_unit_id}
              onChange={(e) => handleChange("display_unit_id", e.target.value)}
            >
              <option value="">Unité stock produit</option>
              {(units ?? []).map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>

            <button
              onClick={applyFilters}
              className="rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800"
            >
              Appliquer
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          title="Articles"
          value={summary.totalProducts}
          subtitle="Produits visibles"
          tone="blue"
        />
        <MetricCard
          title="Valeur stock"
          value={`${formatMoney(summary.totalValue)} Ar`}
          subtitle="Valeur totale"
          tone="emerald"
        />
        <MetricCard
          title="Critiques"
          value={summary.criticalCount}
          subtitle="Sous seuil critique"
          tone="amber"
        />
        <MetricCard
          title="Alertes"
          value={summary.warningCount}
          subtitle="Sous point commande"
          tone="violet"
        />
        <MetricCard
          title="Ruptures"
          value={summary.ruptureCount}
          subtitle="Stock nul"
          tone="rose"
        />
        <MetricCard
          title="Transférables"
          value={summary.transferableCount}
          subtitle="Disponibles inter-sites"
          tone="slate"
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {loadingStocks ? (
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-3xl bg-slate-200" />
          <div className="h-96 animate-pulse rounded-3xl bg-slate-200" />
        </div>
      ) : stocks.length === 0 ? (
        <EmptyState message="Aucun stock trouvé pour ces filtres." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 xl:hidden">
            {stocks.map((item) => {
              const unitName = getUnitName(item);

              return (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-bold text-slate-800">
                          {item.product?.name ?? item.product_id}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {item.product?.category?.name ?? "Sans catégorie"}
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                          item.stock_status
                        )}`}
                      >
                        {getStatusLabel(item.stock_status)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="text-xs uppercase tracking-wide text-slate-500">Site</div>
                        <div className="mt-1 font-semibold text-slate-800">
                          {text(item.site?.name, item.site_id)}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="text-xs uppercase tracking-wide text-slate-500">Dépôt</div>
                        <div className="mt-1 font-semibold text-slate-800">
                          {text(item.warehouse?.name, item.warehouse_id)}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-blue-50 p-3">
                      <div className="text-xs uppercase tracking-wide text-blue-700">Unité affichée</div>
                      <div className="mt-1 font-bold text-blue-900">{unitName || "-"}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="text-xs text-slate-500">Stock initial</div>
                        <div className="mt-1 font-semibold text-slate-800">
                          {formatQty(getOpeningQty(item))} {unitName}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-emerald-50 p-3">
                        <div className="text-xs text-emerald-700">Entrées</div>
                        <div className="mt-1 font-semibold text-emerald-800">
                          {formatQty(getIncomingQty(item))} {unitName}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-rose-50 p-3">
                        <div className="text-xs text-rose-700">Sorties</div>
                        <div className="mt-1 font-semibold text-rose-800">
                          {formatQty(getOutgoingQty(item))} {unitName}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-violet-50 p-3">
                        <div className="text-xs text-violet-700">Stock final</div>
                        <div className="mt-1 font-semibold text-violet-800">
                          {formatQty(getClosingQty(item))} {unitName}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-cyan-50 p-3">
                        <div className="text-xs text-cyan-700">Report J+1</div>
                        <div className="mt-1 font-semibold text-cyan-800">
                          {formatQty(getNextDayOpeningQty(item))} {unitName}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-amber-50 p-3">
                        <div className="text-xs text-amber-700">Disponible</div>
                        <div className="mt-1 font-semibold text-amber-800">
                          {formatQty(getAvailableQty(item))} {unitName}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="text-xs text-slate-500">Min</div>
                        <div className="mt-1 font-semibold text-slate-800">
                          {formatQty(getMinQty(item))} {unitName}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="text-xs text-slate-500">Reorder</div>
                        <div className="mt-1 font-semibold text-slate-800">
                          {formatQty(getReorderQty(item))} {unitName}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="text-xs text-slate-500">Coût moyen</div>
                        <div className="mt-1 font-semibold text-slate-800">
                          {formatMoney(item.average_unit_cost)} Ar
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="text-xs text-slate-500">Valeur stock</div>
                        <div className="mt-1 font-bold text-slate-900">
                          {formatMoney(getStockValue(item))} Ar
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                      <div className="text-sm text-slate-600">Transfert inter-sites</div>
                      {item.inter_site_transfer_available ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Oui
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                          Non
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm xl:block">
            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 px-5 py-4">
              <h2 className="text-xl font-bold text-slate-800">Tableau détaillé du stock</h2>
              <p className="mt-1 text-sm text-slate-500">
                Lecture par dépôt, statut, valeur et quantités converties dans l’unité d’affichage.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr className="text-slate-600">
                    <th className="px-4 py-3">Produit</th>
                    <th className="px-4 py-3">Catégorie</th>
                    <th className="px-4 py-3">Site</th>
                    <th className="px-4 py-3">Dépôt</th>
                    <th className="px-4 py-3">Unité</th>
                    <th className="px-4 py-3">Stock initial</th>
                    <th className="px-4 py-3">Entrées</th>
                    <th className="px-4 py-3">Sorties</th>
                    <th className="px-4 py-3">Stock final</th>
                    <th className="px-4 py-3">Report J+1</th>
                    <th className="px-4 py-3">Disponible</th>
                    <th className="px-4 py-3">Min</th>
                    <th className="px-4 py-3">Reorder</th>
                    <th className="px-4 py-3">Coût moyen</th>
                    <th className="px-4 py-3">Valeur stock</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Transfert</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((item) => {
                    const unitName = getUnitName(item);

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 transition hover:bg-slate-50"
                      >
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {item.product?.name ?? item.product_id}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {item.product?.category?.name ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {text(item.site?.name, item.site_id)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {text(item.warehouse?.name, item.warehouse_id)}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">
                          {unitName || "-"}
                        </td>
                        <td className="px-4 py-3">
                          {formatQty(getOpeningQty(item))} {unitName}
                        </td>
                        <td className="px-4 py-3 font-semibold text-emerald-700">
                          {formatQty(getIncomingQty(item))} {unitName}
                        </td>
                        <td className="px-4 py-3 font-semibold text-rose-700">
                          {formatQty(getOutgoingQty(item))} {unitName}
                        </td>
                        <td className="px-4 py-3 font-semibold text-violet-700">
                          {formatQty(getClosingQty(item))} {unitName}
                        </td>
                        <td className="px-4 py-3 font-semibold text-cyan-700">
                          {formatQty(getNextDayOpeningQty(item))} {unitName}
                        </td>
                        <td className="px-4 py-3 font-semibold text-amber-700">
                          {formatQty(getAvailableQty(item))} {unitName}
                        </td>
                        <td className="px-4 py-3">
                          {formatQty(getMinQty(item))} {unitName}
                        </td>
                        <td className="px-4 py-3">
                          {formatQty(getReorderQty(item))} {unitName}
                        </td>
                        <td className="px-4 py-3">
                          {formatMoney(item.average_unit_cost)} Ar
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {formatMoney(getStockValue(item))} Ar
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                              item.stock_status
                            )}`}
                          >
                            {getStatusLabel(item.stock_status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {item.inter_site_transfer_available ? (
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                              Oui
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                              Non
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {stocks.length === 0 && (
                    <tr>
                      <td colSpan={17} className="px-4 py-6 text-center text-slate-500">
                        Aucun stock trouvé pour ces filtres.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}