import { useEffect, useState } from "react";
import api from "../services/api";
import useReferences from "../hooks/useReferences";
import toast from "react-hot-toast";
import { formatQty } from "../utils/formatters";

function emptyLine(sortOrder = 1) {
  return {
    ingredient_product_id: "",
    quantity: "",
    unit_id: "",
    line_type: "ingredient",
    sort_order: sortOrder,
  };
}

function initialFormState() {
  return {
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
    lines: [emptyLine(1)],
  };
}

const formatMoney = (value) => {
  const amount = Number(value ?? 0);

  return amount.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

export default function Recipes() {
  const { products, loading } = useReferences();
  const [units, setUnits] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [editingRecipeId, setEditingRecipeId] = useState(null);

  const [form, setForm] = useState(initialFormState());

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

  const resetForm = () => {
    setEditingRecipeId(null);
    setForm(initialFormState());
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateLine = (index, field, value) => {
    setForm((prev) => {
      const lines = [...prev.lines];
      lines[index] = { ...lines[index], [field]: value };
      return { ...prev, lines };
    });
  };

  const addLine = () => {
    setForm((prev) => ({
      ...prev,
      lines: [...prev.lines, emptyLine(prev.lines.length + 1)],
    }));
  };

  const removeLine = (index) => {
    setForm((prev) => {
      const nextLines = prev.lines.filter((_, i) => i !== index);

      const normalized =
        nextLines.length > 0
          ? nextLines.map((line, idx) => ({ ...line, sort_order: idx + 1 }))
          : [emptyLine(1)];

      return {
        ...prev,
        lines: normalized,
      };
    });
  };

  const buildPayload = () => ({
    code: form.code,
    product_id: Number(form.product_id),
    version: Number(form.version),
    standard_batch_size: Number(form.standard_batch_size),
    yield_unit_id: Number(form.yield_unit_id),
    yield_quantity: Number(form.yield_quantity),
    expected_yield_rate: form.expected_yield_rate
      ? Number(form.expected_yield_rate)
      : null,
    standard_loss_rate: form.standard_loss_rate
      ? Number(form.standard_loss_rate)
      : null,
    standard_duration_minutes: form.standard_duration_minutes
      ? Number(form.standard_duration_minutes)
      : null,
    allowed_variance_percent: Number(form.allowed_variance_percent),
    status: form.status,
    notes: form.notes,
    lines: (form.lines || [])
      .filter(
        (line) => line?.ingredient_product_id && line?.quantity && line?.unit_id
      )
      .map((line, index) => ({
        ingredient_product_id: Number(line.ingredient_product_id),
        quantity: Number(line.quantity),
        unit_id: Number(line.unit_id),
        line_type: line.line_type || "ingredient",
        sort_order: index + 1,
      })),
  });

  const saveRecipe = async (e) => {
    e.preventDefault();

    try {
      const payload = buildPayload();
      const res = editingRecipeId
        ? await api.put(`/recipes-admin/${editingRecipeId}`, payload)
        : await api.post("/recipes-admin", payload);

      toast.success(
        res.data.message ||
          (editingRecipeId
            ? "Fiche technique mise à jour"
            : "Fiche technique créée")
      );

      resetForm();
      loadRecipes();

      if (editingRecipeId) {
        openRecipe(editingRecipeId);
      }
    } catch (err) {
      console.error(err);
      toast.error(
        editingRecipeId
          ? "Erreur modification fiche technique"
          : "Erreur création fiche technique"
      );
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

  const startEditRecipe = async (id) => {
    try {
      const res = await api.get(`/recipes-admin/${id}`);
      const recipe = res.data;

      setEditingRecipeId(recipe.id);
      setSelectedRecipe(recipe);
      setForm({
        code: recipe.code || "",
        product_id: recipe.product_id ? String(recipe.product_id) : "",
        version: recipe.version ?? 1,
        standard_batch_size: recipe.standard_batch_size ?? "",
        yield_unit_id: recipe.yield_unit_id ? String(recipe.yield_unit_id) : "",
        yield_quantity: recipe.yield_quantity ?? "",
        expected_yield_rate: recipe.expected_yield_rate ?? "",
        standard_loss_rate: recipe.standard_loss_rate ?? "",
        standard_duration_minutes: recipe.standard_duration_minutes ?? "",
        allowed_variance_percent: recipe.allowed_variance_percent ?? 5,
        status: recipe.status || "draft",
        notes: recipe.notes || "",
        lines:
          (recipe.lines ?? []).length > 0
            ? recipe.lines.map((line, index) => ({
                ingredient_product_id: line.ingredient_product_id
                  ? String(line.ingredient_product_id)
                  : "",
                quantity: line.quantity ?? "",
                unit_id: line.unit_id ? String(line.unit_id) : "",
                line_type: line.line_type || "ingredient",
                sort_order: line.sort_order ?? index + 1,
              }))
            : [emptyLine(1)],
      });

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger la fiche pour modification");
    }
  };

  const deleteRecipe = async (id) => {
    if (!window.confirm("Supprimer cette fiche technique ?")) {
      return;
    }

    try {
      const res = await api.delete(`/recipes-admin/${id}`);
      toast.success(res.data.message || "Fiche technique supprimée");

      if (selectedRecipe?.id === id) {
        setSelectedRecipe(null);
      }

      if (editingRecipeId === id) {
        resetForm();
      }

      loadRecipes();
    } catch (err) {
      console.error(err);
      toast.error("Erreur suppression fiche technique");
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
      const currentRecipe = recipes.find((recipe) => recipe.id === id);

      if (currentRecipe?.theoretical_cost != null) {
        toast.success(
          `Coût théorique : ${formatMoney(currentRecipe.theoretical_cost)} Ar`
        );
        return;
      }

      const res = await api.get(`/recipes-admin/${id}/theoretical-cost`);
      toast.success(`Coût théorique : ${formatMoney(res.data.theoretical_cost)} Ar`);
      loadRecipes();
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-slate-800">
            {editingRecipeId ? "Modifier la fiche technique" : "Nouvelle fiche technique"}
          </h2>

          {editingRecipeId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl bg-slate-200 px-4 py-2 text-slate-800"
            >
              Annuler la modification
            </button>
          )}
        </div>

        <form onSubmit={saveRecipe} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <input
              className="rounded-xl border p-3"
              placeholder="Code recette"
              value={form.code}
              onChange={(e) => handleChange("code", e.target.value)}
            />

            <select
              className="rounded-xl border p-3"
              value={form.product_id}
              onChange={(e) => handleChange("product_id", e.target.value)}
            >
              <option value="">Produit fabriqué</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>

            <input
              className="rounded-xl border p-3"
              type="number"
              placeholder="Version"
              value={form.version}
              onChange={(e) => handleChange("version", e.target.value)}
            />

            <input
              className="rounded-xl border p-3"
              type="number"
              step="0.001"
              placeholder="Batch standard"
              value={form.standard_batch_size}
              onChange={(e) => handleChange("standard_batch_size", e.target.value)}
            />

            <select
              className="rounded-xl border p-3"
              value={form.yield_unit_id}
              onChange={(e) => handleChange("yield_unit_id", e.target.value)}
            >
              <option value="">Unité rendement</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>

            <input
              className="rounded-xl border p-3"
              type="number"
              step="0.001"
              placeholder="Qté produite"
              value={form.yield_quantity}
              onChange={(e) => handleChange("yield_quantity", e.target.value)}
            />

            <input
              className="rounded-xl border p-3"
              type="number"
              step="0.001"
              placeholder="Rendement attendu (%)"
              value={form.expected_yield_rate}
              onChange={(e) => handleChange("expected_yield_rate", e.target.value)}
            />

            <input
              className="rounded-xl border p-3"
              type="number"
              step="0.001"
              placeholder="Perte standard (%)"
              value={form.standard_loss_rate}
              onChange={(e) => handleChange("standard_loss_rate", e.target.value)}
            />

            <input
              className="rounded-xl border p-3"
              type="number"
              placeholder="Durée standard (minutes)"
              value={form.standard_duration_minutes}
              onChange={(e) => handleChange("standard_duration_minutes", e.target.value)}
            />

            <input
              className="rounded-xl border p-3"
              type="number"
              step="0.001"
              placeholder="Tolérance (%)"
              value={form.allowed_variance_percent}
              onChange={(e) => handleChange("allowed_variance_percent", e.target.value)}
            />

            <select
              className="rounded-xl border p-3"
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value)}
            >
              <option value="draft">draft</option>
              <option value="approved">approved</option>
            </select>

            <input
              className="rounded-xl border p-3 xl:col-span-2"
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
            />
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
                <div
                  key={index}
                  className="grid grid-cols-1 gap-4 rounded-xl border p-4 md:grid-cols-5"
                >
                  <select
                    className="rounded-xl border p-3"
                    value={line.ingredient_product_id}
                    onChange={(e) =>
                      updateLine(index, "ingredient_product_id", e.target.value)
                    }
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

                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    className="rounded-xl bg-red-600 px-4 py-3 text-white"
                  >
                    Supprimer
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button className="rounded-xl bg-slate-900 px-4 py-3 text-white">
            {editingRecipeId
              ? "Mettre à jour la fiche technique"
              : "Enregistrer la fiche technique"}
          </button>
        </form>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold text-slate-800">
          Liste des fiches techniques
        </h2>

        <div className="space-y-3">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 xl:flex-row xl:items-center xl:justify-between"
            >
              <div>
                <div className="font-semibold text-slate-800">
                  {recipe.code} - {recipe.product?.name ?? "-"}
                </div>
                <div className="text-sm text-slate-500">
                  version {recipe.version} / statut : {recipe.status}
                </div>
                <div className="mt-1 text-sm font-medium text-slate-700">
                  Coût théorique : {formatMoney(recipe.theoretical_cost)} Ar
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => openRecipe(recipe.id)}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-white"
                >
                  Ouvrir
                </button>
                <button
                  onClick={() => startEditRecipe(recipe.id)}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-white"
                >
                  Modifier
                </button>
                <button
                  onClick={() => deleteRecipe(recipe.id)}
                  className="rounded-xl bg-red-600 px-4 py-2 text-white"
                >
                  Supprimer
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold text-slate-800">
              Détail recette : {selectedRecipe.code}
            </h2>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => startEditRecipe(selectedRecipe.id)}
                className="rounded-xl bg-amber-500 px-4 py-2 text-white"
              >
                Modifier
              </button>
              <button
                onClick={() => deleteRecipe(selectedRecipe.id)}
                className="rounded-xl bg-red-600 px-4 py-2 text-white"
              >
                Supprimer
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Produit fini</div>
              <div className="font-semibold text-slate-800">
                {selectedRecipe.product?.name ?? "-"}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Rendement</div>
              <div className="font-semibold text-slate-800">
                {formatQty(selectedRecipe.yield_quantity)} {selectedRecipe.yield_unit?.name ?? ""}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Durée standard</div>
              <div className="font-semibold text-slate-800">
                {selectedRecipe.standard_duration_minutes ?? 0} min
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Coût théorique</div>
              <div className="font-semibold text-slate-800">
                {formatMoney(selectedRecipe.theoretical_cost)} Ar
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
                    <td className="px-4 py-3">{formatQty(line.quantity)}</td>
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
