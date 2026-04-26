import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

const emptyForm = {
  product_id: "",
  selling_name: "",
  menu_category: "",
  sale_price: "",
  preparation_station: "",
  available_counter: true,
  available_room: true,
  available_delivery: true,
  is_active: true,
  sort_order: 0,
};

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

const MENU_CATEGORY_SUGGESTIONS = [
  "Pizza",
  "Poulet",
  "Kebab",
  "Sandwich",
  "Boisson",
  "Dessert",
  "Snack",
  "Glace",
];

const STATION_SUGGESTIONS = [
  "Cuisine Pizza",
  "Cuisine Chaude",
  "Bar / Boissons",
  "Snack",
  "Dessert",
];

export default function PosMenuItems() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [menuItems, setMenuItems] = useState([]);
  const [products, setProducts] = useState([]);

  const [form, setForm] = useState(emptyForm);

  const [productSearch, setProductSearch] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    menu_category: "",
    is_active: "",
  });

  const loadProducts = async () => {
    const candidates = [
      "/products-catalog",
      "/products",
      "/references/products-by-category",
    ];

    for (const url of candidates) {
      try {
        const res = await api.get(url, {
          params: { per_page: 500 },
        });
        const rows = asArray(res.data);

        if (rows.length > 0) {
          return rows;
        }
      } catch (err) {
        console.error(`Erreur chargement ${url}`, err);
      }
    }

    return [];
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const [menuRes, productsRows] = await Promise.all([
        api.get("/pos/menu-items"),
        loadProducts(),
      ]);

      setMenuItems(asArray(menuRes.data));
      setProducts(productsRows);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger la carte POS");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateForm = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setProductSearch("");
  };

  const selectedProduct = useMemo(() => {
    return (products ?? []).find(
      (product) => Number(product.id) === Number(form.product_id)
    );
  }, [products, form.product_id]);

  const visibleProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();

    return (products ?? [])
      .filter((product) => {
        const haystack = [
          product.name,
          product.code,
          product.category?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return term ? haystack.includes(term) : true;
      })
      .slice(0, 12);
  }, [products, productSearch]);

  const filteredMenuItems = useMemo(() => {
    return (menuItems ?? []).filter((item) => {
      const searchOk = filters.search
        ? [
            item.selling_name,
            item.menu_category,
            item.preparation_station,
            item.product?.name,
            item.product?.code,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(filters.search.toLowerCase())
        : true;

      const categoryOk = filters.menu_category
        ? String(item.menu_category || "") === String(filters.menu_category)
        : true;

      const activeOk =
        filters.is_active === ""
          ? true
          : Boolean(item.is_active) === (filters.is_active === "true");

      return searchOk && categoryOk && activeOk;
    });
  }, [menuItems, filters]);

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      product_id: item.product_id ? String(item.product_id) : "",
      selling_name: item.selling_name || "",
      menu_category: item.menu_category || "",
      sale_price: item.sale_price ?? "",
      preparation_station: item.preparation_station || "",
      available_counter: Boolean(item.available_counter),
      available_room: Boolean(item.available_room),
      available_delivery: Boolean(item.available_delivery),
      is_active: Boolean(item.is_active),
      sort_order: item.sort_order ?? 0,
    });

    setProductSearch(item.product?.name || item.selling_name || "");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!form.product_id) {
      toast.error("Choisir un produit");
      return;
    }

    if (!form.menu_category) {
      toast.error("Choisir une catégorie POS");
      return;
    }

    if (Number(form.sale_price || 0) < 0) {
      toast.error("Le prix de vente est invalide");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        product_id: Number(form.product_id),
        selling_name: form.selling_name || null,
        menu_category: form.menu_category,
        sale_price: Number(form.sale_price || 0),
        preparation_station: form.preparation_station || null,
        available_counter: Boolean(form.available_counter),
        available_room: Boolean(form.available_room),
        available_delivery: Boolean(form.available_delivery),
        is_active: Boolean(form.is_active),
        sort_order: Number(form.sort_order || 0),
      };

      if (editingId) {
        const res = await api.post(`/pos/menu-items/${editingId}`, payload);
        toast.success(res.data?.message || "Article POS mis à jour");
      } else {
        const res = await api.post("/pos/menu-items", payload);
        toast.success(res.data?.message || "Article POS créé");
      }

      resetForm();
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Erreur lors de l'enregistrement POS"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const removeMenuItem = async (item) => {
    const ok = window.confirm(
      `Voulez-vous vraiment supprimer l'article POS "${item.selling_name || item.product?.name}" ?`
    );

    if (!ok) return;

    try {
      const res = await api.delete(`/pos/menu-items/${item.id}`);
      toast.success(res.data?.message || "Article POS supprimé");

      if (editingId === item.id) {
        resetForm();
      }

      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur suppression article POS");
    }
  };

  if (loading) {
    return <div className="p-6">Chargement de la carte POS...</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <div className="xl:col-span-5">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-3xl font-bold text-slate-800">
              {editingId ? "Modifier un article POS" : "Ajouter un article POS"}
            </h1>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl bg-slate-200 px-4 py-2 text-slate-700"
              >
                Annuler
              </button>
            )}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="rounded-2xl border p-4">
              <div className="mb-3 text-sm font-semibold text-slate-700">
                Sélection produit stock
              </div>

              <input
                className="mb-3 w-full rounded-xl border p-3"
                placeholder="Rechercher un produit stock..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />

              <div className="max-h-72 space-y-2 overflow-y-auto">
                {visibleProducts.map((product) => {
                  const isSelected =
                    Number(form.product_id) === Number(product.id);

                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => updateForm("product_id", String(product.id))}
                      className={`w-full rounded-xl border p-3 text-left ${
                        isSelected
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-800"
                      }`}
                    >
                      <div className="font-semibold">{product.name}</div>
                      <div className="text-xs opacity-80">
                        {product.code || "-"} • {product.category?.name || "Sans catégorie"}
                      </div>
                    </button>
                  );
                })}

                {visibleProducts.length === 0 && (
                  <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    Aucun produit trouvé.
                  </div>
                )}
              </div>
            </div>

            {selectedProduct && (
              <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
                Produit sélectionné : <strong>{selectedProduct.name}</strong>
                {selectedProduct.code ? ` (${selectedProduct.code})` : ""}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                className="rounded-xl border p-3"
                placeholder="Nom affiché vente"
                value={form.selling_name}
                onChange={(e) => updateForm("selling_name", e.target.value)}
              />

              <input
                className="rounded-xl border p-3"
                placeholder="Prix de vente *"
                type="number"
                min="0"
                step="0.01"
                value={form.sale_price}
                onChange={(e) => updateForm("sale_price", e.target.value)}
                required
              />

              <input
                className="rounded-xl border p-3"
                list="menu-categories-list"
                placeholder="Catégorie POS *"
                value={form.menu_category}
                onChange={(e) => updateForm("menu_category", e.target.value)}
                required
              />

              <input
                className="rounded-xl border p-3"
                list="station-list"
                placeholder="Poste préparation"
                value={form.preparation_station}
                onChange={(e) =>
                  updateForm("preparation_station", e.target.value)
                }
              />

              <input
                className="rounded-xl border p-3 md:col-span-2"
                placeholder="Ordre d'affichage"
                type="number"
                min="0"
                step="1"
                value={form.sort_order}
                onChange={(e) => updateForm("sort_order", e.target.value)}
              />
            </div>

            <datalist id="menu-categories-list">
              {MENU_CATEGORY_SUGGESTIONS.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>

            <datalist id="station-list">
              {STATION_SUGGESTIONS.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 rounded-xl border p-3">
                <input
                  type="checkbox"
                  checked={Boolean(form.available_counter)}
                  onChange={(e) =>
                    updateForm("available_counter", e.target.checked)
                  }
                />
                Disponible comptoir
              </label>

              <label className="flex items-center gap-2 rounded-xl border p-3">
                <input
                  type="checkbox"
                  checked={Boolean(form.available_room)}
                  onChange={(e) =>
                    updateForm("available_room", e.target.checked)
                  }
                />
                Disponible salle
              </label>

              <label className="flex items-center gap-2 rounded-xl border p-3">
                <input
                  type="checkbox"
                  checked={Boolean(form.available_delivery)}
                  onChange={(e) =>
                    updateForm("available_delivery", e.target.checked)
                  }
                />
                Disponible livraison
              </label>

              <label className="flex items-center gap-2 rounded-xl border p-3">
                <input
                  type="checkbox"
                  checked={Boolean(form.is_active)}
                  onChange={(e) => updateForm("is_active", e.target.checked)}
                />
                Article actif
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-slate-900 px-4 py-3 text-white disabled:opacity-60"
              >
                {submitting
                  ? "Enregistrement..."
                  : editingId
                  ? "Mettre à jour"
                  : "Créer article POS"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl bg-slate-200 px-4 py-3 text-slate-700"
              >
                Réinitialiser
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="xl:col-span-7">
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-2xl font-bold text-slate-800">
            Carte POS configurée
          </h2>

          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              className="rounded-xl border p-3"
              placeholder="Recherche..."
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
            />

            <select
              className="rounded-xl border p-3"
              value={filters.menu_category}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, menu_category: e.target.value }))
              }
            >
              <option value="">Toutes les catégories</option>
              {MENU_CATEGORY_SUGGESTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border p-3"
              value={filters.is_active}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, is_active: e.target.value }))
              }
            >
              <option value="">Tous</option>
              <option value="true">Actifs</option>
              <option value="false">Inactifs</option>
            </select>
          </div>

          <div className="space-y-3">
            {filteredMenuItems.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Aucun article POS configuré.
              </div>
            )}

            {filteredMenuItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 rounded-xl border p-4 md:flex-row md:items-center"
              >
                <div className="flex-1">
                  <div className="font-semibold text-slate-800">
                    {item.selling_name || item.product?.name || "-"}
                  </div>

                  <div className="text-sm text-slate-500">
                    Produit stock : {item.product?.name || "-"}
                    {item.product?.code ? ` • ${item.product.code}` : ""}
                  </div>

                  <div className="mt-1 flex flex-wrap gap-2">
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {item.menu_category || "Sans catégorie"}
                    </span>

                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {Number(item.sale_price || 0).toLocaleString("fr-FR")} Ar
                    </span>

                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {item.preparation_station || "Cuisine"}
                    </span>

                    {item.available_counter && (
                      <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-700">
                        Comptoir
                      </span>
                    )}

                    {item.available_room && (
                      <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                        Salle
                      </span>
                    )}

                    {item.available_delivery && (
                      <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-700">
                        Livraison
                      </span>
                    )}

                    <span
                      className={`rounded-lg px-2 py-1 text-xs ${
                        item.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.is_active ? "Actif" : "Inactif"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(item)}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-white"
                  >
                    Modifier
                  </button>

                  <button
                    onClick={() => removeMenuItem(item)}
                    className="rounded-xl bg-red-600 px-4 py-2 text-white"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}