import { useEffect, useState } from "react";
import api from "../services/api";
import useReferences from "../hooks/useReferences";
import toast from "react-hot-toast";
import ConfirmBox from "../components/ConfirmBox";
import { useAuth } from "../context/AuthContext"


export default function ReceivePurchase() {
  const { warehouses, loading } = useReferences();

  const [purchases, setPurchases] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [form, setForm] = useState({
    site_id: "",
    warehouse_id: "",
    notes: "",
    lines: [],
  });

  const loadPurchases = async () => {
    try {
      const res = await api.get("/purchases");
      const items = res.data.data ?? res.data;
      setPurchases(items);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les bons de commande");
    }
  };

  useEffect(() => {
    loadPurchases();
  }, []);

  const selectPurchase = (purchaseId) => {
    setSelectedId(purchaseId);

    const purchase = purchases.find((p) => String(p.id) === String(purchaseId));
    setSelectedPurchase(purchase || null);

    if (purchase) {
      setForm({
        site_id: purchase.site_id ?? "",
        warehouse_id: "",
        notes: "",
        lines: (purchase.lines ?? []).map((line) => ({
          product_id: line.product_id,
          product_name: line.product?.name ?? `Produit #${line.product_id}`,
          received_quantity: line.quantity ?? "",
          accepted_quantity: line.quantity ?? "",
          rejected_quantity: 0,
          unit_cost: line.unit_price ?? "",
          storage_location_id: "",
          expiry_date: "",
          notes: "",
        })),
      });
    }
  };

  const updateLine = (index, field, value) => {
    const lines = [...form.lines];
    lines[index][field] = value;
    setForm((prev) => ({ ...prev, lines }));
  };

  const submitReception = async () => {
    try {
      const payload = {
        site_id: Number(form.site_id),
        warehouse_id: Number(form.warehouse_id),
        notes: form.notes,
        lines: form.lines.map((line) => ({
          product_id: Number(line.product_id),
          received_quantity: Number(line.received_quantity),
          accepted_quantity: Number(line.accepted_quantity),
          rejected_quantity: Number(line.rejected_quantity || 0),
          unit_cost: Number(line.unit_cost),
          storage_location_id: line.storage_location_id ? Number(line.storage_location_id) : null,
          expiry_date: line.expiry_date || null,
          notes: line.notes || "",
        })),
      };

  const res = await api.post(`/purchases/${selectedPurchase.id}/receive`, payload);
      
      toast.success(res.data.message || "Réception enregistrée");
      setConfirmOpen(false);
      loadPurchases();
    } catch (err) {
      console.error("Détails de l'erreur:", err.response?.data); // Affiche l'erreur réelle de Laravel
      const message = err.response?.data?.message || "Erreur lors de la réception fournisseur";
      toast.error(message);
    }
  };

  if (loading) {
    return <div className="p-6">Chargement des références...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Réception fournisseur</h1>
        <p className="text-slate-500">
          Transforme un bon de commande en entrée réelle de stock.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Choisir un bon de commande
        </label>
        <select
          className="w-full rounded-xl border p-3"
          value={selectedId}
          onChange={(e) => selectPurchase(e.target.value)}
        >
          <option value="">Choisir un BC</option>
          {purchases.map((purchase) => (
            <option key={purchase.id} value={purchase.id}>
              {purchase.order_number} - {purchase.supplier?.company_name ?? "Fournisseur"} - {purchase.status}
            </option>
          ))}
        </select>
      </div>

      {selectedPurchase && (
        <div className="rounded-2xl bg-white p-6 shadow space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              type="text"
              className="rounded-xl border p-3 bg-slate-50"
              value={selectedPurchase.site?.name ?? `Site #${selectedPurchase.site_id}`}
              disabled
            />

            <select
              className="rounded-xl border p-3"
              value={form.warehouse_id}
              onChange={(e) => setForm((prev) => ({ ...prev, warehouse_id: e.target.value }))}
            >
              <option value="">Choisir un dépôt de réception</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Notes réception"
              className="rounded-xl border p-3 md:col-span-2"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="border-b border-slate-200">
                <tr className="text-slate-600">
                  <th className="px-4 py-3">Produit</th>
                  <th className="px-4 py-3">Prévu</th>
                  <th className="px-4 py-3">Reçu</th>
                  <th className="px-4 py-3">Accepté</th>
                  <th className="px-4 py-3">Rejeté</th>
                  <th className="px-4 py-3">Coût unitaire</th>
                  <th className="px-4 py-3">DLC</th>
                </tr>
              </thead>
              <tbody>
                {form.lines.map((line, index) => (
                  <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">{line.product_name}</td>
                    <td className="px-4 py-3">{line.received_quantity}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        className="rounded border p-2"
                        value={line.received_quantity}
                        onChange={(e) => updateLine(index, "received_quantity", e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        className="rounded border p-2"
                        value={line.accepted_quantity}
                        onChange={(e) => updateLine(index, "accepted_quantity", e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        className="rounded border p-2"
                        value={line.rejected_quantity}
                        onChange={(e) => updateLine(index, "rejected_quantity", e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        className="rounded border p-2"
                        value={line.unit_cost}
                        onChange={(e) => updateLine(index, "unit_cost", e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        className="rounded border p-2"
                        value={line.expiry_date}
                        onChange={(e) => updateLine(index, "expiry_date", e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={() => setConfirmOpen(true)}
            className="rounded-xl bg-slate-900 px-4 py-3 text-white"
          >
            Valider la réception
          </button>
        </div>
      )}

      {confirmOpen && (
        <ConfirmBox
          title="Confirmer la réception"
          message="Voulez-vous vraiment enregistrer cette réception fournisseur ?"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={submitReception}
        />
      )}
    </div>
  );
}