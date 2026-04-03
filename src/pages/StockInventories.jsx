import { useEffect, useState } from "react";
import api from "../services/api";
import useReferences from "../hooks/useReferences";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { formatDateTime, formatMoney, formatQty } from "../utils/formatters";

const getStatusBadge = (status) => {
  if (status === "draft") return "bg-slate-100 text-slate-700";
  if (status === "saved") return "bg-orange-100 text-orange-700";
  if (status === "validated") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-700";
};

export default function StockInventories() {
  const { warehouses, loading } = useReferences();
  const { user } = useAuth();

  const [inventories, setInventories] = useState([]);
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [summary, setSummary] = useState("");

  const [createForm, setCreateForm] = useState({
    site_id: "",
    warehouse_ids: [],
    notes: "",
  });

  const loadInventories = async () => {
    try {
      const res = await api.get("/stock-inventories");
      setInventories(res.data.data ?? res.data);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les inventaires");
    }
  };

  const loadRecent = async () => {
    try {
      const res = await api.get("/stock-inventories/recent");
      setInventories(res.data ?? []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user?.site_id) {
      setCreateForm((prev) => ({
        ...prev,
        site_id: String(user.site_id),
      }));
    }

    loadInventories();
    loadRecent();
  }, [user]);

  const toggleWarehouse = (warehouseId) => {
    setCreateForm((prev) => {
      const exists = prev.warehouse_ids.includes(String(warehouseId));
      return {
        ...prev,
        warehouse_ids: exists
          ? prev.warehouse_ids.filter((id) => id !== String(warehouseId))
          : [...prev.warehouse_ids, String(warehouseId)],
      };
    });
  };

  const selectAllWarehouses = () => {
    setCreateForm((prev) => ({
      ...prev,
      warehouse_ids: warehouses.map((w) => String(w.id)),
    }));
  };

  const createInventory = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        site_id: Number(createForm.site_id),
        warehouse_ids: createForm.warehouse_ids.map(Number),
        notes: createForm.notes,
      };

      const res = await api.post("/stock-inventories", payload);
      toast.success(res.data.message || "Inventaire créé");

      const created = res.data.data ?? [];
      if (created.length > 0) {
        setSelectedInventory(created[0]);
      }

      // On ne réinitialise pas site et dépôts
      setCreateForm((prev) => ({
        ...prev,
        notes: "",
      }));

      loadInventories();
      loadRecent();
    } catch (err) {
      console.error(err);
      toast.error("Erreur création inventaire");
    }
  };

  const openInventory = async (id) => {
    try {
      const res = await api.get(`/stock-inventories/${id}`);
      setSelectedInventory(res.data);
      setSummary("");
    } catch (err) {
      console.error(err);
      toast.error("Impossible d’ouvrir l’inventaire");
    }
  };

  const updateLine = (lineId, field, value) => {
    setSelectedInventory((prev) => ({
      ...prev,
      lines: prev.lines.map((line) =>
        line.id === lineId ? { ...line, [field]: value } : line
      ),
    }));
  };

  const saveLines = async () => {
    try {
      const payload = {
        lines: selectedInventory.lines.map((line) => ({
          id: line.id,
          real_quantity: Number(line.real_quantity),
          notes: line.notes || "",
        })),
      };

      const res = await api.put(`/stock-inventories/${selectedInventory.id}/lines`, payload);
      toast.success(res.data.message || "Inventaire enregistré");
      setSelectedInventory(res.data.data);
      loadInventories();
      loadRecent();
    } catch (err) {
      console.error(err);
      toast.error("Erreur mise à jour inventaire");
    }
  };

  const validateInventory = async () => {
    try {
      const res = await api.patch(`/stock-inventories/${selectedInventory.id}/validate`);
      toast.success(res.data.message || "Inventaire validé");
      setSelectedInventory(res.data.data);
      loadInventories();
      loadRecent();
    } catch (err) {
      console.error(err);
      toast.error("Erreur validation inventaire");
    }
  };

  const loadSummary = async () => {
    try {
      const res = await api.get(`/stock-inventories/${selectedInventory.id}/summary`);
      setSummary(res.data.summary ?? "");
    } catch (err) {
      console.error(err);
      toast.error("Impossible de générer le résumé IA");
    }
  };

  const deleteInventory = async () => {
    try {
      const res = await api.delete(`/stock-inventories/${selectedInventory.id}`);
      toast.success(res.data.message || "Inventaire supprimé");
      setSelectedInventory(null);
      loadInventories();
      loadRecent();
    } catch (err) {
      console.error(err);
      toast.error("Erreur suppression inventaire");
    }
  };

  const printBlindInventory = () => {
    const base = import.meta.env.VITE_BACKEND_WEB_URL || "";
    window.open(`${base}/print/inventory-blind/${selectedInventory.id}`, "_blank");
  };

  const redDiffClass = (diff) => {
    return Number(diff) < 0 ? "text-red-700 font-semibold bg-red-50" : "";
  };

  if (loading) {
    return <div className="p-6">Chargement des références...</div>;
  }

  const filteredWarehouses = warehouses.filter(
    (w) => !user?.site_id || Number(w.site_id) === Number(user.site_id)
  );

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="space-y-6 xl:col-span-9">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Inventaire intelligent</h1>
          <p className="text-slate-500">
            Site verrouillé, multi-dépôts, bon aveugle, écarts et résumé IA.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-2xl font-bold text-slate-800">Créer un inventaire</h2>

          <form onSubmit={createInventory} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                className="rounded-xl border p-3 bg-slate-100"
                value={user?.site_id ? `Site #${user.site_id}` : ""}
                disabled
              />

              <input
                type="text"
                className="rounded-xl border p-3"
                placeholder="Notes"
                value={createForm.notes}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <div className="rounded-xl border p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Dépôts</h3>
                <button
                  type="button"
                  onClick={selectAllWarehouses}
                  className="rounded-lg bg-slate-700 px-3 py-2 text-white"
                >
                  Tout sélectionner
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredWarehouses.map((warehouse) => (
                  <label key={warehouse.id} className="flex items-center gap-2 rounded-lg border p-3">
                    <input
                      type="checkbox"
                      checked={createForm.warehouse_ids.includes(String(warehouse.id))}
                      onChange={() => toggleWarehouse(warehouse.id)}
                    />
                    {warehouse.name}
                  </label>
                ))}
              </div>
            </div>

            <button className="rounded-xl bg-slate-900 px-4 py-3 text-white">
              Créer l’inventaire
            </button>
          </form>
        </div>

        {selectedInventory && (
          <div className="rounded-2xl bg-white p-6 shadow">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  {selectedInventory.inventory_number}
                </h2>
                <p className="text-slate-500">
                  {selectedInventory.site?.name ?? "-"} / {selectedInventory.warehouse?.name ?? "-"} /{" "}
                  <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${getStatusBadge(selectedInventory.status)}`}>
                    {selectedInventory.status}
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={printBlindInventory} className="rounded-xl bg-slate-700 px-4 py-2 text-white">
                  Bon aveugle
                </button>
                <button onClick={saveLines} className="rounded-xl bg-slate-900 px-4 py-2 text-white">
                  Enregistrer
                </button>
                {selectedInventory.status !== "validated" && (
                  <button onClick={validateInventory} className="rounded-xl bg-emerald-700 px-4 py-2 text-white">
                    Valider
                  </button>
                )}
                {selectedInventory.status === "validated" && (
                  <button onClick={loadSummary} className="rounded-xl bg-blue-700 px-4 py-2 text-white">
                    Résumé IA
                  </button>
                )}
                {user?.role === "pdg" && (
                  <button onClick={deleteInventory} className="rounded-xl bg-red-700 px-4 py-2 text-white">
                    Supprimer
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="border-b border-slate-200">
                  <tr className="text-slate-600">
                    <th className="px-4 py-3">Produit</th>
                    <th className="px-4 py-3">Théorique</th>
                    <th className="px-4 py-3">Réel</th>
                    <th className="px-4 py-3">Écart</th>
                    <th className="px-4 py-3">Valeur écart</th>
                    <th className="px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInventory.lines.map((line) => {
                    const diff =
                      Number(line.real_quantity ?? 0) - Number(line.theoretical_quantity ?? 0);
                    const diffValue = diff * Number(line.unit_cost ?? 0);

                    return (
                      <tr key={line.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3">{line.product?.name ?? line.product_id}</td>
                        <td className="px-4 py-3">{formatQty(line.theoretical_quantity)}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.001"
                            className="rounded border p-2"
                            value={line.real_quantity}
                            onChange={(e) => updateLine(line.id, "real_quantity", e.target.value)}
                            disabled={selectedInventory.status === "validated"}
                          />
                        </td>
                        <td className={`px-4 py-3 ${redDiffClass(diff)}`}>{formatQty(diff)}</td>
                        <td className={`px-4 py-3 ${redDiffClass(diff)}`}>{formatMoney(diffValue)} Ar</td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            className="rounded border p-2"
                            value={line.notes ?? ""}
                            onChange={(e) => updateLine(line.id, "notes", e.target.value)}
                            disabled={selectedInventory.status === "validated"}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {summary && (
              <div className="mt-6 rounded-xl bg-blue-50 p-4 text-blue-800">
                <div className="mb-2 font-semibold">Résumé IA</div>
                <div>{summary}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <aside className="rounded-2xl bg-white p-5 shadow xl:col-span-3">
        <h2 className="mb-4 text-xl font-semibold text-slate-800">Inventaires récents</h2>

        <div className="space-y-3">
          {inventories.map((inventory) => (
            <button
              key={inventory.id}
              onClick={() => openInventory(inventory.id)}
              className="w-full rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50"
            >
              <div className="font-semibold text-slate-800">{inventory.inventory_number}</div>
              <div className="text-sm text-slate-500">
                {formatDateTime(inventory.inventory_date)}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${getStatusBadge(inventory.status)}`}>
                  {inventory.status}
                </span>
                <span className="text-xs text-slate-500">
                  {inventory.warehouse?.name ?? "-"}
                </span>
              </div>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}