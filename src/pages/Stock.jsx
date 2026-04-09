import { useEffect, useState } from "react";
import api from "../services/api";
import useReferences from "../hooks/useReferences";
import { useAuth } from "../context/AuthContext";
import { formatQty, formatMoney } from "../utils/formatters";

export default function Stock() {
  const { sites, warehouses,units, loading: refsLoading } = useReferences();
  const { user } = useAuth();

  const [stocks, setStocks] = useState([]);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    site_id: "",
    warehouse_id: "",
  });

  const loadStock = async (customFilters = filters) => {
    try {
      const params = {};

      if (customFilters.site_id) params.site_id = customFilters.site_id;
      if (customFilters.warehouse_id) params.warehouse_id = customFilters.warehouse_id;

      const res = await api.get("/stock-levels", { params });
      setStocks(res.data.data ?? res.data);
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
      };
      setFilters(nextFilters);
      loadStock(nextFilters);
    } else {
      loadStock();
    }
  }, [user]);

  const handleChange = (field, value) => {
    const nextFilters = { ...filters, [field]: value };
    setFilters(nextFilters);
  };

  const applyFilters = () => {
    loadStock(filters);
  };

const rowClass = (item) => {
  if (item.stock_status === "out_of_stock") return "bg-red-200 text-red-800 font-semibold";
  if (item.stock_status === "critical") return "bg-red-100 text-red-700";
  if (item.stock_status === "warning") return "bg-yellow-100 text-yellow-800";
  return "hover:bg-slate-50";
};

  if (refsLoading) {
    return <div className="p-6">Chargement des références...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Stock par dépôt</h1>
        <p className="text-slate-500">
          Vue stock filtrée par site, dépôt et alertes visuelles.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow">
        <h2 className="mb-4 text-xl font-semibold text-slate-800">Filtres</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <select
            className="rounded-xl border p-3"
            value={filters.site_id}
            onChange={(e) => handleChange("site_id", e.target.value)}
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
            onChange={(e) => handleChange("warehouse_id", e.target.value)}
          >
            <option value="">Tous les dépôts</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
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
      </div>

      {error && <div className="text-red-600">{error}</div>}

      <div className="rounded-2xl bg-white p-5 shadow">
        <div className="mb-4 flex flex-wrap gap-4 text-sm">
          <div className="rounded-lg bg-red-100 px-3 py-2">Rupture</div>
          <div className="rounded-lg bg-orange-100 px-3 py-2">Seuil critique</div>
          <div className="rounded-lg bg-yellow-100 px-3 py-2">Point de commande</div>
          <div className="rounded-lg bg-emerald-100 px-3 py-2">Transférable inter-sites</div>
        </div>

        <div className="overflow-x-auto rounded-2xl bg-white shadow">
          <table className="min-w-full text-left">
            <thead className="border-b border-slate-200">
              <tr className="text-slate-600">
                <th className="px-4 py-3">Produit</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">Dépôt</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Disponible</th>
                <th className="px-4 py-3">Min</th>
                <th className="px-4 py-3">Reorder</th>
                <th className="px-4 py-3">Coût moyen</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Transfert</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((item) => (
                <tr key={item.id} className={`border-b border-slate-100 ${rowClass(item)}`}>
                  <td className="px-4 py-3">{item.product?.name ?? item.product_id}</td>
                  <td className="px-4 py-3">{item.product?.category?.name ?? "-"}</td>
                  <td className="px-4 py-3">{item.site?.name ?? item.site_id}</td>
                  <td className="px-4 py-3">{item.warehouse?.name ?? item.warehouse_id}</td>
                  <td className="px-4 py-3">{formatQty(item.quantity_on_hand)} {
                    units?.find(u => u.id === item.product?.stock_unit_id)?.name
                  }</td>
                  <td className="px-4 py-3">{formatQty(item.quantity_available)}</td>
                  <td className="px-4 py-3">{formatQty(item.product?.min_stock) ?? 0}</td>
                  <td className="px-4 py-3">{item.product?.reorder_point ?? 0}</td>
                  <td className="px-4 py-3">{formatMoney(item.average_unit_cost)} Ar</td>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}