import { useEffect, useState } from "react";
import api from "../services/api";
import useReferences from "../hooks/useReferences";
import toast from "react-hot-toast";
import { formatQty, formatMoney } from "../utils/formatters";

const lossTypes = [
  "casse",
  "vol",
  "peremption",
  "erreur_fabrication",
  "erreur_reception",
  "perte_cuisine",
  "perte_transport",
  "autre",
];

export default function StockLosses() {
  const { sites, warehouses, products, loading } = useReferences();

  const [losses, setLosses] = useState([]);
  const [form, setForm] = useState({
    site_id: "",
    warehouse_id: "",
    storage_location_id: "",
    product_id: "",
    quantity: "",
    unit_cost: "",
    loss_type: "casse",
    loss_date: "",
    reason: "",
    notes: "",
  });

  const loadLosses = async () => {
    try {
      const res = await api.get("/stock-losses");
      setLosses(res.data.data ?? res.data);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les pertes");
    }
  };

  useEffect(() => {
    loadLosses();
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        site_id: Number(form.site_id),
        warehouse_id: form.warehouse_id ? Number(form.warehouse_id) : null,
        storage_location_id: form.storage_location_id ? Number(form.storage_location_id) : null,
        product_id: Number(form.product_id),
        quantity: Number(form.quantity),
        unit_cost: form.unit_cost ? Number(form.unit_cost) : null,
        loss_type: form.loss_type,
        loss_date: form.loss_date || null,
        reason: form.reason,
        notes: form.notes,
      };

      const res = await api.post("/stock-losses", payload);
      toast.success(res.data.message || "Perte enregistrée");

      setForm({
        site_id: "",
        warehouse_id: "",
        storage_location_id: "",
        product_id: "",
        quantity: "",
        unit_cost: "",
        loss_type: "casse",
        loss_date: "",
        reason: "",
        notes: "",
      });

      loadLosses();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l’enregistrement de la perte");
    }
  };

  const validateLoss = async (id) => {
    try {
      const res = await api.patch(`/stock-losses/${id}/validate`);
      toast.success(res.data.message || "Perte validée");
      loadLosses();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la validation");
    }
  };

  if (loading) {
    return <div className="p-6">Chargement des références...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Gestion des pertes</h1>
        <p className="text-slate-500">
          Déclare et suis les pertes réelles : casse, vol, péremption, erreur, cuisine.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold text-slate-800">Nouvelle perte</h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <select
            className="rounded-xl border p-3"
            value={form.site_id}
            onChange={(e) => handleChange("site_id", e.target.value)}
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
            value={form.warehouse_id}
            onChange={(e) => handleChange("warehouse_id", e.target.value)}
          >
            <option value="">Choisir un dépôt</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border p-3"
            value={form.product_id}
            onChange={(e) => handleChange("product_id", e.target.value)}
          >
            <option value="">Choisir un produit</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            step="0.001"
            placeholder="Quantité perdue"
            className="rounded-xl border p-3"
            value={form.quantity}
            onChange={(e) => handleChange("quantity", e.target.value)}
          />

          <input
            type="number"
            step="0.01"
            placeholder="Coût unitaire (optionnel)"
            className="rounded-xl border p-3"
            value={form.unit_cost}
            onChange={(e) => handleChange("unit_cost", e.target.value)}
          />

          <select
            className="rounded-xl border p-3"
            value={form.loss_type}
            onChange={(e) => handleChange("loss_type", e.target.value)}
          >
            {lossTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <input
            type="datetime-local"
            className="rounded-xl border p-3"
            value={form.loss_date}
            onChange={(e) => handleChange("loss_date", e.target.value)}
          />

          <input
            type="text"
            placeholder="Raison"
            className="rounded-xl border p-3"
            value={form.reason}
            onChange={(e) => handleChange("reason", e.target.value)}
          />

          <input
            type="text"
            placeholder="Notes"
            className="rounded-xl border p-3"
            value={form.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
          />

          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-3 text-white xl:col-span-3"
          >
            Enregistrer la perte
          </button>
        </form>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold text-slate-800">Historique des pertes</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="border-b border-slate-200">
              <tr className="text-slate-600">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Produit</th>
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">Dépôt</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Qté</th>
                <th className="px-4 py-3">Coût total</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {losses.map((loss) => (
                <tr key={loss.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {loss.loss_date ? new Date(loss.loss_date).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3">{loss.product?.name ?? loss.product_id}</td>
                  <td className="px-4 py-3">{loss.site?.name ?? loss.site_id}</td>
                  <td className="px-4 py-3">{loss.warehouse?.name ?? loss.warehouse_id ?? "-"}</td>
                  <td className="px-4 py-3">{loss.loss_type}</td>
                  <td className="px-4 py-3">{formatQty(loss.quantity)}</td>
                  <td className="px-4 py-3">{formatMoney(loss.total_cost)} Ar</td>
                  <td className="px-4 py-3">{loss.status}</td>
                  <td className="px-4 py-3">
                    {loss.status !== "validated" && (
                      <button
                        onClick={() => validateLoss(loss.id)}
                        className="rounded-xl bg-amber-600 px-3 py-2 text-white"
                      >
                        Valider
                      </button>
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