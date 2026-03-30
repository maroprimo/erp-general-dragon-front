import { useState } from "react";
import api from "../services/api";
import useReferences from "../hooks/useReferences";
import toast from "react-hot-toast";
import FormInput from "../components/FormInput";
import FormSelect from "../components/FormSelect";

export default function NewPurchase() {
  const { suppliers, sites, products, loading } = useReferences();

  const [form, setForm] = useState({
    supplier_id: "",
    site_id: "",
    expected_delivery_at: "",
    notes: "",
    lines: [{ product_id: "", quantity: "", unit_price: "" }],
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
      lines: [...prev.lines, { product_id: "", quantity: "", unit_price: "" }],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const payload = {
        supplier_id: Number(form.supplier_id),
        site_id: Number(form.site_id),
        expected_delivery_at: form.expected_delivery_at || null,
        notes: form.notes,
        lines: form.lines.map((line) => ({
          product_id: Number(line.product_id),
          quantity: Number(line.quantity),
          unit_price: Number(line.unit_price),
        })),
      };

      const res = await api.post("/purchases", payload);
      toast.success(res.data.message || "Commande créée");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la création de la commande");
    }
  };

  if (loading) {
    return <div className="p-6">Chargement des références...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <h1 className="mb-6 text-3xl font-bold text-slate-800">
        Nouvelle commande fournisseur
      </h1>

      <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <select
            className="rounded-xl border p-3"
            value={form.supplier_id}
            onChange={(e) => handleChange("supplier_id", e.target.value)}
          >
            <option value="">Choisir un fournisseur</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.company_name}
              </option>
            ))}
          </select>

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

          <FormInput
            type="datetime-local"
            className="rounded-xl border p-3"
            value={form.expected_delivery_at}
            onChange={(e) => handleChange("expected_delivery_at", e.target.value)}
          />

          <FormInput
            type="text"
            placeholder="Notes"
            className="rounded-xl border p-3"
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

              <FormInput
                type="number"
                placeholder="Quantité"
                className="rounded-xl border p-3"
                value={line.quantity}
                onChange={(e) => handleLineChange(index, "quantity", e.target.value)}
              />

              <FormInput
                type="number"
                placeholder="Prix unitaire"
                className="rounded-xl border p-3"
                value={line.unit_price}
                onChange={(e) => handleLineChange(index, "unit_price", e.target.value)}
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
            Enregistrer
          </button>
        </div>

        {message && <div className="text-emerald-700">{message}</div>}
        {error && <div className="text-red-600">{error}</div>}
      </form>
    </div>
  );
}