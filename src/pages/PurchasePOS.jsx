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


function firstFiniteNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return 0;
}

function getUnitRatio(unitsById, unitId) {
  const unit = unitsById.get(Number(unitId));
  const ratio = Number(unit?.ratio_base ?? 0);
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
}

function getUnitLabel(unitsById, unitId, fallback = "") {
  if (!unitId) return fallback;
  const unit = unitsById.get(Number(unitId));
  return unit?.symbol || unit?.name || fallback || "";
}

function convertUnitAmount(amount, fromUnitId, toUnitId, unitsById) {
  const numericAmount = Number(amount ?? 0);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return 0;
  if (!fromUnitId || !toUnitId || Number(fromUnitId) === Number(toUnitId)) {
    return numericAmount;
  }

  const fromRatio = getUnitRatio(unitsById, fromUnitId);
  const toRatio = getUnitRatio(unitsById, toUnitId);

  if (!Number.isFinite(fromRatio) || fromRatio <= 0 || !Number.isFinite(toRatio) || toRatio <= 0) {
    return numericAmount;
  }

  return numericAmount / (fromRatio / toRatio);
}

function resolveProductUnitIds(product) {
  return {
    purchaseUnitId: Number(
      product?.purchase_unit_id ?? product?.purchase_unit?.id ?? 0
    ) || null,
    stockUnitId: Number(
      product?.stock_unit_id ?? product?.stock_unit?.id ?? 0
    ) || null,
  };
}

function resolveProductUnitPrice(product, targetUnitId, unitsById) {
  const { purchaseUnitId, stockUnitId } = resolveProductUnitIds(product);

  const lastPurchasePrice = firstFiniteNumber(
    product?.last_purchase_price,
    product?.last_unit_price,
    product?.latest_purchase_price,
    product?.lastPurchasePrice,
    product?.last_purchase?.unit_price
  );

  if (lastPurchasePrice > 0) {
    return {
      price: convertUnitAmount(
        lastPurchasePrice,
        purchaseUnitId || targetUnitId,
        targetUnitId || purchaseUnitId,
        unitsById
      ),
      source: "last_purchase",
    };
  }

  const averageUnitCost = firstFiniteNumber(
    product?.average_unit_cost,
    product?.stock_average_unit_cost,
    product?.average_cost,
    product?.avg_cost
  );

  if (averageUnitCost > 0) {
    return {
      price: convertUnitAmount(
        averageUnitCost,
        stockUnitId || targetUnitId,
        targetUnitId || stockUnitId,
        unitsById
      ),
      source: "average_unit_cost",
    };
  }

  return { price: 0, source: "none" };
}

function buildProductUnitOptions(product, unitsById) {
  const { purchaseUnitId, stockUnitId } = resolveProductUnitIds(product);
  const options = [];
  const seen = new Set();

  [
    { id: purchaseUnitId, kind: "purchase", label: getUnitLabel(unitsById, purchaseUnitId, product?.purchase_unit_name || "") },
    { id: stockUnitId, kind: "stock", label: getUnitLabel(unitsById, stockUnitId, product?.stock_unit_name || "") },
  ].forEach((item) => {
    if (!item.id || seen.has(Number(item.id))) return;
    seen.add(Number(item.id));
    options.push(item);
  });

  return options;
}

const INITIAL_QUICK_PRODUCT_FORM = {
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

function useIsMobile(breakpoint = 1023) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= breakpoint;
  });

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const media = window.matchMedia(`(max-width: ${breakpoint}px)`);

    const handleChange = (event) => {
      setIsMobile(event.matches);
    };

    setIsMobile(media.matches);

    if (media.addEventListener) {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, [breakpoint]);

  return isMobile;
}

function QuickProductModal({
  open,
  onClose,
  categories,
  suppliers,
  locations,
  units,
  onCreated,
  isMobile,
}) {
  const [form, setForm] = useState(INITIAL_QUICK_PRODUCT_FORM);
  const [image, setImage] = useState(null);

  useEffect(() => {
    if (!open) {
      setForm(INITIAL_QUICK_PRODUCT_FORM);
      setImage(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();

    try {
      const payload = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        payload.append(key, value ?? "");
      });

      payload.set("category_id", form.category_id || "");
      payload.set("purchase_unit_id", form.purchase_unit_id || "");
      payload.set("stock_unit_id", form.stock_unit_id || "");
      payload.set("production_unit_id", form.production_unit_id || "");
      payload.set("sale_unit_id", form.sale_unit_id || "");
      payload.set("main_supplier_id", form.main_supplier_id || "");
      payload.set("default_storage_location_id", form.default_storage_location_id || "");
      payload.set("has_batch", form.has_batch ? "1" : "0");
      payload.set("has_expiry_date", form.has_expiry_date ? "1" : "0");
      payload.set("is_active", form.is_active ? "1" : "0");

      if (image) {
        payload.append("image", image);
      }

      const res = await api.post("/purchase-pos/quick-product", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(res.data?.message || "Produit créé");
      onCreated(res.data?.data);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur création produit");
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/50">
      <div
        className={`${
          isMobile
            ? "absolute inset-0 h-full w-full rounded-none bg-white"
            : "mx-auto mt-8 flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 md:px-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800 md:text-2xl">Nouveau produit</h2>
            <p className="mt-1 text-sm text-slate-500">
              Création rapide sans quitter l’écran d’achat
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-xl font-bold text-slate-700"
          >
            ×
          </button>
        </div>

        <div className={`${isMobile ? "h-[calc(100%-80px)] overflow-y-auto" : "flex-1 overflow-y-auto"}`}>
          <form onSubmit={submit} className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 md:p-6">
            <input
              className="rounded-xl border p-3"
              placeholder="Code produit"
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
              className="rounded-xl border p-3 md:col-span-2"
              placeholder="Nom produit"
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
              value={form.production_unit_id}
              onChange={(e) => setForm((p) => ({ ...p, production_unit_id: e.target.value }))}
            >
              <option value="">Unité production</option>
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

            <select
              className="rounded-xl border p-3"
              value={form.main_supplier_id}
              onChange={(e) => setForm((p) => ({ ...p, main_supplier_id: e.target.value }))}
            >
              <option value="">Fournisseur principal</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.company_name || supplier.name}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border p-3"
              value={form.default_storage_location_id}
              onChange={(e) =>
                setForm((p) => ({ ...p, default_storage_location_id: e.target.value }))
              }
            >
              <option value="">Emplacement par défaut</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>

            <input
              className="rounded-xl border p-3"
              placeholder="Durée de vie (jours)"
              value={form.shelf_life_days}
              onChange={(e) => setForm((p) => ({ ...p, shelf_life_days: e.target.value }))}
            />

            <input
              className="rounded-xl border p-3"
              placeholder="Stock minimum"
              value={form.min_stock}
              onChange={(e) => setForm((p) => ({ ...p, min_stock: e.target.value }))}
            />

            <input
              className="rounded-xl border p-3"
              placeholder="Stock maximum"
              value={form.max_stock}
              onChange={(e) => setForm((p) => ({ ...p, max_stock: e.target.value }))}
            />

            <input
              className="rounded-xl border p-3"
              placeholder="Stock de sécurité"
              value={form.safety_stock}
              onChange={(e) => setForm((p) => ({ ...p, safety_stock: e.target.value }))}
            />

            <input
              className="rounded-xl border p-3"
              placeholder="Point de commande"
              value={form.reorder_point}
              onChange={(e) => setForm((p) => ({ ...p, reorder_point: e.target.value }))}
            />

            <input
              className="rounded-xl border p-3"
              placeholder="Qté de réappro"
              value={form.reorder_qty}
              onChange={(e) => setForm((p) => ({ ...p, reorder_qty: e.target.value }))}
            />

            <input
              className="rounded-xl border p-3"
              placeholder="Condition de stockage"
              value={form.storage_condition}
              onChange={(e) => setForm((p) => ({ ...p, storage_condition: e.target.value }))}
            />

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
              placeholder="Type de catégorie"
              value={form.category_type}
              onChange={(e) => setForm((p) => ({ ...p, category_type: e.target.value }))}
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
              placeholder="Méthode de valorisation"
              value={form.valuation_method}
              onChange={(e) => setForm((p) => ({ ...p, valuation_method: e.target.value }))}
            />

            <label className="rounded-xl border p-3 text-sm text-slate-600 md:col-span-2">
              Image produit
              <input
                type="file"
                accept="image/*"
                className="mt-2 block w-full"
                onChange={(e) => setImage(e.target.files?.[0] || null)}
              />
            </label>

            <label className="flex min-h-[48px] items-center gap-3 rounded-xl border p-3">
              <input
                type="checkbox"
                checked={form.has_batch}
                onChange={(e) => setForm((p) => ({ ...p, has_batch: e.target.checked }))}
              />
              <span className="text-sm font-medium text-slate-700">Gestion lot</span>
            </label>

            <label className="flex min-h-[48px] items-center gap-3 rounded-xl border p-3">
              <input
                type="checkbox"
                checked={form.has_expiry_date}
                onChange={(e) =>
                  setForm((p) => ({ ...p, has_expiry_date: e.target.checked }))
                }
              />
              <span className="text-sm font-medium text-slate-700">Date d'expiration</span>
            </label>

            <label className="flex min-h-[48px] items-center gap-3 rounded-xl border p-3 md:col-span-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
              />
              <span className="text-sm font-medium text-slate-700">Produit actif</span>
            </label>
            <div className="flex flex-col gap-3 pt-2 md:col-span-2 md:flex-row md:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-slate-200 px-4 py-3 text-slate-800"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-3 text-white"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function QtyControl({ value, onChange }) {
  const numericValue = Number(value || 0);

  const decrement = () => {
    const next = Math.max(numericValue - 1, 0);
    onChange(next);
  };

  const increment = () => {
    const next = numericValue + 1;
    onChange(next);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={decrement}
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-lg font-bold text-slate-700"
      >
        −
      </button>

      <input
        type="number"
        step="0.001"
        className="h-11 min-w-0 flex-1 rounded-xl border p-2 text-center"
        placeholder="Qté"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />

      <button
        type="button"
        onClick={increment}
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-lg font-bold text-slate-700"
      >
        +
      </button>
    </div>
  );
}

function CartPanel({
  cart,
  header,
  totalAmount,
  submitting,
  updateCartLine,
  removeCartLine,
  submitDocument,
  isMobile = false,
  onClose,
}) {
  return (
    <div className={`flex h-full min-h-0 flex-col ${isMobile ? "bg-white" : ""}`}>
      <div
        className={`flex items-center justify-between ${
          isMobile ? "border-b border-slate-200 bg-white px-4 py-4" : "pb-2"
        }`}
      >
        <div>
          <h2 className="text-lg font-bold text-slate-800">Panier achat</h2>
          <p className="text-sm text-slate-500">
            {cart.length} ligne(s) •{" "}
            {header.document_mode === "bc"
              ? "BC"
              : header.document_mode === "br_direct"
              ? "BR"
              : "FACT"}
          </p>
        </div>

        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-700"
          >
            ×
          </button>
        )}
      </div>

      <div className={`flex min-h-0 flex-1 flex-col ${isMobile ? "p-4" : ""}`}>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
            <div className="text-sm text-slate-500">Lignes</div>
            <div className="text-2xl font-bold text-slate-800">{cart.length}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
            <div className="text-sm text-slate-500">Mode</div>
            <div className="text-2xl font-bold text-slate-800">
              {header.document_mode === "bc"
                ? "BC"
                : header.document_mode === "br_direct"
                ? "BR"
                : "FACT"}
            </div>
          </div>
        </div>

        <div
          className={`min-h-0 flex-1 space-y-3 ${
            isMobile ? "overflow-y-auto pb-3" : "overflow-y-auto pr-1"
          }`}
        >
          {cart.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
              Aucun article dans le panier.
            </div>
          )}

          {cart.map((line) => (
            <div
              key={line.product_id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold text-slate-800">{line.name}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{line.code}</div>
                  <div className="mt-2 text-xs text-slate-500">
                    Dernier achat : {formatMoney(Number(line.last_purchase_price ?? 0))} Ar
                  </div>
                  {!!line.last_supplier_name && (
                    <div className="mt-1 text-xs text-slate-400">{line.last_supplier_name}</div>
                  )}
                </div>

                <button
                  onClick={() => removeCartLine(line.product_id)}
                  className="shrink-0 rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white shadow-sm"
                >
                  Retirer
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Unité
                  </div>
                  <select
                    className="h-11 w-full rounded-xl border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-700"
                    value={line.selected_unit_id || ""}
                    onChange={(e) =>
                      updateCartLine(line.product_id, "selected_unit_id", e.target.value)
                    }
                  >
                    {(line.unit_options || []).map((option) => (
                      <option key={`${line.product_id}-${option.id}`} value={option.id}>
                        {option.kind === "purchase" ? "Achat" : "Stock"} • {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Quantité
                  </div>
                  <QtyControl
                    value={line.quantity}
                    onChange={(value) => updateCartLine(line.product_id, "quantity", value)}
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Prix unitaire
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    className="h-11 w-full rounded-xl border border-slate-300 px-3"
                    placeholder="Prix unitaire"
                    value={line.unit_price}
                    onChange={(e) =>
                      updateCartLine(line.product_id, "unit_price", e.target.value)
                    }
                  />
                </div>
              </div>

              {Number(line.unit_price || 0) !== Number(line.last_purchase_price || 0) && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                  Prix différent du dernier achat
                </div>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Sous-total
                </div>
                <div className="text-2xl font-extrabold text-slate-800">
                  {formatMoney(
                    Number(line.quantity || 0) * Number(line.unit_price || 0)
                  )}{" "}
                  Ar
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-slate-200 bg-white pt-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <div className="text-sm text-slate-500">Montant total</div>
            <div className="text-3xl font-extrabold text-slate-800">
              {formatMoney(totalAmount)} Ar
            </div>
          </div>

          <button
            onClick={submitDocument}
            disabled={submitting}
            className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
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
    </div>
  );
}

export default function PurchasePOS() {
  const { user } = useAuth();
  const isStockSiteUser = user?.role === "stock";
  const isMobile = useIsMobile();
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [sites, setSites] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [units, setUnits] = useState([]);
  const [locations, setLocations] = useState([]);

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

  const visibleSites = useMemo(() => {
    if (isStockSiteUser) {
      return (sites ?? []).filter((s) => Number(s.id) === Number(user?.site_id));
    }
    return sites ?? [];
  }, [sites, isStockSiteUser, user]);

  const currentSite = useMemo(() => {
    return (sites ?? []).find((s) => Number(s.id) === Number(header.site_id)) || null;
  }, [sites, header.site_id]);

  const siteWarehouses = useMemo(() => {
    const effectiveSiteId = header.site_id || user?.site_id || "";
    if (!effectiveSiteId) return [];
    return (warehouses ?? []).filter(
      (warehouse) => Number(warehouse.site_id) === Number(effectiveSiteId)
    );
  }, [warehouses, header.site_id, user]);

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, line) => {
      return sum + Number(line.quantity || 0) * Number(line.unit_price || 0);
    }, 0);
  }, [cart]);

  const unitsById = useMemo(() => {
    return new Map((units || []).map((unit) => [Number(unit.id), unit]));
  }, [units]);

  const loadReferences = async () => {
    try {
      setLoadingRefs(true);

      const [catRes, supRes, siteRes, whRes, unitRes, locRes] = await Promise.all([
        api.get("/references/categories"),
        api.get("/references/suppliers"),
        api.get("/sites"),
        api.get("/warehouses"),
        api.get("/units"),
        api.get("/storage-zones"),
      ]);

      const categoriesData = asArray(catRes.data);
      const suppliersData = asArray(supRes.data);
      const sitesData = asArray(siteRes.data);
      const warehousesData = asArray(whRes.data);
      const unitsData = asArray(unitRes.data);
      const locationsData = asArray(locRes.data);

      setCategories(categoriesData);
      setSuppliers(suppliersData);
      setSites(sitesData);
      setWarehouses(warehousesData);
      setUnits(unitsData);
      setLocations(locationsData);

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
    if (!isStockSiteUser || !user?.site_id) return;

    setHeader((prev) => ({
      ...prev,
      site_id: String(user.site_id),
    }));
  }, [isStockSiteUser, user]);

  useEffect(() => {
    if (!header.site_id && !user?.site_id) return;

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
  }, [header.site_id, header.warehouse_id, siteWarehouses, currentSite, user]);

  useEffect(() => {
    if ((!cartDrawerOpen && !modalOpen) || typeof document === "undefined") return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [cartDrawerOpen, modalOpen]);

  const buildCartLineFromProduct = (product) => {
    const { purchaseUnitId, stockUnitId } = resolveProductUnitIds(product);
    const defaultUnitId = purchaseUnitId || stockUnitId || null;
    const unitOptions = buildProductUnitOptions(product, unitsById);
    const resolvedPrice = resolveProductUnitPrice(product, defaultUnitId, unitsById);

    return {
      product_id: product.id,
      code: product.code,
      name: product.name,
      quantity: 1,
      selected_unit_id: defaultUnitId ? String(defaultUnitId) : "",
      unit_price: Number(resolvedPrice.price || 0),
      last_purchase_price: Number(resolvedPrice.price || 0),
      last_purchase_date: product.last_purchase_date ?? null,
      last_supplier_name: product.last_supplier_name ?? null,
      purchase_unit_id: purchaseUnitId ? String(purchaseUnitId) : "",
      stock_unit_id: stockUnitId ? String(stockUnitId) : "",
      unit_options: unitOptions,
    };
  };

  const recalculateLineForUnit = (line, nextUnitId) => {
    const selectedUnitId = nextUnitId ? String(nextUnitId) : "";
    const purchasePrice = firstFiniteNumber(line.last_purchase_price, line.unit_price);
    const baseUnitId = line.purchase_unit_id || selectedUnitId || line.stock_unit_id || "";

    return {
      ...line,
      selected_unit_id: selectedUnitId,
      unit_price: String(
        convertUnitAmount(
          purchasePrice,
          baseUnitId,
          selectedUnitId || baseUnitId,
          unitsById
        )
      ),
    };
  };

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
      setCart((prev) => [...prev, buildCartLineFromProduct(product)]);
    }

    if (isMobile) {
      toast.success("Article ajouté au panier");
    }
  };

  const updateCartLine = (productId, field, value) => {
    setCart((prev) =>
      prev.map((line) => {
        if (line.product_id !== productId) return line;
        if (field === "selected_unit_id") {
          return recalculateLineForUnit(line, value);
        }
        return { ...line, [field]: value };
      })
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

    if (!header.warehouse_id) {
      toast.error("Choisir le dépôt");
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

    try {
      setSubmitting(true);

      if (header.document_mode === "bc" || header.document_mode === "br_direct") {
        const payload = {
          supplier_id: Number(header.supplier_id),
          site_id: Number(header.site_id),
          warehouse_id: Number(header.warehouse_id),
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

        if (header.document_mode === "bc") {
          const orderNumber =
            res.data?.purchase_order?.order_number ||
            res.data?.data?.order_number ||
            "BC créé";
          toast.success(`Bon de commande créé : ${orderNumber}`);
        } else {
          const receiptNumber =
            res.data?.goods_receipt?.receipt_number ||
            res.data?.data?.receipt_number ||
            "BR créé";
          toast.success(`Bon de réception créé : ${receiptNumber}`);
        }
      }

      if (header.document_mode === "facture_direct") {
        const amountHt = totalAmount;
        const amountTva = 0;
        const amountTtc = amountHt + amountTva;

        const payload = {
          supplier_id: Number(header.supplier_id),
          site_id: Number(header.site_id),
          warehouse_id: Number(header.warehouse_id),
          purchase_order_id: null,
          goods_receipt_id: null,
          supplier_invoice_ref: header.supplier_invoice_ref || null,
          amount_ht: Number(amountHt),
          amount_tva: Number(amountTva),
          amount_ttc: Number(amountTtc),
          invoice_date: new Date().toISOString(),
          due_date: header.due_date || null,
          notes: header.notes || "",
          lines: cart.map((line) => ({
            product_id: Number(line.product_id),
            quantity: Number(line.quantity),
            unit_price: Number(line.unit_price),
          })),
        };

        const res = await api.post("/purchase-documents/invoice", payload);

        const invoiceNumber =
          res.data?.data?.invoice_number ||
          res.data?.invoice_number ||
          "Facture créée";

        toast.success(`Facture créée : ${invoiceNumber}`);
      }

      resetDocumentFields();
      setCartDrawerOpen(false);
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
    <div className="space-y-4 pb-24 lg:pb-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">Achat type POS</h1>
          <p className="text-slate-500">
            Création de BC, BR direct ou facture directe selon le workflow.
          </p>
        </div>

        {isMobile && (
          <button
            type="button"
            onClick={() => setCartDrawerOpen(true)}
            className="hidden md:hidden"
          >
            Panier
          </button>
        )}
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
            className="rounded-xl border p-3 disabled:bg-slate-100 disabled:text-slate-500"
            value={header.site_id}
            disabled={isStockSiteUser}
            onChange={(e) =>
              setHeader((p) => ({
                ...p,
                site_id: e.target.value,
                warehouse_id: "",
              }))
            }
          >
            <option value="">Site</option>
            {visibleSites.map((site) => (
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
            Pour un BC, le dépôt sélectionné sera mémorisé et repris au moment de la
            conversion en BR.
          </div>
        )}

        {header.document_mode === "br_direct" && (
          <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
            Pour un BR direct, le dépôt est obligatoire.
          </div>
        )}

        {header.document_mode === "facture_direct" && (
          <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
            Pour une facture directe, le dépôt et les lignes produits seront transmis pour
            alimenter correctement le stock.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="rounded-2xl bg-white p-4 shadow xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Catégories</h2>
          </div>

          {isMobile ? (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              <button
                onClick={() => setSelectedCategory("")}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
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
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                    String(selectedCategory) === String(category.id)
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          ) : (
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
          )}
        </div>

        <div className="rounded-2xl bg-white p-4 shadow xl:col-span-6">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-bold text-slate-800">Articles</h2>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className="rounded-xl border p-3"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                onClick={() => setModalOpen(true)}
                className="rounded-xl bg-emerald-700 px-4 py-3 text-white"
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => {
                const { purchaseUnitId, stockUnitId } = resolveProductUnitIds(product);
                const displayUnitId = purchaseUnitId || stockUnitId || null;
                const displayPrice = resolveProductUnitPrice(
                  product,
                  displayUnitId,
                  unitsById
                );

                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="rounded-2xl border border-slate-200 p-3 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="line-clamp-2 font-semibold text-slate-800">
                          {product.name}
                        </div>
                        <div className="text-sm text-slate-500">{product.code}</div>
                      </div>

                      <span className="shrink-0 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                        Ajouter
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-slate-400">
                      {product.category?.name ?? "Sans catégorie"}
                    </div>

                    <div className="mt-2 text-sm text-slate-700">
                      Dernier achat :{" "}
                      <strong>
                        {formatMoney(Number(displayPrice.price ?? 0))} Ar
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
                );
              })}
            </div>
          )}
        </div>

        {!isMobile && (
          <div className="rounded-2xl bg-white p-4 shadow xl:col-span-4">
            <CartPanel
              cart={cart}
              header={header}
              totalAmount={totalAmount}
              submitting={submitting}
              updateCartLine={updateCartLine}
              removeCartLine={removeCartLine}
              submitDocument={submitDocument}
            />
          </div>
        )}
      </div>

      {isMobile && (
        <>
          <button
            type="button"
            onClick={() => setCartDrawerOpen(true)}
            className="fixed bottom-4 left-4 right-4 z-40 rounded-2xl bg-slate-900 px-4 py-4 text-white shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <div className="text-sm text-slate-300">Voir le panier</div>
                <div className="font-bold">
                  {cart.length} article(s)
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm text-slate-300">Total</div>
                <div className="font-bold">{formatMoney(totalAmount)} Ar</div>
              </div>
            </div>
          </button>

          {cartDrawerOpen && (
            <div className="fixed inset-0 z-[60] bg-black/40">
              <div className="absolute inset-x-0 bottom-0 h-[88vh] rounded-t-3xl bg-white shadow-2xl">
                <div className="mx-auto mt-3 h-1.5 w-16 rounded-full bg-slate-300" />
                <div className="h-[calc(88vh-20px)] overflow-y-auto">
                  <CartPanel
                    cart={cart}
                    header={header}
                    totalAmount={totalAmount}
                    submitting={submitting}
                    updateCartLine={updateCartLine}
                    removeCartLine={removeCartLine}
                    submitDocument={submitDocument}
                    isMobile
                    onClose={() => setCartDrawerOpen(false)}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <QuickProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        categories={categories}
        suppliers={suppliers}
        locations={locations}
        units={units}
        isMobile={isMobile}
        onCreated={(product) => {
          loadProducts(selectedCategory, search);
          addToCart(product);
        }}
      />
    </div>
  );
}