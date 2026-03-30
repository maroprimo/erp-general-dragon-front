import { useState, useEffect } from "react";
import api from "../services/api";
import useReferences from "../hooks/useReferences";
import toast from "react-hot-toast";

export default function NewProductionOrder() {
  const { sites, warehouses, loading } = useReferences();
  const [recipes, setRecipes] = useState([]);

  const [form, setForm] = useState({
    site_id: "",
    warehouse_id: "",
    recipe_id: "",
    planned_quantity: "",
    scheduled_date: "",
    expected_end_at: "",
    responsible_user_id: "",
    notes: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/production/recipes")
      .then((res) => {
        setRecipes(res.data.data ?? res.data);
      })
      .catch((err) => {
        console.error("Erreur chargement recettes", err);
      });
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const payload = {
        site_id: Number(form.site_id),
        warehouse_id: Number(form.warehouse_id),
        recipe_id: Number(form.recipe_id),
        planned_quantity: Number(form.planned_quantity),
        scheduled_date: form.scheduled_date || null,
        expected_end_at: form.expected_end_at || null,
        responsible_user_id: form.responsible_user_id ? Number(form.responsible_user_id) : null,
        notes: form.notes,
      };

      const res = await api.post("/production/orders", payload);
      toast.success(res.data.message || "Ordre de fabrication créé");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la création de l’ordre de fabrication");
    }
  };

  if (loading) {
    return <div className="p-6">Chargement des références...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="rounded-2xl bg-white p-6 shadow">
        <h1 className="mb-6 text-3xl font-bold text-slate-800">
          Nouvel ordre de fabrication
        </h1>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            value={form.recipe_id}
            onChange={(e) => handleChange("recipe_id", e.target.value)}
          >
            <option value="">Choisir une fiche technique</option>
            {recipes.map((recipe) => (
              <option key={recipe.id} value={recipe.id}>
                {recipe.code} - {recipe.product?.name ?? recipe.product_id}
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Quantité prévue"
            className="rounded-xl border p-3"
            value={form.planned_quantity}
            onChange={(e) => handleChange("planned_quantity", e.target.value)}
          />

          <input
            type="datetime-local"
            className="rounded-xl border p-3"
            value={form.scheduled_date}
            onChange={(e) => handleChange("scheduled_date", e.target.value)}
          />

          <input
            type="datetime-local"
            className="rounded-xl border p-3"
            value={form.expected_end_at}
            onChange={(e) => handleChange("expected_end_at", e.target.value)}
          />

          <input
            type="number"
            placeholder="responsible_user_id (optionnel)"
            className="rounded-xl border p-3"
            value={form.responsible_user_id}
            onChange={(e) => handleChange("responsible_user_id", e.target.value)}
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
            className="rounded-xl bg-slate-900 px-4 py-2 text-white md:col-span-2"
          >
            Créer l’ordre de fabrication
          </button>
        </form>
      </div>

      {message && <div className="mt-4 text-emerald-700 font-medium">{message}</div>}
      {error && <div className="mt-4 text-red-600 font-medium">{error}</div>}
    </div>
  );
}