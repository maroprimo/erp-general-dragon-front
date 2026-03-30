import { useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

export default function AIActions() {
  const [reorderForm, setReorderForm] = useState({
    site_id: "",
    product_id: "",
    quantity: "",
  });

  const [transferForm, setTransferForm] = useState({
    product_id: "",
    from_site: "",
    to_site: "",
    quantity: "",
  });

  const [siteId, setSiteId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const applyReorder = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const res = await api.post("/ai/apply-reorder", {
        site_id: Number(reorderForm.site_id),
        product_id: Number(reorderForm.product_id),
        quantity: Number(reorderForm.quantity),
      });

      toast.success(res.data.message || "Commande IA créée");
    } catch (err) {
      console.error(err);
      setError("Erreur action IA réassort");
    }
  };

  const applyTransfer = async (e) => {
    e.preventDefault();
    toast.success("");
    setError("");

    try {
      const res = await api.post("/ai/apply-transfer", {
        product_id: Number(transferForm.product_id),
        from_site: Number(transferForm.from_site),
        to_site: Number(transferForm.to_site),
        quantity: Number(transferForm.quantity),
      });

      toast.success(res.data.message || "Transfert IA créé");
    } catch (err) {
      console.error(err);
      toast.error("Erreur action IA transfert");
    }
  };

  const autoPilot = async () => {
    toast.success("");
    setError("");

    try {
    // On utilise les backticks ` ` pour permettre l'insertion de ${siteId}
    const res = await api.post(`/ai/autopilot/site/${siteId}`);
    
    toast.success(res.data.message || "Autopilot exécuté");
    } catch (err) {
    console.error(err);
    toast.error("Erreur autopilot");
    }
}; // Fermeture de la fonction autoPilot
  return (
    <div className="min-h-screen bg-slate-100 p-6 space-y-8">
      <h1 className="text-3xl font-bold text-slate-800">Actions IA</h1>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <form onSubmit={applyReorder} className="rounded-2xl bg-white p-6 shadow space-y-4">
          <h2 className="text-xl font-semibold">Créer commande IA</h2>
          <input
            type="number"
            placeholder="site_id"
            className="w-full rounded-xl border p-3"
            value={reorderForm.site_id}
            onChange={(e) => setReorderForm((prev) => ({ ...prev, site_id: e.target.value }))}
          />
          <input
            type="number"
            placeholder="product_id"
            className="w-full rounded-xl border p-3"
            value={reorderForm.product_id}
            onChange={(e) => setReorderForm((prev) => ({ ...prev, product_id: e.target.value }))}
          />
          <input
            type="number"
            placeholder="quantité"
            className="w-full rounded-xl border p-3"
            value={reorderForm.quantity}
            onChange={(e) => setReorderForm((prev) => ({ ...prev, quantity: e.target.value }))}
          />
          <button className="rounded-xl bg-slate-900 px-4 py-2 text-white">
            Créer commande
          </button>
        </form>

        <form onSubmit={applyTransfer} className="rounded-2xl bg-white p-6 shadow space-y-4">
          <h2 className="text-xl font-semibold">Créer transfert IA</h2>
          <input
            type="number"
            placeholder="product_id"
            className="w-full rounded-xl border p-3"
            value={transferForm.product_id}
            onChange={(e) => setTransferForm((prev) => ({ ...prev, product_id: e.target.value }))}
          />
          <input
            type="number"
            placeholder="from_site"
            className="w-full rounded-xl border p-3"
            value={transferForm.from_site}
            onChange={(e) => setTransferForm((prev) => ({ ...prev, from_site: e.target.value }))}
          />
          <input
            type="number"
            placeholder="to_site"
            className="w-full rounded-xl border p-3"
            value={transferForm.to_site}
            onChange={(e) => setTransferForm((prev) => ({ ...prev, to_site: e.target.value }))}
          />
          <input
            type="number"
            placeholder="quantité"
            className="w-full rounded-xl border p-3"
            value={transferForm.quantity}
            onChange={(e) => setTransferForm((prev) => ({ ...prev, quantity: e.target.value }))}
          />
          <button className="rounded-xl bg-slate-900 px-4 py-2 text-white">
            Créer transfert
          </button>
        </form>

        <div className="rounded-2xl bg-white p-6 shadow space-y-4">
          <h2 className="text-xl font-semibold">Autopilot site</h2>
          <input
            type="number"
            placeholder="site_id"
            className="w-full rounded-xl border p-3"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
          />
          <button
            onClick={autoPilot}
            className="rounded-xl bg-emerald-700 px-4 py-2 text-white"
          >
            Lancer autopilot
          </button>
        </div>
      </div>

      {message && <div className="text-emerald-700 font-medium">{message}</div>}
      {error && <div className="text-red-600 font-medium">{error}</div>}
    </div>
  );
}