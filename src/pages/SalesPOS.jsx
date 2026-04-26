import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const FALLBACK_CATEGORIES = [
  { id: "all", name: "Tout" },
  { id: "pizza", name: "Pizza" },
  { id: "poulet", name: "Poulet" },
  { id: "boisson", name: "Boisson" },
];

const FALLBACK_PRODUCTS = [
  { id: 1, product_id: 1, name: "Pizza Regina", category: "pizza", price: 28000, station: "Cuisine Pizza" },
  { id: 2, product_id: 2, name: "Poulet BBQ", category: "poulet", price: 26000, station: "Cuisine Chaude" },
  { id: 3, product_id: 3, name: "Coca-Cola", category: "boisson", price: 5000, station: "Bar / Boissons" },
];

function formatMoney(value) {
  return Number(value || 0).toLocaleString("fr-FR");
}

function getInitialDraft() {
  return {
    orderType: "comptoir",
    tableLabel: "",
    customerName: "",
    customerPhone: "",
    notes: "",
    lines: [],
  };
}

function normalizeOrderType(orderType) {
  if (orderType === "comptoir") return "comptoir";
  if (orderType === "salle") return "salle";
  if (orderType === "livraison") return "livraison";
  return "comptoir";
}

export default function SalesPOS() {
  const { user, activeTerminal } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [ticketOpen, setTicketOpen] = useState(false);

  const [draft, setDraft] = useState(getInitialDraft());

  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [products, setProducts] = useState(FALLBACK_PRODUCTS);

  const [savingSale, setSavingSale] = useState(false);

  const storageKey = useMemo(() => {
    return `sales_pos_draft_${user?.id || "guest"}_${activeTerminal?.id || "no-terminal"}`;
  }, [user?.id, activeTerminal?.id]);

  const validateSale = async () => {
  if (!draft.lines.length) {
    toast.error("Le ticket est vide");
    return;
  }

  try {
    setSavingSale(true);

    const payload = {
      site_id: activeTerminal?.site_id || user?.site_id || null,
      warehouse_id: activeTerminal?.warehouse_id || user?.warehouse_id || null,
      terminal_id: activeTerminal?.id || null,
      order_type: draft.orderType,
      table_label: draft.orderType === "salle" ? draft.tableLabel || null : null,
      customer_name: draft.orderType === "livraison" ? draft.customerName || null : null,
      customer_phone: draft.orderType === "livraison" ? draft.customerPhone || null : null,
      notes: draft.notes || null,
      status: "validated",
      lines: draft.lines.map((line) => ({
        product_id: line.product_id || null,
        pos_menu_item_id: line.menu_item_id || null,
        name: line.name,
        category: line.category || null,
        station: line.station || null,
        unit_name: line.unit_name || null,
        quantity: Number(line.quantity || 0),
        price: Number(line.price || 0),
        note: line.note || null,
      })),
    };

    const res = await api.post("/sales", payload);

    toast.success(res.data?.message || "Vente enregistrée");

    const next = getInitialDraft();
    setDraft(next);
    sessionStorage.removeItem(storageKey);
    setTicketOpen(false);
  } catch (err) {
    console.error(err);
    toast.error(err?.response?.data?.message || "Erreur enregistrement vente");
  } finally {
    setSavingSale(false);
  }
};

  const loadCatalog = async (orderType = "comptoir") => {
    try {
      setCatalogLoading(true);
      setCatalogError("");

      const res = await api.get("/pos/catalog", {
        params: {
          order_type: normalizeOrderType(orderType),
        },
      });

      const apiCategories = Array.isArray(res.data?.categories) ? res.data.categories : [];
      const apiItems = Array.isArray(res.data?.items) ? res.data.items : [];

      setCategories([
        { id: "all", name: "Tout" },
        ...apiCategories.map((item) => ({
          id: item.id,
          name: item.name,
        })),
      ]);

      setProducts(apiItems);
    } catch (error) {
      console.error(error);
      setCatalogError("Impossible de charger le catalogue réel. Fallback local utilisé.");
      setCategories(FALLBACK_CATEGORIES);
      setProducts(FALLBACK_PRODUCTS);
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        setDraft((prev) => ({
          ...prev,
          ...parsed,
          lines: Array.isArray(parsed?.lines) ? parsed.lines : [],
        }));
      }
    } catch (error) {
      console.error(error);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(draft));
    } catch (error) {
      console.error(error);
    }
  }, [draft, storageKey]);

  useEffect(() => {
    loadCatalog(draft.orderType);
  }, [draft.orderType]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      const productCategory = String(product.category || "").toLowerCase();

      const categoryOk =
        selectedCategory === "all" ||
        productCategory === String(selectedCategory).toLowerCase();

      const searchOk = term
        ? `${product.name} ${product.station} ${product.category} ${product.product_name || ""} ${product.product_code || ""}`
            .toLowerCase()
            .includes(term)
        : true;

      return categoryOk && searchOk;
    });
  }, [products, selectedCategory, search]);

  const totalItems = useMemo(() => {
    return draft.lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
  }, [draft.lines]);

  const subtotal = useMemo(() => {
    return draft.lines.reduce(
      (sum, line) => sum + Number(line.quantity || 0) * Number(line.price || 0),
      0
    );
  }, [draft.lines]);

  const addToTicket = (product) => {
    setDraft((prev) => {
      const exists = prev.lines.find((line) => line.menu_item_id === product.id);

      if (exists) {
        return {
          ...prev,
          lines: prev.lines.map((line) =>
            line.menu_item_id === product.id
              ? { ...line, quantity: Number(line.quantity) + 1 }
              : line
          ),
        };
      }

      return {
        ...prev,
        lines: [
          ...prev.lines,
          {
            menu_item_id: product.id,
            product_id: product.product_id,
            name: product.name,
            category: product.category,
            station: product.station,
            quantity: 1,
            price: product.price,
            note: "",
            unit_name: product.unit_name || "",
          },
        ],
      };
    });
  };

  const updateLine = (menuItemId, field, value) => {
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.map((line) =>
        Number(line.menu_item_id) === Number(menuItemId)
          ? { ...line, [field]: value }
          : line
      ),
    }));
  };

  const incrementLine = (menuItemId) => {
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.map((line) =>
        Number(line.menu_item_id) === Number(menuItemId)
          ? { ...line, quantity: Number(line.quantity) + 1 }
          : line
      ),
    }));
  };

  const decrementLine = (menuItemId) => {
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines
        .map((line) =>
          Number(line.menu_item_id) === Number(menuItemId)
            ? { ...line, quantity: Math.max(1, Number(line.quantity) - 1) }
            : line
        )
        .filter((line) => Number(line.quantity) > 0),
    }));
  };

  const removeLine = (menuItemId) => {
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.filter(
        (line) => Number(line.menu_item_id) !== Number(menuItemId)
      ),
    }));
  };

  const clearTicket = () => {
    const ok = window.confirm("Voulez-vous vider le ticket ?");
    if (!ok) return;

    setDraft((prev) => ({
      ...prev,
      lines: [],
      notes: "",
    }));

    toast.success("Ticket vidé");
  };

  const resetDraft = () => {
    const ok = window.confirm("Voulez-vous réinitialiser complètement le brouillon POS ?");
    if (!ok) return;

    const next = getInitialDraft();
    setDraft(next);
    sessionStorage.removeItem(storageKey);
    toast.success("Brouillon réinitialisé");
  };

  const fakeAction = (label) => {
    toast.success(`${label} prêt pour l'étape suivante`);
  };

  const ticketPanel = (
    <div className="flex h-full flex-col rounded-3xl bg-white p-4 shadow-xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900">Ticket</h2>
          <p className="text-sm text-slate-500">
            {totalItems} article(s) • {draft.lines.length} ligne(s)
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={clearTicket}
            className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
          >
            Vider
          </button>
          <button
            onClick={resetDraft}
            className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <button
          onClick={() => setDraft((prev) => ({ ...prev, orderType: "comptoir" }))}
          className={`rounded-2xl px-3 py-3 text-sm font-bold ${
            draft.orderType === "comptoir"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          Comptoir
        </button>

        <button
          onClick={() => setDraft((prev) => ({ ...prev, orderType: "salle" }))}
          className={`rounded-2xl px-3 py-3 text-sm font-bold ${
            draft.orderType === "salle"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          Salle
        </button>

        <button
          onClick={() => setDraft((prev) => ({ ...prev, orderType: "livraison" }))}
          className={`rounded-2xl px-3 py-3 text-sm font-bold ${
            draft.orderType === "livraison"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          Livraison
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3">
        {draft.orderType === "salle" && (
          <input
            className="rounded-2xl border p-3"
            placeholder="Table / numéro"
            value={draft.tableLabel}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, tableLabel: e.target.value }))
            }
          />
        )}

        {draft.orderType === "livraison" && (
          <>
            <input
              className="rounded-2xl border p-3"
              placeholder="Nom client"
              value={draft.customerName}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, customerName: e.target.value }))
              }
            />
            <input
              className="rounded-2xl border p-3"
              placeholder="Téléphone client"
              value={draft.customerPhone}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, customerPhone: e.target.value }))
              }
            />
          </>
        )}

        <textarea
          className="rounded-2xl border p-3"
          rows={2}
          placeholder="Notes commande"
          value={draft.notes}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, notes: e.target.value }))
          }
        />
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {draft.lines.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            Aucun article dans le ticket.
          </div>
        )}

        {draft.lines.map((line) => (
          <div
            key={line.menu_item_id}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-bold text-slate-900">{line.name}</div>
                <div className="text-xs text-slate-500">{line.station}</div>
              </div>

              <button
                onClick={() => removeLine(line.menu_item_id)}
                className="rounded-xl bg-red-600 px-3 py-1 text-xs font-bold text-white"
              >
                X
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => decrementLine(line.menu_item_id)}
                className="h-10 w-10 rounded-2xl bg-slate-200 text-lg font-black text-slate-800"
              >
                -
              </button>

              <input
                type="number"
                min="1"
                className="w-20 rounded-2xl border p-2 text-center font-bold"
                value={line.quantity}
                onChange={(e) =>
                  updateLine(
                    line.menu_item_id,
                    "quantity",
                    Math.max(1, Number(e.target.value || 1))
                  )
                }
              />

              <button
                onClick={() => incrementLine(line.menu_item_id)}
                className="h-10 w-10 rounded-2xl bg-slate-900 text-lg font-black text-white"
              >
                +
              </button>

              <div className="ml-auto text-right">
                <div className="text-xs text-slate-500">
                  {formatMoney(line.price)} Ar
                </div>
                <div className="font-black text-slate-900">
                  {formatMoney(Number(line.quantity) * Number(line.price))} Ar
                </div>
              </div>
            </div>

            <input
              className="mt-3 w-full rounded-2xl border p-2 text-sm"
              placeholder="Remarque ligne"
              value={line.note || ""}
              onChange={(e) => updateLine(line.menu_item_id, "note", e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-3xl bg-slate-900 p-4 text-white">
        <div className="flex items-center justify-between text-sm text-slate-300">
          <span>Sous-total</span>
          <span>{formatMoney(subtotal)} Ar</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-base font-semibold">TOTAL</span>
          <span className="text-2xl font-black">{formatMoney(subtotal)} Ar</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => fakeAction("Espèces")}
          className="rounded-2xl bg-emerald-600 px-4 py-4 text-sm font-black text-white"
        >
          Espèces
        </button>
        <button
          onClick={() => fakeAction("MVola")}
          className="rounded-2xl bg-yellow-400 px-4 py-4 text-sm font-black text-slate-900"
        >
          MVola
        </button>
        <button
          onClick={() => fakeAction("Orange Money")}
          className="rounded-2xl bg-orange-500 px-4 py-4 text-sm font-black text-white"
        >
          Orange Money
        </button>
        <button
          onClick={() => fakeAction("Carte")}
          className="rounded-2xl bg-blue-600 px-4 py-4 text-sm font-black text-white"
        >
          Carte
        </button>
      </div>

        <button
        onClick={validateSale}
        disabled={savingSale}
        className="mt-3 rounded-2xl bg-slate-950 px-4 py-4 text-sm font-black text-white disabled:opacity-60"
        >
        {savingSale ? "Enregistrement..." : "Valider le ticket"}
        </button>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-5 text-white shadow-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">POS Vente — Sprint 1</h1>
            <p className="mt-1 text-sm text-slate-200">
              Catalogue réel POS branché au backend.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm">
              <div className="text-slate-300">Site</div>
              <div className="font-bold">
                {activeTerminal?.site_name || user?.site?.name || "Non défini"}
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm">
              <div className="text-slate-300">Dépôt</div>
              <div className="font-bold">
                {activeTerminal?.warehouse_name || user?.warehouse?.name || "Non défini"}
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm">
              <div className="text-slate-300">Poste</div>
              <div className="font-bold">
                {activeTerminal?.name || "Aucun poste"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {catalogError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {catalogError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-2">
          <div className="rounded-3xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">Catégories</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {Math.max(0, categories.length - 1)}
              </span>
            </div>

            <div className="flex gap-2 overflow-x-auto xl:flex-col">
              {categories.map((category) => {
                const active = selectedCategory === category.id;

                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`whitespace-nowrap rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                      active
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {category.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="xl:col-span-7">
          <div className="rounded-3xl bg-white p-4 shadow-xl">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">Produits</h2>
                <p className="text-sm text-slate-500">
                  {catalogLoading ? "Chargement du catalogue..." : "Catalogue vente actif"}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="rounded-2xl border p-3"
                  placeholder="Rechercher un produit..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <button
                  onClick={() => setTicketOpen(true)}
                  className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white xl:hidden"
                >
                  Voir ticket ({totalItems})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToTicket(product)}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-black text-slate-900">{product.name}</div>
                      <div className="mt-1 text-xs font-medium text-slate-500">
                        {product.station}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-900 px-3 py-2 text-sm font-black text-white">
                      {formatMoney(product.price)}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-bold uppercase text-slate-700">
                      {product.category}
                    </span>

                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                      Ajouter
                    </span>
                  </div>
                </button>
              ))}

              {!catalogLoading && filteredProducts.length === 0 && (
                <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  Aucun produit POS configuré.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="hidden xl:col-span-3 xl:block">{ticketPanel}</div>
      </div>

      {ticketOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 xl:hidden">
          <div className="max-h-[92vh] w-full rounded-t-[28px] bg-slate-100 p-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="mx-auto h-1.5 w-16 rounded-full bg-slate-300" />
              <button
                onClick={() => setTicketOpen(false)}
                className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow"
              >
                Fermer
              </button>
            </div>
            <div className="max-h-[84vh] overflow-hidden">{ticketPanel}</div>
          </div>
        </div>
      )}
    </div>
  );
}