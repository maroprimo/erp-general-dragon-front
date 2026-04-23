import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import useReferences from "../hooks/useReferences";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

const INITIAL_FORM = {
  code: "",
  barcode: "",
  name: "",
  short_name: "",
  category_id: "",
  product_type: "",
  purchase_unit_id: "",
  stock_unit_id: "",
  production_unit_id: "",
  sale_unit_id: "",
  main_supplier_id: "",
  shelf_life_days: "",
  min_stock: "",
  max_stock: "",
  safety_stock: "",
  reorder_point: "",
  reorder_qty: "",
  storage_condition: "",
  origin: "",
  genre: "",
  category_type: "",
  nature: "",
  cold_type: "",
  valuation_method: "",
  default_storage_location_id: "",
  has_batch: false,
  has_expiry_date: false,
  is_active: true,
};

function buildProductImageUrl(product) {
  if (!product?.image_path) return "";

  const cleanPath = String(product.image_path)
    .replace(/^\/+/, "")
    .replace(/^storage\//, "")
    .replace(/^uploads\//, "");

  return `https://stock.dragonroyalmg.com/uploads/${cleanPath}`;
}

function getPaginationInfo(payload) {
  const root = payload?.data ?? payload;
  const nested = root?.data;

  const currentPage = Number(
    root?.current_page ?? nested?.current_page ?? 1
  );

  const lastPage = Number(
    root?.last_page ?? nested?.last_page ?? 1
  );

  const perPage = Number(
    root?.per_page ?? nested?.per_page ?? 0
  );

  const total = Number(
    root?.total ?? nested?.total ?? 0
  );

  const nextPageUrl = root?.next_page_url ?? nested?.next_page_url ?? null;

  return {
    currentPage: Number.isFinite(currentPage) && currentPage > 0 ? currentPage : 1,
    lastPage: Number.isFinite(lastPage) && lastPage > 0 ? lastPage : 1,
    perPage: Number.isFinite(perPage) && perPage > 0 ? perPage : 0,
    total: Number.isFinite(total) && total >= 0 ? total : 0,
    nextPageUrl,
  };
}

async function fetchAllCatalogProducts() {
  const perPage = 100;
  const firstRes = await api.get("/products-catalog", {
    params: { page: 1, per_page: perPage },
  });

  const firstItems = asArray(firstRes.data);
  const pageInfo = getPaginationInfo(firstRes.data);

  if (pageInfo.lastPage <= 1 && pageInfo.total <= firstItems.length) {
    return firstItems;
  }

  const collected = [...firstItems];
  const seenIds = new Set(firstItems.map((item) => item?.id).filter(Boolean));

  for (let page = 2; page <= pageInfo.lastPage; page += 1) {
    const res = await api.get("/products-catalog", {
      params: { page, per_page: perPage },
    });
    const items = asArray(res.data);

    items.forEach((item) => {
      const itemId = item?.id;
      if (itemId && seenIds.has(itemId)) return;
      if (itemId) seenIds.add(itemId);
      collected.push(item);
    });
  }

  if (pageInfo.total > 0 && collected.length >= pageInfo.total) {
    return collected;
  }

  let safety = 0;
  let currentPage = pageInfo.lastPage;
  let nextPageUrl = pageInfo.nextPageUrl;

  while (nextPageUrl && safety < 50) {
    safety += 1;
    currentPage += 1;

    const res = await api.get("/products-catalog", {
      params: { page: currentPage, per_page: perPage },
    });

    const items = asArray(res.data);
    if (!items.length) break;

    items.forEach((item) => {
      const itemId = item?.id;
      if (itemId && seenIds.has(itemId)) return;
      if (itemId) seenIds.add(itemId);
      collected.push(item);
    });

    const info = getPaginationInfo(res.data);
    nextPageUrl = info.nextPageUrl;
  }

  return collected;
}

export default function ProductsCatalog() {
  const { user } = useAuth();
  const { suppliers, units, loading } = useReferences();

  const canManage = ["pdg", "admin"].includes(user?.role);

  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);

  const [form, setForm] = useState(INITIAL_FORM);
  const [image, setImage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterUnitId, setFilterUnitId] = useState("");

  const isEditing = editingId !== null;

  const categoryMap = useMemo(() => {
    const map = new Map();
    categories.forEach((c) => map.set(Number(c.id), c));
    return map;
  }, [categories]);

  const unitMap = useMemo(() => {
    const map = new Map();
    units.forEach((u) => map.set(Number(u.id), u));
    return map;
  }, [units]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        [product.name, product.short_name, product.code, product.barcode]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));

      const matchesCategory =
        !filterCategoryId || String(product.category_id ?? "") === String(filterCategoryId);

      const matchesUnit =
        !filterUnitId ||
        String(product.stock_unit_id ?? "") === String(filterUnitId) ||
        String(product.purchase_unit_id ?? "") === String(filterUnitId);

      return matchesSearch && matchesCategory && matchesUnit;
    });
  }, [products, searchTerm, filterCategoryId, filterUnitId]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const pageNumbers = useMemo(() => {
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [currentPage, totalPages]);

  const loadData = async () => {
    try {
      const [catRes, locRes, allProducts] = await Promise.all([
        api.get("/references/categories"),
        api.get("/storage-zones"),
        fetchAllCatalogProducts(),
      ]);

      setCategories(asArray(catRes.data));
      setLocations(asArray(locRes.data));
      setProducts(allProducts);
    } catch (err) {
      console.error(err);
      toast.error("Erreur de chargement des produits");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage((prev) =>
      Math.min(prev, Math.max(1, Math.ceil(filteredProducts.length / pageSize)))
    );
  }, [filteredProducts.length, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategoryId, filterUnitId]);

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setImage(null);
    setEditingId(null);
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    setImage(null);

    setForm({
      code: product.code ?? "",
      barcode: product.barcode ?? "",
      name: product.name ?? "",
      short_name: product.short_name ?? "",
      category_id: product.category_id ? String(product.category_id) : "",
      product_type: product.product_type ?? "",
      purchase_unit_id: product.purchase_unit_id ? String(product.purchase_unit_id) : "",
      stock_unit_id: product.stock_unit_id ? String(product.stock_unit_id) : "",
      production_unit_id: product.production_unit_id ? String(product.production_unit_id) : "",
      sale_unit_id: product.sale_unit_id ? String(product.sale_unit_id) : "",
      main_supplier_id: product.main_supplier_id ? String(product.main_supplier_id) : "",
      shelf_life_days:
        product.shelf_life_days !== null && product.shelf_life_days !== undefined
          ? String(product.shelf_life_days)
          : "",
      min_stock:
        product.min_stock !== null && product.min_stock !== undefined
          ? String(product.min_stock)
          : "",
      max_stock:
        product.max_stock !== null && product.max_stock !== undefined
          ? String(product.max_stock)
          : "",
      safety_stock:
        product.safety_stock !== null && product.safety_stock !== undefined
          ? String(product.safety_stock)
          : "",
      reorder_point:
        product.reorder_point !== null && product.reorder_point !== undefined
          ? String(product.reorder_point)
          : "",
      reorder_qty:
        product.reorder_qty !== null && product.reorder_qty !== undefined
          ? String(product.reorder_qty)
          : "",
      storage_condition: product.storage_condition ?? "",
      origin: product.origin ?? "",
      genre: product.genre ?? "",
      category_type: product.category_type ?? "",
      nature: product.nature ?? "",
      cold_type: product.cold_type ?? "",
      valuation_method: product.valuation_method ?? "",
      default_storage_location_id: product.default_storage_location_id
        ? String(product.default_storage_location_id)
        : "",
      has_batch: Boolean(product.has_batch),
      has_expiry_date: Boolean(product.has_expiry_date),
      is_active: Boolean(product.is_active),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value ?? "");
      });

      formData.set("has_batch", form.has_batch ? "1" : "0");
      formData.set("has_expiry_date", form.has_expiry_date ? "1" : "0");
      formData.set("is_active", form.is_active ? "1" : "0");

      if (image) {
        formData.append("image", image);
      }

      let res;

      if (isEditing) {
        formData.append("_method", "PUT");
        res = await api.post(`/products-catalog/${editingId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        res = await api.post("/products-catalog", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      toast.success(
        res.data?.message || (isEditing ? "Produit modifié" : "Produit créé")
      );

      resetForm();
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message ||
          (isEditing ? "Erreur modification produit" : "Erreur création produit")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (product) => {
    if (!canManage) return;

    const ok = window.confirm(
      `Voulez-vous vraiment supprimer le produit "${product.name}" ?`
    );
    if (!ok) return;

    try {
      setDeletingId(product.id);
      const res = await api.delete(`/products-catalog/${product.id}`);
      toast.success(res.data?.message || "Produit supprimé");
      if (editingId === product.id) {
        resetForm();
      }
      loadData();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur suppression produit");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div className="p-6">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Gestion des Produits</h1>
        <p className="text-slate-500">Catalogue indépendant du POS achat.</p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {isEditing ? "Modifier le produit" : "Nouveau produit"}
            </h2>
            <p className="text-sm text-slate-500">
              Informations article, unités, stock et valorisation.
            </p>
          </div>

          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl bg-slate-200 px-4 py-2 text-slate-800"
            >
              Annuler
            </button>
          )}
        </div>

        <form
          onSubmit={submit}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <input
            className="rounded-xl border p-3"
            placeholder="Code"
            value={form.code}
            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
          />

          <input
            className="rounded-xl border p-3"
            placeholder="Code-barres"
            value={form.barcode}
            onChange={(e) => setForm((p) => ({ ...p, barcode: e.target.value }))}
          />

          <input
            className="rounded-xl border p-3"
            placeholder="Nom"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />

          <input
            className="rounded-xl border p-3"
            placeholder="Nom court"
            value={form.short_name}
            onChange={(e) => setForm((p) => ({ ...p, short_name: e.target.value }))}
          />

          <select
            className="rounded-xl border p-3"
            required
            value={form.product_type}
            onChange={(e) => setForm((p) => ({ ...p, product_type: e.target.value }))}
          >
            <option value="">Type de produit</option>
            <option value="storable">Stockable</option>
            <option value="consumable">Consommable</option>
            <option value="service">Service</option>
          </select>

          <select
            className="rounded-xl border p-3"
            required
            value={form.category_id}
            onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))}
          >
            <option value="">-- Choisir une catégorie --</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border p-3"
            required
            value={form.purchase_unit_id}
            onChange={(e) =>
              setForm((p) => ({ ...p, purchase_unit_id: e.target.value }))
            }
          >
            <option value="">Unité d'achat</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border p-3"
            required
            value={form.stock_unit_id}
            onChange={(e) =>
              setForm((p) => ({ ...p, stock_unit_id: e.target.value }))
            }
          >
            <option value="">Unité de stock</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border p-3"
            value={form.production_unit_id}
            onChange={(e) =>
              setForm((p) => ({ ...p, production_unit_id: e.target.value }))
            }
          >
            <option value="">Unité de production</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border p-3"
            value={form.sale_unit_id}
            onChange={(e) => setForm((p) => ({ ...p, sale_unit_id: e.target.value }))}
          >
            <option value="">Unité de vente</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border p-3"
            value={form.main_supplier_id}
            onChange={(e) =>
              setForm((p) => ({ ...p, main_supplier_id: e.target.value }))
            }
          >
            <option value="">Fournisseur principal</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.company_name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border p-3"
            value={form.default_storage_location_id}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                default_storage_location_id: e.target.value,
              }))
            }
          >
            <option value="">Emplacement par défaut</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border p-3"
            required
            value={form.valuation_method}
            onChange={(e) =>
              setForm((p) => ({ ...p, valuation_method: e.target.value }))
            }
          >
            <option value="">Méthode de valorisation</option>
            <option value="FIFO">FIFO</option>
            <option value="LIFO">LIFO</option>
            <option value="AVCO">AVCO</option>
          </select>

          <input
            className="rounded-xl border p-3"
            placeholder="Origine"
            value={form.origin}
            onChange={(e) => setForm((p) => ({ ...p, origin: e.target.value }))}
          />

          <input
            className="rounded-xl border p-3"
            placeholder="Genre"
            value={form.genre}
            onChange={(e) => setForm((p) => ({ ...p, genre: e.target.value }))}
          />

          <input
            className="rounded-xl border p-3"
            placeholder="Type catégorie"
            value={form.category_type}
            onChange={(e) =>
              setForm((p) => ({ ...p, category_type: e.target.value }))
            }
          />

          <input
            className="rounded-xl border p-3"
            placeholder="Nature"
            value={form.nature}
            onChange={(e) => setForm((p) => ({ ...p, nature: e.target.value }))}
          />

          <input
            className="rounded-xl border p-3"
            placeholder="Type froid"
            value={form.cold_type}
            onChange={(e) => setForm((p) => ({ ...p, cold_type: e.target.value }))}
          />

          <input
            className="rounded-xl border p-3"
            placeholder="Condition stockage"
            value={form.storage_condition}
            onChange={(e) =>
              setForm((p) => ({ ...p, storage_condition: e.target.value }))
            }
          />

          <input
            type="number"
            step="0.001"
            className="rounded-xl border p-3"
            placeholder="Durée de vie (jours)"
            value={form.shelf_life_days}
            onChange={(e) =>
              setForm((p) => ({ ...p, shelf_life_days: e.target.value }))
            }
          />

          <input
            type="number"
            step="0.001"
            className="rounded-xl border p-3"
            placeholder="Stock Min"
            value={form.min_stock}
            onChange={(e) => setForm((p) => ({ ...p, min_stock: e.target.value }))}
          />

          <input
            type="number"
            step="0.001"
            className="rounded-xl border p-3"
            placeholder="Stock Max"
            value={form.max_stock}
            onChange={(e) => setForm((p) => ({ ...p, max_stock: e.target.value }))}
          />

          <input
            type="number"
            step="0.001"
            className="rounded-xl border p-3"
            placeholder="Stock sécurité"
            value={form.safety_stock}
            onChange={(e) =>
              setForm((p) => ({ ...p, safety_stock: e.target.value }))
            }
          />

          <input
            type="number"
            step="0.001"
            className="rounded-xl border p-3"
            placeholder="Point de commande"
            value={form.reorder_point}
            onChange={(e) =>
              setForm((p) => ({ ...p, reorder_point: e.target.value }))
            }
          />

          <input
            type="number"
            step="0.001"
            className="rounded-xl border p-3"
            placeholder="Qté réappro"
            value={form.reorder_qty}
            onChange={(e) =>
              setForm((p) => ({ ...p, reorder_qty: e.target.value }))
            }
          />

          <div className="flex flex-col justify-center rounded-xl border border-dashed p-2">
            <span className="mb-1 text-xs text-gray-500">Image du produit</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
            />
          </div>

          <label className="flex items-center gap-2 rounded-xl border p-3">
            <input
              type="checkbox"
              checked={form.has_batch}
              onChange={(e) =>
                setForm((p) => ({ ...p, has_batch: e.target.checked }))
              }
            />
            Gestion lot
          </label>

          <label className="flex items-center gap-2 rounded-xl border p-3">
            <input
              type="checkbox"
              checked={form.has_expiry_date}
              onChange={(e) =>
                setForm((p) => ({ ...p, has_expiry_date: e.target.checked }))
              }
            />
            Date expiration
          </label>

          <label className="flex items-center gap-2 rounded-xl border p-3">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm((p) => ({ ...p, is_active: e.target.checked }))
              }
            />
            Produit actif
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-slate-900 px-4 py-3 text-white transition hover:bg-slate-800 disabled:opacity-60 xl:col-span-4"
          >
            {submitting
              ? "Enregistrement..."
              : isEditing
              ? "Mettre à jour le produit"
              : "Enregistrer le produit"}
          </button>
        </form>
      </div>

      <div className="rounded-2xl bg-white shadow">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Catalogue produits</h2>
              <p className="text-sm text-slate-500">
                {filteredProducts.length} résultat{filteredProducts.length > 1 ? "s" : ""}
                {" "}sur {products.length} produit{products.length > 1 ? "s" : ""} • Affichage compact et paginé
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-sm text-slate-500">Par page</span>
              <select
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(240px,1.4fr)_minmax(180px,1fr)_minmax(180px,1fr)]">
            <input
              type="text"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
              placeholder="Rechercher par nom, nom court, code ou code-barres"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
            >
              <option value="">Toutes les catégories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
              value={filterUnitId}
              onChange={(e) => setFilterUnitId(e.target.value)}
            >
              <option value="">Toutes les unités</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="hidden grid-cols-[72px_minmax(180px,2fr)_minmax(96px,0.9fr)_minmax(120px,1fr)_minmax(100px,0.85fr)_minmax(100px,0.85fr)_88px_84px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 xl:grid">
          <div>Image</div>
          <div>Produit</div>
          <div>Code</div>
          <div>Catégorie</div>
          <div>Unité achat</div>
          <div>Unité stock</div>
          <div>Statut</div>
          <div className="text-right">Actions</div>
        </div>

        <div className="divide-y divide-slate-100">
          {paginatedProducts.map((product) => {
            const imageUrl = buildProductImageUrl(product);
            const category = categoryMap.get(Number(product.category_id));
            const purchaseUnit = unitMap.get(Number(product.purchase_unit_id));
            const stockUnit = unitMap.get(Number(product.stock_unit_id));

            return (
              <div
                key={product.id}
                className="px-3 py-3 transition hover:bg-slate-50 sm:px-4"
              >
                <div className="flex items-start gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-[72px] sm:w-[72px]">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                        Aucune image
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-3 xl:grid xl:grid-cols-[minmax(180px,2fr)_minmax(96px,0.9fr)_minmax(120px,1fr)_minmax(100px,0.85fr)_minmax(100px,0.85fr)_88px_84px] xl:items-center">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-800 sm:text-base">
                          {product.name}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-slate-500 sm:text-xs">
                          <span className="rounded-full bg-slate-100 px-2 py-1">
                            {product.origin || "-"}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1">
                            {product.genre || "-"}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1">
                            {product.nature || "-"}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1">
                            {product.cold_type || "-"}
                          </span>
                        </div>
                      </div>

                      <div className="text-sm text-slate-600">
                        <span className="mr-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 xl:hidden">
                          Code
                        </span>
                        {product.code || "-"}
                      </div>

                      <div className="text-sm text-slate-600">
                        <span className="mr-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 xl:hidden">
                          Catégorie
                        </span>
                        {category?.name || product.category?.name || "-"}
                      </div>

                      <div className="text-sm text-slate-600">
                        <span className="mr-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 xl:hidden">
                          Unité achat
                        </span>
                        {purchaseUnit?.name || product.purchaseUnit?.name || "-"}
                      </div>

                      <div className="text-sm text-slate-600">
                        <span className="mr-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 xl:hidden">
                          Unité stock
                        </span>
                        {stockUnit?.name || product.stockUnit?.name || "-"}
                      </div>

                      <div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            product.is_active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {product.is_active ? "Actif" : "Inactif"}
                        </span>
                      </div>

                      {canManage ? (
                        <div className="flex shrink-0 items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(product)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700"
                            title="Modifier"
                            aria-label={`Modifier ${product.name}`}
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                              <path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25zm17.71-10.04a1.003 1.003 0 0 0 0-1.42l-2.5-2.5a1.003 1.003 0 0 0-1.42 0L14.96 5.12l3.75 3.75 1.99-1.66z" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(product)}
                            disabled={deletingId === product.id}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-white transition hover:bg-red-700 disabled:opacity-60"
                            title="Supprimer"
                            aria-label={`Supprimer ${product.name}`}
                          >
                            {deletingId === product.id ? (
                              <span className="text-xs font-bold">...</span>
                            ) : (
                              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                                <path d="M6 7h12l-1 14H7L6 7zm3-3h6l1 2h4v2H4V6h4l1-2z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {paginatedProducts.length === 0 && (
            <div className="p-6 text-center text-sm text-slate-500">
              Aucun produit à afficher pour ces critères.
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">
            Affichage {(currentPage - 1) * pageSize + (paginatedProducts.length ? 1 : 0)} à{" "}
            {(currentPage - 1) * pageSize + paginatedProducts.length} sur {filteredProducts.length}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              «
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Préc.
            </button>

            {pageNumbers.map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`min-w-[40px] rounded-lg px-3 py-2 text-sm font-medium ${
                  currentPage === page
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 text-slate-600"
                }`}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Suiv.
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}