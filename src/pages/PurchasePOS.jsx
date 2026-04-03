import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { formatQty, formatMoney } from "../utils/formatters";

function QuickProductModal({ open, onClose, categories, units, onCreated }) {
  const [form, setForm] = useState({
    code: "",
    name: "",
    category_id: "",
    product_type: "raw_material",
    purchase_unit_id: "",
    sale_unit_id: "",
    stock_unit_id: "",
    is_active: true,
  });

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...form,
        category_id: form.category_id ? Number(form.category_id) : null,
        purchase_unit_id: form.purchase_unit_id ? Number(form.purchase_unit_id) : null,
        sale_unit_id: form.sale_unit_id ? Number(form.sale_unit_id) : null,
        stock_unit_id: form.stock_unit_id ? Number(form.stock_unit_id) : null,
        is_active: Boolean(form.is_active),
      };

      const res = await api.post("/purchase-pos/quick-product", payload);
      toast.success(res.data.message || "Produit créé");
      onCreated(res.data.data);
      onClose();
      setForm({
        code: "",
        name: "",
        category_id: "",
        product_type: "raw_material",
        purchase_unit_id: "",
        sale_unit_id: "",
        stock_unit_id: "",
        is_active: true,
      });
    } catch (err) {
      console.error(err);
      toast.error("Erreur création produit");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-4 text-2xl font-bold text-slate-800">Nouveau produit</h2>

        <form onSubmit={submit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input
            className="rounded-xl border p-3"
            placeholder="Code produit"
            value={form.code}
            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
          />

          <input
            className="rounded-xl border p-3"
            placeholder="Nom produit"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />

          <select
            className="rounded-xl border p-3"
            value={form.category_id}
            onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))}
          >
            <option value="">Catégorie</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <input
            className="rounded-xl border p-3"
            placeholder="Type produit"
            value={form.product_type}
            onChange={(e) => setForm((p) => ({ ...p, product_type: e.target.value }))}
          />

          <select
            className="rounded-xl border p-3"
            value={form.purchase_unit_id}
            onChange={(e) => setForm((p) => ({ ...p, purchase_unit_id: e.target.value }))}
          >
            <option value="">Unité achat</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border p-3"
            value={form.stock_unit_id}
            onChange={(e) => setForm((p) => ({ ...p, stock_unit_id: e.target.value }))}
          >
            <option value="">Unité stock</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border p-3"
            value={form.sale_unit_id}
            onChange={(e) => setForm((p) => ({ ...p, sale_unit_id: e.target.value }))}
          >
            <option value="">Unité vente</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
            />
            Produit actif
          </label>

          <div className="md:col-span-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-300 px-4 py-2 text-slate-800"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-white"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PurchasePOS() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [sites, setSites] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [units, setUnits] = useState([]);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  const [header, setHeader] = useState({
    supplier_id: "",
    site_id: "",
    warehouse_id: "",
    expected_delivery_at: "",
    supplier_invoice_ref: "",
    notes: "",
    document_mode: "bc",
  });

  const loadReferences = async () => {
    try {
      const [
        catRes,
        supRes,
        siteRes,
        whRes,
        unitRes,
      ] = await Promise.all([
        api.get("/references/categories"),
        api.get("/references/suppliers"),
        api.get("/references/sites"),
        api.get("/references/warehouses"),
        api.get("/references/units"),
      ]);

      setCategories(catRes.data ?? []);
      setSuppliers(supRes.data ?? []);
      setSites(siteRes.data ?? []);
      setWarehouses(whRes.data ?? []);
      setUnits(unitRes.data ?? []);

      const defaultSite = (siteRes.data ?? []).find((s) => s.is_default);
      if (defaultSite) {
        setHeader((prev) => ({ ...prev, site_id: String(defaultSite.id) }));
      }
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les références");
    }
  };

  const loadProducts = async (categoryId = "", searchValue = "") => {
    try {
      const res = await api.get("/references/products-by-category", {
        params: {
          category_id: categoryId || undefined,
          search: searchValue || undefined,
        },
      });
      setProducts(res.data ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les produits");
    }
  };

  useEffect(() => {
    loadReferences();
    loadProducts();
  }, []);

  useEffect(() => {
    loadProducts(selectedCategory, search);
  }, [selectedCategory, search]);

  const addToCart = (product) => {
    const exists = cart.find((line) => line.product_id === product.id);

    if (exists) {
      setCart((prev) =>
        prev.map((line) =>
          line.product_id === product.id
            ? { ...line, quantity: Number(line.quantity) + 1 }
            : line
        )
      );
    } else {
      setCart((prev) => [
        ...prev,
      {
        product_id: product.id,
        code: product.code,
        name: product.name,
        quantity: 1,
        unit_price: Number(product.last_purchase_price ?? 0),
        last_purchase_price: Number(product.last_purchase_price ?? 0),
        last_purchase_date: product.last_purchase_date ?? null,
        last_supplier_name: product.last_supplier_name ?? null,
      },
      ]);
    }
  };

  const updateCartLine = (productId, field, value) => {
    setCart((prev) =>
      prev.map((line) =>
        line.product_id === productId ? { ...line, [field]: value } : line
      )
    );
  };

  const removeCartLine = (productId) => {
    setCart((prev) => prev.filter((line) => line.product_id !== productId));
  };

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, line) => {
      return sum + Number(line.quantity || 0) * Number(line.unit_price || 0);
    }, 0);
  }, [cart]);

  const submitDocument = async () => {
    if (!header.supplier_id || !header.site_id) {
      toast.error("Choisir le fournisseur et le site");
      return;
    }

    if (cart.length === 0) {
      toast.error("Le panier est vide");
      return;
    }

    try {
      const payload = {
        supplier_id: Number(header.supplier_id),
        site_id: Number(header.site_id),
        warehouse_id: header.warehouse_id ? Number(header.warehouse_id) : null,
        document_mode: header.document_mode,
        expected_delivery_at: header.expected_delivery_at || null,
        supplier_invoice_ref: header.supplier_invoice_ref || null,
        notes: header.notes || "",
        lines: cart.map((line) => ({
          product_id: Number(line.product_id),
          quantity: Number(line.quantity),
          unit_price: Number(line.unit_price),
        })),
      };

      const res = await api.post("/purchase-pos/create-document", payload);
      toast.success(res.data.message || "Document créé");

      setCart([]);
      setHeader((prev) => ({
        ...prev,
        expected_delivery_at: "",
        supplier_invoice_ref: "",
        notes: "",
      }));
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la validation de l'achat");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Achat type POS</h1>
        <p className="text-slate-500">
          Catégories à gauche, articles au centre, panier à droite.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <select
            className="rounded-xl border p-3"
            value={header.supplier_id}
            onChange={(e) => setHeader((p) => ({ ...p, supplier_id: e.target.value }))}
          >
            <option value="">Fournisseur</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.company_name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border p-3"
            value={header.site_id}
            onChange={(e) => setHeader((p) => ({ ...p, site_id: e.target.value }))}
          >
            <option value="">Site</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border p-3"
            value={header.warehouse_id}
            onChange={(e) => setHeader((p) => ({ ...p, warehouse_id: e.target.value }))}
          >
            <option value="">Dépôt réception</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border p-3"
            value={header.document_mode}
            onChange={(e) => setHeader((p) => ({ ...p, document_mode: e.target.value }))}
          >
            <option value="bc">Créer BC</option>
            <option value="br_direct">BR direct</option>
          </select>

          <input
            className="rounded-xl border p-3"
            type="datetime-local"
            value={header.expected_delivery_at}
            onChange={(e) => setHeader((p) => ({ ...p, expected_delivery_at: e.target.value }))}
          />

          <input
            className="rounded-xl border p-3"
            placeholder="Réf facture fournisseur"
            value={header.supplier_invoice_ref}
            onChange={(e) => setHeader((p) => ({ ...p, supplier_invoice_ref: e.target.value }))}
          />
        </div>

        <input
          className="mt-4 w-full rounded-xl border p-3"
          placeholder="Notes"
          value={header.notes}
          onChange={(e) => setHeader((p) => ({ ...p, notes: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Gauche : catégories */}
        <div className="rounded-2xl bg-white p-4 shadow xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Catégories</h2>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setSelectedCategory("")}
              className={`w-full rounded-xl px-3 py-2 text-left ${
                selectedCategory === "" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800"
              }`}
            >
              Toutes
            </button>

            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(String(category.id))}
                className={`w-full rounded-xl px-3 py-2 text-left ${
                  String(selectedCategory) === String(category.id)
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Centre : produits */}
        <div className="rounded-2xl bg-white p-4 shadow xl:col-span-6">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-bold text-slate-800">Articles</h2>

            <div className="flex gap-2">
              <input
                className="rounded-xl border p-3"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                onClick={() => setModalOpen(true)}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-white"
              >
                Nouveau produit
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="rounded-2xl border border-slate-200 p-4 text-left hover:bg-slate-50"
              >
                <div className="font-semibold text-slate-800">{product.name}</div>
                <div className="text-sm text-slate-500">{product.code}</div>
                <div className="mt-2 text-xs text-slate-400">
                  {product.category?.name ?? "Sans catégorie"}
                </div>

                <div className="mt-2 text-sm text-slate-700">
                  Dernier achat : <strong>{formatMoney(Number(product.last_purchase_price) ?? 0)} Ar</strong>
                </div>

                <div className="text-xs text-slate-400">
                  {product.last_supplier_name ?? "Fournisseur inconnu"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Droite : panier */}
        <div className="rounded-2xl bg-white p-4 shadow xl:col-span-4">
          <h2 className="mb-4 text-lg font-bold text-slate-800">Panier achat</h2>

          <div className="space-y-4">
            {cart.map((line) => (
              <div key={line.product_id} className="rounded-xl border border-slate-200 p-3">
                <div className="font-semibold text-slate-800">{line.name}</div>
                <div className="text-xs text-slate-500">{line.code}</div>
                <div className="text-xs text-slate-500">
                  Dernier achat : {Number(line.last_purchase_price ?? 0)} Ar
                </div>

                <div className="text-xs text-slate-400">
                  {line.last_supplier_name ?? ""}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    className="rounded border p-2"
                    placeholder="Qté"
                    value={line.quantity}
                    onChange={(e) => updateCartLine(line.product_id, "quantity", e.target.value)}
                  />
                  <input
                    type="number"
                    className="rounded border p-2"
                    placeholder="PU"
                    value={line.unit_price}
                    onChange={(e) => updateCartLine(line.product_id, "unit_price", e.target.value)}
                  />
                  {Number(line.unit_price || 0) !== Number(line.last_purchase_price || 0) && (
                      <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
                        Prix différent du dernier achat
                      </div>
                    )}
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <div className="font-bold text-slate-800">
                    {formatMoney(Number(line.quantity || 0) * Number(line.unit_price || 0))} Ar
                  </div>
                  <button
                    onClick={() => removeCartLine(line.product_id)}
                    className="rounded-lg bg-red-600 px-3 py-1 text-white"
                  >
                    Retirer
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl bg-slate-100 p-4">
            <div className="text-sm text-slate-500">Montant total</div>
            <div className="text-2xl font-bold text-slate-800">{formatMoney(totalAmount)} Ar</div>
          </div>

          <button
            onClick={submitDocument}
            className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-white"
          >
            Valider l'achat
          </button>
        </div>
      </div>

      <QuickProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        categories={categories}
        units={units}
        onCreated={(product) => {
          loadProducts(selectedCategory, search);
          addToCart(product);
        }}
      />
    </div>
  );
}