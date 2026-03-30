import { useState } from "react";
import api from "../services/api";
import useReferences from "../hooks/useReferences";
import toast from "react-hot-toast";



export default function NewTransfer() {
  const { sites, products, warehouses, loading } = useReferences();

  const [form, setForm] = useState({
    from_site_id: "",
    to_site_id: "",
    notes: "",
    lines: [{ product_id: "", requested_quantity: "", approved_quantity: "" }],
  });

  const [executeForm, setExecuteForm] = useState({
    transfer_id: "",
    from_warehouse_id: "",
    to_warehouse_id: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLineChange = (index, field, value) => {
    const lines = [...form.lines];
    lines[index][field] = value;
    setForm((prev) => ({ ...prev, lines }));
  };

  const addLine = () => {
    setForm((prev) => ({
      ...prev,
      lines: [...prev.lines, { product_id: "", requested_quantity: "", approved_quantity: "" }],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const payload = {
        from_site_id: Number(form.from_site_id),
        to_site_id: Number(form.to_site_id),
        notes: form.notes,
        lines: form.lines.map((line) => ({
          product_id: Number(line.product_id),
          requested_quantity: Number(line.requested_quantity),
          approved_quantity: line.approved_quantity ? Number(line.approved_quantity) : null,
        })),
      };

      const res = await api.post("/transfers", payload);
      toast.success(`Transfert créé. ID: ${res.data.data.id}`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la création de la commande");
    }
  };

  const handleExecute = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const payload = {
        from_warehouse_id: Number(executeForm.from_warehouse_id),
        to_warehouse_id: Number(executeForm.to_warehouse_id),
      };

      const res = await api.post(`/transfers/${executeForm.transfer_id}/execute`, payload);
      setMessage(res.data.message || "Transfert exécuté");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l’exécution du transfert");
    }
  };

  if (loading) {
    return <div className="p-6">Chargement des références...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6 space-y-8">
      <div className="rounded-2xl bg-white p-6 shadow">
        <h1 className="mb-6 text-3xl font-bold text-slate-800">
          Nouveau transfert inter-sites
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <select
              className="rounded-xl border p-3"
              value={form.from_site_id}
              onChange={(e) => handleChange("from_site_id", e.target.value)}
            >
              <option value="">Choisir le site source</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border p-3"
              value={form.to_site_id}
              onChange={(e) => handleChange("to_site_id", e.target.value)}
            >
              <option value="">Choisir le site destination</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Notes"
              className="rounded-xl border p-3 md:col-span-2"
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
            />
          </div>

          <div className="space-y-3">
            {form.lines.map((line, index) => (
              <div key={index} className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <select
                  className="rounded-xl border p-3"
                  value={line.product_id}
                  onChange={(e) => handleLineChange(index, "product_id", e.target.value)}
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
                  placeholder="Quantité demandée"
                  className="rounded-xl border p-3"
                  value={line.requested_quantity}
                  onChange={(e) => handleLineChange(index, "requested_quantity", e.target.value)}
                />

                <input
                  type="number"
                  placeholder="Quantité approuvée"
                  className="rounded-xl border p-3"
                  value={line.approved_quantity}
                  onChange={(e) => handleLineChange(index, "approved_quantity", e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={addLine}
              className="rounded-xl bg-slate-700 px-4 py-2 text-white"
            >
              Ajouter ligne
            </button>

            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-white"
            >
              Créer transfert
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold text-slate-800">
          Exécuter un transfert
        </h2>

        <form onSubmit={handleExecute} className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <input
            type="number"
            placeholder="ID transfert"
            className="rounded-xl border p-3"
            value={executeForm.transfer_id}
            onChange={(e) =>
              setExecuteForm((prev) => ({ ...prev, transfer_id: e.target.value }))
            }
          />

          <select
            className="rounded-xl border p-3"
            value={executeForm.from_warehouse_id}
            onChange={(e) =>
              setExecuteForm((prev) => ({ ...prev, from_warehouse_id: e.target.value }))
            }
          >
            <option value="">Dépôt source</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border p-3"
            value={executeForm.to_warehouse_id}
            onChange={(e) =>
              setExecuteForm((prev) => ({ ...prev, to_warehouse_id: e.target.value }))
            }
          >
            <option value="">Dépôt destination</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="rounded-xl bg-emerald-700 px-4 py-2 text-white md:col-span-3"
          >
            Exécuter le transfert
          </button>
        </form>
      </div>

      {message && <div className="text-emerald-700 font-medium">{message}</div>}
      {error && <div className="text-red-600 font-medium">{error}</div>}
    </div>
  );
}