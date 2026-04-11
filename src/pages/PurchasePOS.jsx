import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { formatMoney } from "../utils/formatters";
import { useAuth } from "../context/AuthContext";

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function generateDocumentNumber(prefix) {
  const now = new Date();

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const rand = Math.floor(100 + Math.random() * 900);

  return `${prefix}-${yyyy}${mm}${dd}-${hh}${mi}${ss}-${rand}`;
}

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

  useEffect(() => {
    if (!open) {
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
    }
  }, [open]);

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
      toast.success(res.data?.message || "Produit créé");
      onCreated(res.data?.data);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur création produit");
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
  const { user } = useAuth();

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

  const [loadingRefs, setLoadingRefs] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [header, setHeader] = useState({
    supplier_id: "",
    site_id: "",
    warehouse_id: "",
    expected_delivery_at: "",
    due_date: "",
    supplier_invoice_ref: "",
    notes: "",
    document_mode: "bc",
  });

  const currentSite = useMemo(() => {
    return sites.find((s) => Number(s.id) === Number(header.site_id)) || null;
  }, [sites, header.site_id]);

  const siteWarehouses = useMemo(() => {
    if (!header.site_id) return warehouses;
    return warehouses.filter(
      (warehouse) => Number(warehouse.site_id) === Number(header.site_id)
    );
  }, [warehouses, header.site_id]);

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, line) => {
      return sum + Number(line.quantity || 0) * Number(line.unit_price || 0);
    }, 0);
  }, [cart]);

  const loadReferences = async () => {
    try {
      setLoadingRefs(true);

      const [catRes, supRes, siteRes, whRes, unitRes] = await Promise.all([
        api.get("/references/categories"),
        api.get("/references/suppliers"),
        api.get("/sites"),
        api.get("/warehouses"),
        api.get("/units"),
      ]);

      const categoriesData = asArray(catRes.data);
      const suppliersData = asArray(supRes.data);
      const sitesData = asArray(siteRes.data);
      const warehousesData = asArray(whRes.data);
      const unitsData = asArray(unitRes.data);

      setCategories(categoriesData);
      setSuppliers(suppliersData);
      setSites(sitesData);
      setWarehouses(warehousesData);
      setUnits(unitsData);

      const defaultSite =
        sitesData.find((s) => Number(s.id) === Number(user?.site_id)) ||
        sitesData.find((s) => s.is_default) ||
        sitesData[0] ||
        null;

      const defaultWarehouse =
        warehousesData.find(
          (w) =>
            Number(w.site_id) === Number(defaultSite?.id) &&
            Number(w.id) === Number(defaultSite?.default_warehouse_id)
        ) ||
        warehousesData.find((w) => Number(w.site_id) === Number(defaultSite?.id)) ||
        null;

      setHeader((prev) => ({
        ...prev,
        site_id: defaultSite?.id ? String(defaultSite.id) : "",
        warehouse_id: defaultWarehouse?.id ? String(defaultWarehouse.id) : "",
      }));
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les références");
    } finally {
      setLoadingRefs(false);
    }
  };

  const loadProducts = async (categoryId = "", searchValue = "") => {
    try {
      setLoadingProducts(true);

      const res = await api.get("/references/products-by-category", {
        params: {
          category_id: categoryId || undefined,
          search: searchValue || undefined,
        },
      });

      setProducts(asArray(res.data));
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les produits");
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadReferences();
  }, []);

  useEffect(() => {
    loadProducts(selectedCategory, search);
  }, [selectedCategory, search]);

  useEffect(() => {
    if (!header.site_id) return;

    const stillValid = siteWarehouses.some(
      (warehouse) => Number(warehouse.id) === Number(header.warehouse_id)
    );

    if (!stillValid) {
      const fallbackWarehouse =
        siteWarehouses.find(
          (w) => Number(w.id) === Number(currentSite?.default_warehouse_id)
        ) ||
        siteWarehouses[0] ||
        null;

      setHeader((prev) => ({
        ...prev,
        warehouse_id: fallbackWarehouse?.id ? String(fallbackWarehouse.id) : "",
      }));
    }
  }, [header.site_id, siteWarehouses, currentSite]);

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

  const resetDocumentFields = () => {
    setCart([]);
    setHeader((prev) => ({
      ...prev,
      expected_delivery_at: "",
      due_date: "",
      supplier_invoice_ref: "",
      notes: "",
      document_mode: "bc",
    }));
  };

  const submitDocument = async () => {
    if (!header.supplier_id) {
      toast.error("Choisir le fournisseur");
      return;
    }

    if (!header.site_id) {
      toast.error("Choisir le site");
      return;
    }

    if (cart.length === 0) {
      toast.error("Le panier est vide");
      return;
    }

    const invalidLine = cart.find(
      (line) => Number(line.quantity || 0) <= 0 || Number(line.unit_price || 0) < 0
    );

    if (invalidLine) {
      toast.error("Corriger les quantités et prix du panier");
      return;
    }

    if (
      (header.document_mode === "br_direct") &&
      !header.warehouse_id
    ) {
      toast.error("Choisir le dépôt pour le BR direct");
      return;
    }

    try {
      setSubmitting(true);

      if (header.document_mode === "bc") {
        const payload = {
          order_number: generateDocumentNumber("BC"),
          supplier_id: Number(header.supplier_id),
          site_id: Number(header.site_id),
          status: "pending",
          order_date: new Date().toISOString(),
          expected_date: header.expected_delivery_at || null,
          notes: header.notes || "",
          lines: cart.map((line) => ({
            product_id: Number(line.product_id),
            ordered_quantity: Number(line.quantity),
            unit_cost: Number(line.unit_price),
          })),
        };

        const res = await api.post("/purchase-orders", payload);
        const orderNumber =
          res.data?.data?.order_number || res.data?.order_number || payload.order_number;
        toast.success(`Bon de commande créé : ${orderNumber}`);
      }

      if (header.document_mode === "br_direct") {
        const payload = {
          receipt_number: generateDocumentNumber("BR"),
          purchase_order_id: null,
          supplier_id: Number(header.supplier_id),
          source_type: "purchase_pos_direct",
          site_id: Number(header.site_id),
          warehouse_id: Number(header.warehouse_id),
          status: "received",
          supplier_invoice_ref: header.supplier_invoice_ref || null,
          document_date: new Date().toISOString(),
          received_at: new Date().toISOString(),
          received_by: user?.id ? Number(user.id) : null,
          notes: header.notes || "",
          lines: cart.map((line) => ({
            product_id: Number(line.product_id),
            received_quantity: Number(line.quantity),
            accepted_quantity: Number(line.quantity),
            rejected_quantity: 0,
            unit_cost: Number(line.unit_price),
            notes: line.last_supplier_name
              ? `Dernier fournisseur: ${line.last_supplier_name}`
              : null,
          })),
        };

        const res = await api.post("/goods-receipts", payload);
        const receiptNumber =
          res.data?.data?.receipt_number ||
          res.data?.receipt_number ||
          payload.receipt_number;
        toast.success(`Bon de réception créé : ${receiptNumber}`);
      }

      if (header.document_mode === "facture_direct") {
        const payload = {
          invoice_number: generateDocumentNumber("FAC"),
          supplier_id: Number(header.supplier_id),
          site_id: Number(header.site_id),
          goods_receipt_id: null,
          status: "draft",
          invoice_date: new Date().toISOString(),
          due_date: header.due_date || null,
          notes: header.notes || "",
          lines: cart.map((line) => ({
            product_id: Number(line.product_id),
            quantity: Number(line.quantity),
            unit_price: Number(line.unit_price),
          })),
        };

        const res = await api.post("/supplier-invoices", payload);
        const invoiceNumber =
          res.data?.data?.invoice_number ||
          res.data?.invoice_number ||
          payload.invoice_number;
        toast.success(`Facture créée : ${invoiceNumber}`);
      }

      resetDocumentFields();
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Erreur lors de la validation de l'achat"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingRefs) {
    return <div className="p-6">Chargement des références...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Achat type POS</h1>
        <p className="text-slate-500">
          Création de BC, BR direct ou facture directe selon le workflow.
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
                {supplier.company_name || supplier.name}
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
            {siteWarehouses.map((warehouse) => (
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
            <option value="facture_direct">Facture directe</option>
          </select>

          <input
            className="rounded-xl border p-3"
            type="datetime-local"
            value={header.expected_delivery_at}
            onChange={(e) =>
              setHeader((p) => ({ ...p, expected_delivery_at: e.target.value }))
            }
          />

          <input
            className="rounded-xl border p-3"
            placeholder="Réf facture fournisseur"
            value={header.supplier_invoice_ref}
            onChange={(e) =>
              setHeader((p) => ({ ...p, supplier_invoice_ref: e.target.value }))
            }
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <input
            className="rounded-xl border p-3"
            type="datetime-local"
            value={header.due_date}
            onChange={(e) => setHeader((p) => ({ ...p, due_date: e.target.value }))}
          />

          <input
            className="rounded-xl border p-3"
            placeholder="Notes"
            value={header.notes}
            onChange={(e) => setHeader((p) => ({ ...p, notes: e.target.value }))}
          />
        </div>

        {header.document_mode === "bc" && (
          <div className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-700">
            Pour un BC, le dépôt ne sera pas enregistré sur le document. Le BR utilisera le
            dépôt par défaut du site ou le premier dépôt disponible.
          </div>
        )}

        {header.document_mode === "br_direct" && (
          <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
            Pour un BR direct, le dépôt est obligatoire.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="rounded-2xl bg-white p-4 shadow xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Catégories</h2>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setSelectedCategory("")}
              className={`w-full rounded-xl px-3 py-2 text-left ${
                selectedCategory === ""
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-800"
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

          {loadingProducts ? (
            <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
              Chargement des produits...
            </div>
          ) : (
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
                    Dernier achat :{" "}
                    <strong>
                      {formatMoney(Number(product.last_purchase_price ?? 0))} Ar
                    </strong>
                  </div>

                  <div className="text-xs text-slate-400">
                    {product.last_supplier_name ?? "Fournisseur inconnu"}
                  </div>

                  <div className="mt-1 text-xs text-slate-400">
                    {product.last_purchase_date
                      ? `Date: ${new Date(product.last_purchase_date).toLocaleDateString("fr-FR")}`
                      : ""}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-4 shadow xl:col-span-4">
          <h2 className="mb-4 text-lg font-bold text-slate-800">Panier achat</h2>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-100 p-3">
              <div className="text-sm text-slate-500">Lignes</div>
              <div className="text-xl font-bold text-slate-800">{cart.length}</div>
            </div>

            <div className="rounded-xl bg-slate-100 p-3">
              <div className="text-sm text-slate-500">Mode</div>
              <div className="text-xl font-bold text-slate-800">
                {header.document_mode === "bc"
                  ? "BC"
                  : header.document_mode === "br_direct"
                  ? "BR"
                  : "FACT"}
              </div>
            </div>
          </div>

          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            {cart.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Aucun article dans le panier.
              </div>
            )}

            {cart.map((line) => (
              <div
                key={line.product_id}
                className="rounded-xl border border-slate-200 p-3"
              >
                <div className="font-semibold text-slate-800">{line.name}</div>
                <div className="text-xs text-slate-500">{line.code}</div>

                <div className="mt-1 text-xs text-slate-500">
                  Dernier achat : {formatMoney(Number(line.last_purchase_price ?? 0))} Ar
                </div>

                <div className="text-xs text-slate-400">
                  {line.last_supplier_name ?? ""}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.001"
                    className="rounded border p-2"
                    placeholder="Qté"
                    value={line.quantity}
                    onChange={(e) =>
                      updateCartLine(line.product_id, "quantity", e.target.value)
                    }
                  />

                  <input
                    type="number"
                    step="0.01"
                    className="rounded border p-2"
                    placeholder="PU"
                    value={line.unit_price}
                    onChange={(e) =>
                      updateCartLine(line.product_id, "unit_price", e.target.value)
                    }
                  />
                </div>

                {Number(line.unit_price || 0) !== Number(line.last_purchase_price || 0) && (
                  <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
                    Prix différent du dernier achat
                  </div>
                )}

                <div className="mt-2 flex items-center justify-between">
                  <div className="font-bold text-slate-800">
                    {formatMoney(
                      Number(line.quantity || 0) * Number(line.unit_price || 0)
                    )}{" "}
                    Ar
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
            <div className="text-2xl font-bold text-slate-800">
              {formatMoney(totalAmount)} Ar
            </div>
          </div>

          <button
            onClick={submitDocument}
            disabled={submitting}
            className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-white disabled:opacity-60"
          >
            {submitting
              ? "Enregistrement..."
              : header.document_mode === "bc"
              ? "Valider le bon de commande"
              : header.document_mode === "br_direct"
              ? "Valider le bon de réception"
              : "Valider la facture"}
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