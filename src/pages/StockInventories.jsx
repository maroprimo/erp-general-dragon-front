import { useEffect, useState } from "react";
import api from "../services/api";
import useReferences from "../hooks/useReferences";
import toast from "react-hot-toast";

export default function StockInventories() {
  const { sites, warehouses, loading } = useReferences();

  const [inventories, setInventories] = useState([]);
  const [selectedInventory, setSelectedInventory] = useState(null);

  const [createForm, setCreateForm] = useState({
    site_id: "",
    warehouse_id: "",
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

  useEffect(() => {
    loadInventories();
  }, []);

  const createInventory = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        site_id: Number(createForm.site_id),
        warehouse_id: createForm.warehouse_id ? Number(createForm.warehouse_id) : null,
        notes: createForm.notes,
      };

      const res = await api.post("/stock-inventories", payload);
      toast.success(res.data.message || "Inventaire créé");
      setSelectedInventory(res.data.data);
      setCreateForm({
        site_id: "",
        warehouse_id: "",
        notes: "",
      });
      loadInventories();
    } catch (err) {
      console.error(err);
      toast.error("Erreur création inventaire");
    }
  };

  const openInventory = async (id) => {
    try {
      const res = await api.get(`/stock-inventories/${id}`);
      setSelectedInventory(res.data);
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

      const res = await api.put(`/stock-inventories/${selectedInventory.id}/lines`,
        payload
      );

      toast.success(res.data.message || "Inventaire mis à jour");
      setSelectedInventory(res.data.data);
      loadInventories();
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
    } catch (err) {
      console.error(err);
      toast.error("Erreur validation inventaire");
    }
  };

  if (loading) {
    return <div className="p-6">Chargement des références...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Inventaire intelligent</h1>
        <p className="text-slate-500">
          Compare le stock théorique au stock réel et ajuste automatiquement.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold text-slate-800">Créer un inventaire</h2>

        <form onSubmit={createInventory} className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <select
            className="rounded-xl border p-3"
            value={createForm.site_id}
            onChange={(e) =>
              setCreateForm((prev) => ({ ...prev, site_id: e.target.value }))
            }
          >
            <option value="">Choisir un site</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border p-3"
            value={createForm.warehouse_id}
            onChange={(e) =>
              setCreateForm((prev) => ({ ...prev, warehouse_id: e.target.value }))
            }
          >
            <option value="">Choisir un dépôt</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Notes"
            className="rounded-xl border p-3"
            value={createForm.notes}
            onChange={(e) =>
              setCreateForm((prev) => ({ ...prev, notes: e.target.value }))
            }
          />

          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-3 text-white md:col-span-3"
          >
            Créer l’inventaire
          </button>
        </form>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold text-slate-800">Liste des inventaires</h2>

        <div className="space-y-3">
          {inventories.map((inventory) => (
            <div
              key={inventory.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 p-4"
            >
              <div>
                <div className="font-semibold text-slate-800">
                  {inventory.inventory_number}
                </div>
                <div className="text-sm text-slate-500">
                  {inventory.site?.name ?? "-"} / {inventory.warehouse?.name ?? "-"} / {inventory.status}
                </div>
              </div>

              <button
                onClick={() => openInventory(inventory.id)}
                className="rounded-xl bg-blue-600 px-4 py-2 text-white"
              >
                Ouvrir
              </button>
            </div>
          ))}
        </div>
      </div>

      {selectedInventory && (
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800">
              Inventaire {selectedInventory.inventory_number}
            </h2>

            <div className="flex gap-3">
              <button
                onClick={saveLines}
                className="rounded-xl bg-slate-900 px-4 py-2 text-white"
              >
                Enregistrer
              </button>

              {selectedInventory.status !== "validated" && (
                <button
                  onClick={validateInventory}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-white"
                >
                  Valider inventaire
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
                      <td className="px-4 py-3">{line.theoretical_quantity}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.001"
                          className="rounded border p-2"
                          value={line.real_quantity}
                          onChange={(e) =>
                            updateLine(line.id, "real_quantity", e.target.value)
                          }
                          disabled={selectedInventory.status === "validated"}
                        />
                      </td>
                      <td className="px-4 py-3">{diff.toFixed(3)}</td>
                      <td className="px-4 py-3">{diffValue.toFixed(2)} Ar</td>
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
        </div>
      )}
    </div>
  );
}