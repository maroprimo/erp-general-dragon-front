import { useState, useEffect, useMemo } from "react";
import api from "../services/api";
import useReferences from "../hooks/useReferences";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function NewProductionOrder() {
  const { sites, warehouses, loading } = useReferences();
  const { user } = useAuth();

  const [recipes, setRecipes] = useState([]);
  const [simulation, setSimulation] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

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

  useEffect(() => {
    if (!user?.id) return;

    setForm((prev) => ({
      ...prev,
      responsible_user_id: String(user.id),
      site_id: prev.site_id || (user.site_id ? String(user.site_id) : ""),
    }));
  }, [user]);

  const filteredWarehouses = useMemo(() => {
    if (!form.site_id) return warehouses;
    return warehouses.filter(
      (warehouse) => Number(warehouse.site_id) === Number(form.site_id)
    );
  }, [warehouses, form.site_id]);

  useEffect(() => {
    if (!form.site_id) return;

    const warehouseStillValid = filteredWarehouses.some(
      (warehouse) => Number(warehouse.id) === Number(form.warehouse_id)
    );

    if (!warehouseStillValid) {
      setForm((prev) => ({
        ...prev,
        warehouse_id: filteredWarehouses[0]?.id
          ? String(filteredWarehouses[0].id)
          : "",
      }));
    }
  }, [form.site_id, filteredWarehouses, form.warehouse_id]);

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
        responsible_user_id: user?.id ? Number(user.id) : null,
        notes: form.notes || "",
      };

      const res = await api.post("/production/orders", payload);

      const successMessage =
        res.data.message || "Ordre de fabrication créé";
      setMessage(successMessage);
      toast.success(successMessage);

      setForm((prev) => ({
        ...prev,
        warehouse_id: "",
        recipe_id: "",
        planned_quantity: "",
        scheduled_date: "",
        expected_end_at: "",
        notes: "",
        responsible_user_id: user?.id ? String(user.id) : "",
      }));

      setSimulation(null);
    } catch (err) {
      console.error(err);
      const errorMessage =
        err?.response?.data?.message ||
        "Erreur lors de la création de l’ordre de fabrication";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const simulateProduction = async () => {
    if (!form.recipe_id || !form.site_id || !form.planned_quantity) {
      setSimulation(null);
      return;
    }

    try {
      setSimLoading(true);

      const payload = {
        recipe_id: Number(form.recipe_id),
        site_id: Number(form.site_id),
        warehouse_id: form.warehouse_id ? Number(form.warehouse_id) : null,
        planned_quantity: Number(form.planned_quantity),
      };

      const res = await api.post("/production/orders/simulate", payload);
      setSimulation(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de simuler la fabrication");
    } finally {
      setSimLoading(false);
    }
  };

  useEffect(() => {
    simulateProduction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.recipe_id, form.site_id, form.warehouse_id, form.planned_quantity]);

  if (loading) {
    return <div className="p-6">Chargement des références...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="rounded-2xl bg-white p-6 shadow">
        <h1 className="mb-6 text-3xl font-bold text-slate-800">
          Nouvel ordre de fabrication
        </h1>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
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
            {filteredWarehouses.map((warehouse) => (
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
            type="text"
            className="rounded-xl border bg-slate-100 p-3 text-slate-700"
            value={
              user?.name
                ? `${user.name} (ID: ${user.id})`
                : form.responsible_user_id
                ? `ID: ${form.responsible_user_id}`
                : ""
            }
            readOnly
            placeholder="Demandeur connecté"
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

      {simulation && (
        <div className="mt-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-2xl font-bold text-slate-800">
            Simulation ingrédients
          </h2>

          {simLoading ? (
            <div>Calcul en cours...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="border-b border-slate-200">
                  <tr className="text-slate-600">
                    <th className="px-4 py-3">Ingrédient</th>
                    <th className="px-4 py-3">Qté fiche</th>
                    <th className="px-4 py-3">Unité fiche</th>
                    <th className="px-4 py-3">Qté recalculée</th>
                    <th className="px-4 py-3">Qté unité stock</th>
                    <th className="px-4 py-3">Unité stock</th>
                    <th className="px-4 py-3">Stock dispo</th>
                  </tr>
                </thead>
                <tbody>
                  {simulation.lines.map((line, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-slate-100 ${
                        line.is_short
                          ? "bg-red-100 font-semibold text-red-700"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="px-4 py-3">{line.product_name}</td>
                      <td className="px-4 py-3">{line.recipe_quantity_initial}</td>
                      <td className="px-4 py-3">{line.recipe_unit_name}</td>
                      <td className="px-4 py-3">
                        {line.quantity_recalculated.toFixed(3)}
                      </td>
                      <td className="px-4 py-3">
                        {line.quantity_in_stock_unit.toFixed(3)}
                      </td>
                      <td className="px-4 py-3">{line.stock_unit_name}</td>
                      <td className="px-4 py-3">
                        {line.stock_available.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {message && (
        <div className="mt-4 font-medium text-emerald-700">{message}</div>
      )}
      {error && <div className="mt-4 font-medium text-red-600">{error}</div>}
    </div>
  );
}