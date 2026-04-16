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

export default function Stock() {
  const { sites, warehouses, units, loading: refsLoading } = useReferences();
  const { user } = useAuth();

  const [stocks, setStocks] = useState([]);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    site_id: "",
    warehouse_id: "",
    report_date: getTodayYmd(),
    display_unit_id: "",
  });

  const isStockSiteUser = user?.role === "stock";

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
    const numericQty = Number(qty ?? 0);

    if (!Number.isFinite(numericQty)) return 0;
    if (!fromUnitId || !toUnitId || Number(fromUnitId) === Number(toUnitId)) {
      return numericQty;
    }

    const fromRatio = getUnitRatio(fromUnitId);
    const toRatio = getUnitRatio(toUnitId);

    return (numericQty * fromRatio) / toRatio;
  };

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

  const loadStock = async (customFilters = filters) => {
    try {
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
      loadStock({
        site_id: "",
        warehouse_id: "",
        report_date: getTodayYmd(),
        display_unit_id: "",
      });
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

  const rowClass = (item) => {
    if (item.stock_status === "out_of_stock") {
      return "bg-red-200 text-red-800 font-semibold";
    }
    if (item.stock_status === "critical") {
      return "bg-red-100 text-red-700";
    }
    if (item.stock_status === "warning") {
      return "bg-yellow-100 text-yellow-800";
    }
    return "hover:bg-slate-50";
  };

  const getDisplayUnitId = (item) => {
    return (
      item.display_unit_id ||
      filters.display_unit_id ||
      item.product?.stock_unit_id ||
      ""
    );
  };

  const getStockUnitId = (item) => {
    return item.product?.stock_unit_id || "";
  };

  const getUnitName = (item) => {
    return (
      item.display_unit_name ||
      unitsById.get(Number(getDisplayUnitId(item)))?.name ||
      unitsById.get(Number(item.product?.stock_unit_id))?.name ||
      ""
    );
  };

  const getOpeningQty = (item) => {
    if (item.opening_quantity_display !== undefined && item.opening_quantity_display !== null) {
      return Number(item.opening_quantity_display);
    }

    return Number(
      item.opening_quantity ??
        item.initial_quantity ??
        item.start_quantity ??
        item.quantity_on_hand ??
        0
    );
  };

  const getIncomingQty = (item) => {
    if (item.incoming_quantity_display !== undefined && item.incoming_quantity_display !== null) {
      return Number(item.incoming_quantity_display);
    }

    return Number(
      item.incoming_quantity ??
        item.entries_quantity ??
        item.total_in ??
        item.movement_in ??
        0
    );
  };

  const getOutgoingQty = (item) => {
    if (item.outgoing_quantity_display !== undefined && item.outgoing_quantity_display !== null) {
      return Number(item.outgoing_quantity_display);
    }

    return Number(
      item.outgoing_quantity ??
        item.exits_quantity ??
        item.total_out ??
        item.movement_out ??
        0
    );
  };

  const getClosingQty = (item) => {
    if (item.closing_quantity_display !== undefined && item.closing_quantity_display !== null) {
      return Number(item.closing_quantity_display);
    }

    return Number(
      item.closing_quantity ??
        item.final_quantity ??
        item.end_quantity ??
        item.quantity_on_hand ??
        0
    );
  };

  const getNextDayOpeningQty = (item) => {
    if (
      item.next_day_opening_quantity_display !== undefined &&
      item.next_day_opening_quantity_display !== null
    ) {
      return Number(item.next_day_opening_quantity_display);
    }

    return Number(
      item.next_day_opening_quantity ??
        item.reported_opening_quantity ??
        item.next_opening_quantity ??
        item.closing_quantity ??
        item.quantity_on_hand ??
        0
    );
  };

  const getAvailableQty = (item) => {
    if (item.quantity_available_display !== undefined && item.quantity_available_display !== null) {
      return Number(item.quantity_available_display);
    }

    return Number(item.quantity_available ?? 0);
  };

  const getMinQty = (item) => {
    const minStock = Number(item.product?.min_stock ?? 0);

    if (!filters.display_unit_id || !getStockUnitId(item)) {
      return minStock;
    }

    return convertQty(minStock, getStockUnitId(item), getDisplayUnitId(item));
  };

  const getReorderQty = (item) => {
    const reorderPoint = Number(item.product?.reorder_point ?? 0);

    if (!filters.display_unit_id || !getStockUnitId(item)) {
      return reorderPoint;
    }

    return convertQty(reorderPoint, getStockUnitId(item), getDisplayUnitId(item));
  };

  const getStockValue = (item) => {
    if (item.stock_value !== undefined && item.stock_value !== null) {
      return Number(item.stock_value);
    }

    const realClosingQty = Number(item.closing_quantity ?? item.quantity_on_hand ?? 0);
    const avgCost = Number(item.average_unit_cost ?? 0);

    return realClosingQty * avgCost;
  };

  if (refsLoading) {
    return <div className="p-6">Chargement des références...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Stock par dépôt</h1>
        <p className="text-slate-500">
          Vue stock filtrée par site, dépôt et report automatique du stock final vers le stock initial du lendemain.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow">
        <h2 className="mb-4 text-xl font-semibold text-slate-800">Filtres</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
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
            className="rounded-xl bg-slate-900 px-4 py-2 text-white"
          >
            Appliquer
          </button>
        </div>

        <div className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-700">
          Règle de report : <strong>Stock final du jour = Stock initial du lendemain</strong>.
        </div>
      </div>

      {error && <div className="text-red-600">{error}</div>}

      <div className="rounded-2xl bg-white p-5 shadow">
        <div className="mb-4 flex flex-wrap gap-4 text-sm">
          <div className="rounded-lg bg-red-100 px-3 py-2">Rupture</div>
          <div className="rounded-lg bg-orange-100 px-3 py-2">Seuil critique</div>
          <div className="rounded-lg bg-yellow-100 px-3 py-2">Point de commande</div>
          <div className="rounded-lg bg-emerald-100 px-3 py-2">
            Transférable inter-sites
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl bg-white shadow">
          <table className="min-w-full text-left">
            <thead className="border-b border-slate-200">
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
                    className={`border-b border-slate-100 ${rowClass(item)}`}
                  >
                    <td className="px-4 py-3">{item.product?.name ?? item.product_id}</td>
                    <td className="px-4 py-3">
                      {item.product?.category?.name ?? "-"}
                    </td>
                    <td className="px-4 py-3">{item.site?.name ?? item.site_id}</td>
                    <td className="px-4 py-3">
                      {item.warehouse?.name ?? item.warehouse_id}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {unitName || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {formatQty(getOpeningQty(item))} {unitName}
                    </td>
                    <td className="px-4 py-3 text-emerald-700">
                      {formatQty(getIncomingQty(item))} {unitName}
                    </td>
                    <td className="px-4 py-3 text-red-700">
                      {formatQty(getOutgoingQty(item))} {unitName}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {formatQty(getClosingQty(item))} {unitName}
                    </td>
                    <td className="px-4 py-3 font-semibold text-blue-700">
                      {formatQty(getNextDayOpeningQty(item))} {unitName}
                    </td>
                    <td className="px-4 py-3">
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
                    <td className="px-4 py-3 font-semibold">
                      {formatMoney(getStockValue(item))} Ar
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                          item.stock_status === "out_of_stock"
                            ? "bg-red-200 text-red-800"
                            : item.stock_status === "critical"
                            ? "bg-red-100 text-red-700"
                            : item.stock_status === "warning"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {item.stock_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.inter_site_transfer_available ? (
                        <span className="rounded-lg bg-emerald-100 px-2 py-1 text-emerald-700">
                          Oui
                        </span>
                      ) : (
                        "-"
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
    </div>
  );
}