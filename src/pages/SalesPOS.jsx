import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const DEMO_CATEGORIES = [
  { id: "all", name: "Tout" },
  { id: "pizza", name: "Pizza" },
  { id: "poulet", name: "Poulet" },
  { id: "kebab", name: "Kebab" },
  { id: "sandwich", name: "Sandwich" },
  { id: "boisson", name: "Boisson" },
  { id: "dessert", name: "Dessert" },
];

const DEMO_PRODUCTS = [
  { id: 1, name: "Pizza Regina", category: "pizza", price: 28000, station: "Cuisine Pizza" },
  { id: 2, name: "Pizza Royale", category: "pizza", price: 32000, station: "Cuisine Pizza" },
  { id: 3, name: "Pizza 4 Fromages", category: "pizza", price: 34000, station: "Cuisine Pizza" },
  { id: 4, name: "Poulet BBQ", category: "poulet", price: 26000, station: "Cuisine Chaude" },
  { id: 5, name: "Poulet Crispy", category: "poulet", price: 24000, station: "Cuisine Chaude" },
  { id: 6, name: "Kebab Bœuf", category: "kebab", price: 18000, station: "Snack" },
  { id: 7, name: "Kebab Poulet", category: "kebab", price: 17000, station: "Snack" },
  { id: 8, name: "Sandwich Club", category: "sandwich", price: 15000, station: "Snack" },
  { id: 9, name: "Sandwich Poulet", category: "sandwich", price: 16000, station: "Snack" },
  { id: 10, name: "Coca-Cola", category: "boisson", price: 5000, station: "Bar / Boissons" },
  { id: 11, name: "Eau Minérale", category: "boisson", price: 3000, station: "Bar / Boissons" },
  { id: 12, name: "Jus Orange", category: "boisson", price: 7000, station: "Bar / Boissons" },
  { id: 13, name: "Glace Vanille", category: "dessert", price: 8000, station: "Dessert" },
  { id: 14, name: "Brownie", category: "dessert", price: 9000, station: "Dessert" },
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

export default function SalesPOS() {
  const { user, activeTerminal } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [ticketOpen, setTicketOpen] = useState(false);

  const [draft, setDraft] = useState(getInitialDraft());

  const storageKey = useMemo(() => {
    return `sales_pos_draft_${user?.id || "guest"}_${activeTerminal?.id || "no-terminal"}`;
  }, [user?.id, activeTerminal?.id]);

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

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return DEMO_PRODUCTS.filter((product) => {
      const categoryOk =
        selectedCategory === "all" || product.category === selectedCategory;

      const searchOk = term
        ? `${product.name} ${product.station} ${product.category}`
            .toLowerCase()
            .includes(term)
        : true;

      return categoryOk && searchOk;
    });
  }, [selectedCategory, search]);

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
      const exists = prev.lines.find((line) => line.product_id === product.id);

      if (exists) {
        return {
          ...prev,
          lines: prev.lines.map((line) =>
            line.product_id === product.id
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
            product_id: product.id,
            name: product.name,
            category: product.category,
            station: product.station,
            quantity: 1,
            price: product.price,
            note: "",
          },
        ],
      };
    });
  };

  const updateLine = (productId, field, value) => {
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.map((line) =>
        line.product_id === productId ? { ...line, [field]: value } : line
      ),
    }));
  };

  const incrementLine = (productId) => {
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.map((line) =>
        line.product_id === productId
          ? { ...line, quantity: Number(line.quantity) + 1 }
          : line
      ),
    }));
  };

  const decrementLine = (productId) => {
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines
        .map((line) =>
          line.product_id === productId
            ? { ...line, quantity: Math.max(1, Number(line.quantity) - 1) }
            : line
        )
        .filter((line) => Number(line.quantity) > 0),
    }));
  };

  const removeLine = (productId) => {
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.filter((line) => line.product_id !== productId),
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
            key={line.product_id}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-bold text-slate-900">{line.name}</div>
                <div className="text-xs text-slate-500">{line.station}</div>
              </div>

              <button
                onClick={() => removeLine(line.product_id)}
                className="rounded-xl bg-red-600 px-3 py-1 text-xs font-bold text-white"
              >
                X
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => decrementLine(line.product_id)}
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
                  updateLine(line.product_id, "quantity", Math.max(1, Number(e.target.value || 1)))
                }
              />

              <button
                onClick={() => incrementLine(line.product_id)}
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
              onChange={(e) => updateLine(line.product_id, "note", e.target.value)}
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
        onClick={() => fakeAction("Validation ticket")}
        className="mt-3 rounded-2xl bg-slate-950 px-4 py-4 text-sm font-black text-white"
      >
        Valider le ticket
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
              Maquette opérationnelle du futur POS cloud Dragon Edition.
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

      {!activeTerminal?.id && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Aucun poste actif détecté. Pour la suite POS multi-machine, il faudra se connecter avec un poste sélectionné.
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-2">
          <div className="rounded-3xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">Catégories</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {DEMO_CATEGORIES.length - 1}
              </span>
            </div>

            <div className="flex gap-2 overflow-x-auto xl:flex-col">
              {DEMO_CATEGORIES.map((category) => {
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
                  Sélection rapide tactile. Version locale en attendant l’API vente.
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
                    <div>
                      <div className="font-black text-slate-900">{product.name}</div>
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

              {filteredProducts.length === 0 && (
                <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  Aucun produit trouvé.
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