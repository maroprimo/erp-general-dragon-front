import { useEffect, useState } from "react";
import api from "../services/api";
import useReferences from "../hooks/useReferences";
import toast from "react-hot-toast";

export default function Recipes() {
  const { products, loading } = useReferences();
  const [units, setUnits] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const [form, setForm] = useState({
    code: "",
    product_id: "",
    version: 1,
    standard_batch_size: "",
    yield_unit_id: "",
    yield_quantity: "",
    expected_yield_rate: "",
    standard_loss_rate: "",
    standard_duration_minutes: "",
    allowed_variance_percent: 5,
    status: "draft",
    notes: "",
    lines: [
      {
        ingredient_product_id: "",
        quantity: "",
        unit_id: "",
        line_type: "ingredient",
        sort_order: 1,
      },
    ],
  });

  const loadRecipes = async () => {
    try {
      const res = await api.get("/recipes-admin");
      setRecipes(res.data.data ?? res.data);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les fiches techniques");
    }
  };

  const loadUnits = async () => {
    try {
      const res = await api.get("/references/units");
      setUnits(res.data ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les unités");
    }
  };

  useEffect(() => {
    loadRecipes();
    loadUnits();
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateLine = (index, field, value) => {
    const lines = [...form.lines];
    lines[index][field] = value;
    setForm((prev) => ({ ...prev, lines }));
  };

  const addLine = () => {
    setForm((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          ingredient_product_id: "",
          quantity: "",
          unit_id: "",
          line_type: "ingredient",
          sort_order: prev.lines.length + 1,
        },
      ],
    }));
  };

  const createRecipe = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        code: form.code,
        product_id: Number(form.product_id),
        version: Number(form.version),
        standard_batch_size: Number(form.standard_batch_size),
        yield_unit_id: Number(form.yield_unit_id),
        yield_quantity: Number(form.yield_quantity),
        expected_yield_rate: form.expected_yield_rate ? Number(form.expected_yield_rate) : null,
        standard_loss_rate: form.standard_loss_rate ? Number(form.standard_loss_rate) : null,
        standard_duration_minutes: form.standard_duration_minutes ? Number(form.standard_duration_minutes) : null,
        allowed_variance_percent: Number(form.allowed_variance_percent),
        status: form.status,
        notes: form.notes,
        lines: form.lines.map((line, index) => ({
          ingredient_product_id: Number(line.ingredient_product_id),
          quantity: Number(line.quantity),
          unit_id: Number(line.unit_id),
          line_type: line.line_type || "ingredient",
          sort_order: index + 1,
        })),
      };

      const res = await api.post("/recipes-admin", payload);
      toast.success(res.data.message || "Fiche technique créée");

      setForm({
        code: "",
        product_id: "",
        version: 1,
        standard_batch_size: "",
        yield_unit_id: "",
        yield_quantity: "",
        expected_yield_rate: "",
        standard_loss_rate: "",
        standard_duration_minutes: "",
        allowed_variance_percent: 5,
        status: "draft",
        notes: "",
        lines: [
          {
            ingredient_product_id: "",
            quantity: "",
            unit_id: "",
            line_type: "ingredient",
            sort_order: 1,
          },
        ],
      });

      loadRecipes();
    } catch (err) {
      console.error(err);
      toast.error("Erreur création fiche technique");
    }
  };

  const openRecipe = async (id) => {
    try {
      const res = await api.get(`/recipes-admin/${id}`);
      setSelectedRecipe(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Impossible d’ouvrir la fiche technique");
    }
  };

  const approveRecipe = async (id) => {
    try {
      const res = await api.patch(`/recipes-admin/${id}/approve`);
      toast.success(res.data.message || "Fiche technique validée");
      openRecipe(id);
      loadRecipes();
    } catch (err) {
      console.error(err);
      toast.error("Erreur validation fiche technique");
    }
  };

  const showCost = async (id) => {
    try {
      const res = await api.get(`/recipes-admin/${id}/theoretical-cost`);
      toast.success(`Coût théorique : ${res.data.theoretical_cost} Ar`);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de calculer le coût théorique");
    }
  };

  if (loading) {
    return <div className="p-6">Chargement des références...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Fiches techniques</h1>
        <p className="text-slate-500">
          Recettes, ingrédients, rendement, pertes standard et coût théorique.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold text-slate-800">Nouvelle fiche technique</h2>

        <form onSubmit={createRecipe} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <input className="rounded-xl border p-3" placeholder="Code recette" value={form.code} onChange={(e) => handleChange("code", e.target.value)} />

            <select className="rounded-xl border p-3" value={form.product_id} onChange={(e) => handleChange("product_id", e.target.value)}>
              <option value="">Produit fabriqué</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>

            <input className="rounded-xl border p-3" type="number" placeholder="Version" value={form.version} onChange={(e) => handleChange("version", e.target.value)} />
            <input className="rounded-xl border p-3" type="number" step="0.001" placeholder="Batch standard" value={form.standard_batch_size} onChange={(e) => handleChange("standard_batch_size", e.target.value)} />

            <select className="rounded-xl border p-3" value={form.yield_unit_id} onChange={(e) => handleChange("yield_unit_id", e.target.value)}>
              <option value="">Unité rendement</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>

            <input className="rounded-xl border p-3" type="number" step="0.001" placeholder="Qté produite" value={form.yield_quantity} onChange={(e) => handleChange("yield_quantity", e.target.value)} />
            <input className="rounded-xl border p-3" type="number" step="0.001" placeholder="Rendement attendu (%)" value={form.expected_yield_rate} onChange={(e) => handleChange("expected_yield_rate", e.target.value)} />
            <input className="rounded-xl border p-3" type="number" step="0.001" placeholder="Perte standard (%)" value={form.standard_loss_rate} onChange={(e) => handleChange("standard_loss_rate", e.target.value)} />

            <input className="rounded-xl border p-3" type="number" placeholder="Durée standard (minutes)" value={form.standard_duration_minutes} onChange={(e) => handleChange("standard_duration_minutes", e.target.value)} />
            <input className="rounded-xl border p-3" type="number" step="0.001" placeholder="Tolérance (%)" value={form.allowed_variance_percent} onChange={(e) => handleChange("allowed_variance_percent", e.target.value)} />

            <select className="rounded-xl border p-3" value={form.status} onChange={(e) => handleChange("status", e.target.value)}>
              <option value="draft">draft</option>
              <option value="approved">approved</option>
            </select>

            <input className="rounded-xl border p-3 xl:col-span-2" placeholder="Notes" value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} />
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-800">Ingrédients</h3>
              <button
                type="button"
                onClick={addLine}
                className="rounded-xl bg-slate-700 px-4 py-2 text-white"
              >
                Ajouter ingrédient
              </button>
            </div>

            <div className="space-y-4">
              {form.lines.map((line, index) => (
                <div key={index} className="grid grid-cols-1 gap-4 rounded-xl border p-4 md:grid-cols-4">
                  <select
                    className="rounded-xl border p-3"
                    value={line.ingredient_product_id}
                    onChange={(e) => updateLine(index, "ingredient_product_id", e.target.value)}
                  >
                    <option value="">Ingrédient</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>

                  <input
                    className="rounded-xl border p-3"
                    type="number"
                    step="0.001"
                    placeholder="Quantité"
                    value={line.quantity}
                    onChange={(e) => updateLine(index, "quantity", e.target.value)}
                  />

                  <select
                    className="rounded-xl border p-3"
                    value={line.unit_id}
                    onChange={(e) => updateLine(index, "unit_id", e.target.value)}
                  >
                    <option value="">Unité</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>

                  <input
                    className="rounded-xl border p-3"
                    value={line.line_type}
                    onChange={(e) => updateLine(index, "line_type", e.target.value)}
                    placeholder="ingredient"
                  />
                </div>
              ))}
            </div>
          </div>

          <button className="rounded-xl bg-slate-900 px-4 py-3 text-white">
            Enregistrer la fiche technique
          </button>
        </form>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold text-slate-800">Liste des fiches techniques</h2>

        <div className="space-y-3">
          {recipes.map((recipe) => (
            <div key={recipe.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
              <div>
                <div className="font-semibold text-slate-800">
                  {recipe.code} - {recipe.product?.name ?? "-"}
                </div>
                <div className="text-sm text-slate-500">
                  version {recipe.version} / statut : {recipe.status}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openRecipe(recipe.id)}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-white"
                >
                  Ouvrir
                </button>
                <button
                  onClick={() => showCost(recipe.id)}
                  className="rounded-xl bg-slate-700 px-4 py-2 text-white"
                >
                  Coût théorique
                </button>
                {recipe.status !== "approved" && (
                  <button
                    onClick={() => approveRecipe(recipe.id)}
                    className="rounded-xl bg-emerald-700 px-4 py-2 text-white"
                  >
                    Valider
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedRecipe && (
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-2xl font-bold text-slate-800">
            Détail recette : {selectedRecipe.code}
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Produit fini</div>
              <div className="font-semibold text-slate-800">{selectedRecipe.product?.name ?? "-"}</div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Rendement</div>
              <div className="font-semibold text-slate-800">
                {selectedRecipe.yield_quantity} {selectedRecipe.yield_unit?.name ?? ""}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Durée standard</div>
              <div className="font-semibold text-slate-800">
                {selectedRecipe.standard_duration_minutes ?? 0} min
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="border-b border-slate-200">
                <tr className="text-slate-600">
                  <th className="px-4 py-3">Ingrédient</th>
                  <th className="px-4 py-3">Qté</th>
                  <th className="px-4 py-3">Unité</th>
                  <th className="px-4 py-3">Type</th>
                </tr>
              </thead>
              <tbody>
                {(selectedRecipe.lines ?? []).map((line) => (
                  <tr key={line.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">{line.ingredient?.name ?? "-"}</td>
                    <td className="px-4 py-3">{line.quantity}</td>
                    <td className="px-4 py-3">{line.unit?.name ?? "-"}</td>
                    <td className="px-4 py-3">{line.line_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}