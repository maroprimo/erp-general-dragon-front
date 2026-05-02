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
  {
    id: 1,
    product_id: 1,
    name: "Pizza Regina",
    category: "pizza",
    price: 28000,
    station: "Cuisine Pizza",
  },
  {
    id: 2,
    product_id: 2,
    name: "Poulet BBQ",
    category: "poulet",
    price: 26000,
    station: "Cuisine Chaude",
  },
  {
    id: 3,
    product_id: 3,
    name: "Coca-Cola",
    category: "boisson",
    price: 5000,
    station: "Bar / Boissons",
  },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Espèces" },
  { value: "mvola", label: "MVola" },
  { value: "orange_money", label: "Orange Money" },
  { value: "airtel_money", label: "Airtel Money" },
  { value: "card", label: "Carte" },
  { value: "cheque", label: "Chèque" },
  { value: "voucher", label: "Bon d'achat" },
  { value: "other", label: "Autres" },
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

function makeLineKey(line) {
  if (line?.line_key) return String(line.line_key);
  if (line?.is_existing_sale_item) return `existing-${line.sale_item_id || line.id}`;
  return `new-${line.menu_item_id || line.pos_menu_item_id || line.product_id || line.id}`;
}

function normalizeSaleItemToCartLine(item) {
  return {
    line_key: `existing-${item.id}`,
    sale_item_id: item.id,
    is_existing_sale_item: true,
    menu_item_id: `existing-${item.id}`,
    product_id: item.product_id || item.product?.id || null,
    pos_menu_item_id: item.pos_menu_item_id || item.pos_menu_item?.id || item.posMenuItem?.id || null,
    name: item.product_name_snapshot || item.name || item.product?.name || "Article",
    category: item.category_snapshot || item.category || null,
    station: item.station_snapshot || item.station || null,
    unit_name: item.unit_name_snapshot || item.unit_name || "",
    quantity: Number(item.quantity || 0),
    price: Number(item.unit_price || item.price || 0),
    note: item.note || "",
  };
}

export default function SalesPOS({ setPage }) {
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
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentLines, setPaymentLines] = useState([]);

  const [tableOrderContext, setTableOrderContext] = useState(null);
  const [existingTableSale, setExistingTableSale] = useState(null);
  const [existingSaleItems, setExistingSaleItems] = useState([]);

  const storageKey = useMemo(() => {
    return `sales_pos_draft_${user?.id || "guest"}_${activeTerminal?.id || "no-terminal"}`;
  }, [user?.id, activeTerminal?.id]);

  const totalItems = useMemo(() => {
    return draft.lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
  }, [draft.lines]);

  const subtotal = useMemo(() => {
    return draft.lines.reduce(
      (sum, line) => sum + Number(line.quantity || 0) * Number(line.price || 0),
      0
    );
  }, [draft.lines]);

  const newCartLines = useMemo(
    () => draft.lines.filter((line) => !line.is_existing_sale_item),
    [draft.lines]
  );

  const paymentTotal = useMemo(() => {
    return paymentLines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
  }, [paymentLines]);

  const paymentBalance = useMemo(() => {
    return Math.max(subtotal - paymentTotal, 0);
  }, [subtotal, paymentTotal]);

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

  const reloadTableSale = async (tableSessionId) => {
    if (!tableSessionId) return null;

    const res = await api.get(`/sales/by-table-session/${tableSessionId}`);
    const sale = res.data?.data || null;

    if (!sale) {
      setExistingTableSale(null);
      setExistingSaleItems([]);
      return null;
    }

    const saleItems = Array.isArray(sale.items) ? sale.items : [];
    const existingCartLines = saleItems.map(normalizeSaleItemToCartLine);

    setExistingTableSale(sale);
    setExistingSaleItems(saleItems);
    setDraft((prev) => ({
      ...prev,
      orderType: "salle",
      tableLabel: tableOrderContext?.table_label || sale.table_label || prev.tableLabel,
      customerName: tableOrderContext?.customer_name || prev.customerName || "",
      customerPhone: tableOrderContext?.customer_phone || prev.customerPhone || "",
      lines: existingCartLines,
    }));

    return sale;
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
    const loadTableContext = async () => {
      const raw = localStorage.getItem("pending_table_order_context");
      if (!raw) return;

      try {
        const context = JSON.parse(raw);
        setTableOrderContext(context);

        setDraft((prev) => ({
          ...prev,
          orderType: "salle",
          tableLabel: context.table_label || "",
          customerName: context.customer_name || "",
          customerPhone: context.customer_phone || "",
        }));

        toast.success(`Commande table ${context.table_label}`);

        if (context.table_session_id) {
          const res = await api.get(`/sales/by-table-session/${context.table_session_id}`);
          const sale = res.data?.data || null;

          if (sale) {
            const saleItems = Array.isArray(sale.items) ? sale.items : [];
            const existingCartLines = saleItems.map(normalizeSaleItemToCartLine);

            setExistingTableSale(sale);
            setExistingSaleItems(saleItems);
            setDraft((prev) => ({
              ...prev,
              orderType: "salle",
              tableLabel: context.table_label || sale.table_label || "",
              customerName: context.customer_name || "",
              customerPhone: context.customer_phone || "",
              lines: existingCartLines,
            }));
          } else {
            setExistingTableSale(null);
            setExistingSaleItems([]);
            setDraft((prev) => ({
              ...prev,
              orderType: "salle",
              tableLabel: context.table_label || "",
              customerName: context.customer_name || "",
              customerPhone: context.customer_phone || "",
              lines: [],
            }));
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadTableContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(draft));
    } catch (error) {
      console.error(error);
    }
  }, [draft, storageKey]);

  useEffect(() => {
    loadCatalog(draft.orderType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.orderType]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      const productCategory = String(product.category || "").toLowerCase();

      const categoryOk =
        selectedCategory === "all" || productCategory === String(selectedCategory).toLowerCase();

      const searchOk = term
        ? `${product.name} ${product.station} ${product.category} ${product.product_name || ""} ${
            product.product_code || ""
          }`
            .toLowerCase()
            .includes(term)
        : true;

      return categoryOk && searchOk;
    });
  }, [products, selectedCategory, search]);

  const addToTicket = (product) => {
    setDraft((prev) => {
      const exists = prev.lines.find(
        (line) =>
          !line.is_existing_sale_item &&
          Number(line.menu_item_id || line.pos_menu_item_id) === Number(product.id)
      );

      if (exists) {
        return {
          ...prev,
          lines: prev.lines.map((line) =>
            makeLineKey(line) === makeLineKey(exists)
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
            line_key: `new-${product.id}-${Date.now()}`,
            menu_item_id: product.id,
            product_id: product.product_id,
            pos_menu_item_id: product.id,
            name: product.name,
            category: product.category,
            station: product.station,
            quantity: 1,
            price: product.price,
            note: "",
            unit_name: product.unit_name || "",
            is_existing_sale_item: false,
          },
        ],
      };
    });
  };

  const updateLine = (lineKey, field, value) => {
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.map((line) =>
        makeLineKey(line) === String(lineKey) && !line.is_existing_sale_item
          ? { ...line, [field]: value }
          : line
      ),
    }));
  };

  const incrementLine = (lineKey) => {
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.map((line) =>
        makeLineKey(line) === String(lineKey) && !line.is_existing_sale_item
          ? { ...line, quantity: Number(line.quantity) + 1 }
          : line
      ),
    }));
  };

  const decrementLine = (lineKey) => {
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines
        .map((line) =>
          makeLineKey(line) === String(lineKey) && !line.is_existing_sale_item
            ? { ...line, quantity: Math.max(1, Number(line.quantity) - 1) }
            : line
        )
        .filter((line) => Number(line.quantity) > 0),
    }));
  };

  const removeLine = (lineKey) => {
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.filter(
        (line) => line.is_existing_sale_item || makeLineKey(line) !== String(lineKey)
      ),
    }));
  };

  const clearTicket = () => {
    const hasOnlyExistingLines = draft.lines.length > 0 && newCartLines.length === 0;

    if (hasOnlyExistingLines) {
      toast("Les lignes déjà envoyées ne peuvent pas être supprimées ici.");
      return;
    }

    const ok = window.confirm(
      existingTableSale?.id
        ? "Voulez-vous supprimer uniquement les nouveaux articles non envoyés ?"
        : "Voulez-vous vider le ticket ?"
    );
    if (!ok) return;

    setDraft((prev) => ({
      ...prev,
      lines: existingTableSale?.id ? prev.lines.filter((line) => line.is_existing_sale_item) : [],
      notes: "",
    }));

    toast.success(existingTableSale?.id ? "Nouveaux articles retirés" : "Ticket vidé");
  };

  const resetDraft = () => {
    const ok = window.confirm("Voulez-vous réinitialiser complètement le brouillon POS ?");
    if (!ok) return;

    const next = getInitialDraft();
    setDraft(next);
    setPaymentLines([]);
    setExistingTableSale(null);
    setExistingSaleItems([]);
    setTableOrderContext(null);
    sessionStorage.removeItem(storageKey);
    localStorage.removeItem("pending_table_order_context");
    toast.success("Brouillon réinitialisé");
  };

  const openCheckoutWithMethod = (method) => {
    if (!draft.lines.length) {
      toast.error("Le ticket est vide");
      return;
    }

    setPaymentLines([
      {
        payment_method: method,
        amount: subtotal,
        received_amount: subtotal,
        reference: "",
        notes: "",
      },
    ]);
    setCheckoutOpen(true);
  };

  const addPaymentLine = () => {
    setPaymentLines((prev) => [
      ...prev,
      {
        payment_method: "cash",
        amount: paymentBalance > 0 ? paymentBalance : 0,
        received_amount: paymentBalance > 0 ? paymentBalance : 0,
        reference: "",
        notes: "",
      },
    ]);
  };

  const updatePaymentLine = (index, field, value) => {
    setPaymentLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;

        const next = { ...line, [field]: value };

        if (field === "payment_method" && value !== "cash") {
          next.received_amount = next.amount;
        }

        return next;
      })
    );
  };

  const removePaymentLine = (index) => {
    setPaymentLines((prev) => prev.filter((_, i) => i !== index));
  };

  const buildSaleLinesPayload = (lines) => {
    return lines.map((line) => ({
      product_id: line.product_id || null,
      pos_menu_item_id: line.pos_menu_item_id || line.menu_item_id || null,
      name: line.name,
      category: line.category || null,
      station: line.station || null,
      unit_name: line.unit_name || null,
      quantity: Number(line.quantity || 0),
      price: Number(line.price || 0),
      note: line.note || null,
    }));
  };

  const finishTableContextAfterPayment = () => {
    if (!tableOrderContext?.table_session_id) return;

    localStorage.removeItem("pending_table_order_context");
    setTableOrderContext(null);
    setExistingTableSale(null);
    setExistingSaleItems([]);

    if (typeof setPage === "function") {
      setPage("restaurantFloorPlan");
    }
  };

  const validateSale = async (withPayments = false) => {
    const hasExistingTableSale = tableOrderContext?.table_session_id && existingTableSale?.id;

    if (!draft.lines.length) {
      toast.error("Le ticket est vide");
      return;
    }

    if (hasExistingTableSale && !withPayments && newCartLines.length === 0) {
      toast("Aucun nouvel article à ajouter. Vous pouvez procéder au paiement.");
      return;
    }

    try {
      setSavingSale(true);

      let sale = existingTableSale || null;

      if (hasExistingTableSale) {
        if (newCartLines.length > 0) {
          const res = await api.post(`/sales/${existingTableSale.id}/add-items`, {
            lines: buildSaleLinesPayload(newCartLines),
          });
          sale = res.data?.data || existingTableSale;
        }
      } else {
        const payload = {
          site_id: tableOrderContext?.site_id || activeTerminal?.site_id || user?.site_id || null,
          warehouse_id: activeTerminal?.warehouse_id || user?.warehouse_id || null,
          terminal_id: activeTerminal?.id || null,
          table_session_id: tableOrderContext?.table_session_id || null,
          order_type: tableOrderContext?.order_type || draft.orderType,
          table_label:
            tableOrderContext?.table_label || (draft.orderType === "salle" ? draft.tableLabel || null : null),
          customer_name:
            tableOrderContext?.customer_name ||
            (draft.orderType === "livraison" ? draft.customerName || null : null),
          customer_phone:
            tableOrderContext?.customer_phone ||
            (draft.orderType === "livraison" ? draft.customerPhone || null : null),
          notes: draft.notes || null,
          status: "validated",
          lines: buildSaleLinesPayload(draft.lines),
        };

        const res = await api.post("/sales", payload);
        sale = res.data?.data;
      }

      if (withPayments && sale?.id) {
        for (const line of paymentLines) {
          const paymentPayload = {
            payment_method: line.payment_method,
            amount: Number(line.amount || 0),
            received_amount:
              line.payment_method === "cash"
                ? Number(line.received_amount || 0)
                : Number(line.amount || 0),
            reference: line.reference || null,
            notes: line.notes || null,
            terminal_id: activeTerminal?.id || null,
          };

          await api.post(`/sales/${sale.id}/payments`, paymentPayload);
        }
      }

      toast.success(
        hasExistingTableSale && newCartLines.length > 0
          ? "Articles ajoutés à la commande."
          : "Vente enregistrée avec succès."
      );

      setPaymentLines([]);
      setCheckoutOpen(false);
      setTicketOpen(false);

      if (withPayments) {
        const next = getInitialDraft();
        setDraft(next);
        sessionStorage.removeItem(storageKey);
        finishTableContextAfterPayment();
        return;
      }

      if (tableOrderContext?.table_session_id) {
        try {
          const reloadedSale = await reloadTableSale(tableOrderContext.table_session_id);

          if (!reloadedSale && sale?.items) {
            const saleItems = Array.isArray(sale.items) ? sale.items : [];
            setExistingTableSale(sale);
            setExistingSaleItems(saleItems);
            setDraft((prev) => ({
              ...prev,
              orderType: "salle",
              tableLabel: tableOrderContext.table_label || "",
              lines: saleItems.map(normalizeSaleItemToCartLine),
            }));
          }
        } catch (err) {
          console.error("Erreur reload commande table", err);
        }
      } else {
        const next = getInitialDraft();
        setDraft(next);
        sessionStorage.removeItem(storageKey);
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur enregistrement vente");
    } finally {
      setSavingSale(false);
    }
  };

  const filteredPaymentMethods = PAYMENT_METHODS;

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

      {tableOrderContext && (
        <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-800">
          <div className="text-sm font-semibold">Commande en salle</div>
          <div className="text-2xl font-black">Table {tableOrderContext.table_label}</div>
          <div className="text-sm">
            Couverts : {tableOrderContext.guest_count || 1}
            {tableOrderContext.customer_name ? ` • Client : ${tableOrderContext.customer_name}` : ""}
          </div>

          {existingTableSale && (
            <div className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-700">
              <div className="font-black">Ticket existant : {existingTableSale.sale_number}</div>
              <div className="mt-1 text-xs text-slate-500">
                Les lignes marquées “Déjà envoyé” sont affichées dans le panier, mais ne seront pas renvoyées.
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("pending_table_order_context");
              setTableOrderContext(null);
              setExistingTableSale(null);
              setExistingSaleItems([]);
              setDraft(getInitialDraft());
              toast("Contexte table retiré");
            }}
            className="mt-3 rounded-xl bg-white px-3 py-2 text-sm font-bold text-blue-700"
          >
            Retirer la table
          </button>
        </div>
      )}

      <div className="mb-4 grid grid-cols-3 gap-2">
        <button
          onClick={() => setDraft((prev) => ({ ...prev, orderType: "comptoir" }))}
          disabled={Boolean(tableOrderContext)}
          className={`rounded-2xl px-3 py-3 text-sm font-bold disabled:opacity-50 ${
            draft.orderType === "comptoir" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
          }`}
        >
          Comptoir
        </button>

        <button
          onClick={() => setDraft((prev) => ({ ...prev, orderType: "salle" }))}
          className={`rounded-2xl px-3 py-3 text-sm font-bold ${
            draft.orderType === "salle" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
          }`}
        >
          Salle
        </button>

        <button
          onClick={() => setDraft((prev) => ({ ...prev, orderType: "livraison" }))}
          disabled={Boolean(tableOrderContext)}
          className={`rounded-2xl px-3 py-3 text-sm font-bold disabled:opacity-50 ${
            draft.orderType === "livraison" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
          }`}
        >
          Livraison
        </button>
      </div>

      {draft.orderType === "salle" && !tableOrderContext && (
        <input
          className="mb-3 rounded-2xl border p-3 text-sm"
          placeholder="Table / salle"
          value={draft.tableLabel}
          onChange={(e) => setDraft((prev) => ({ ...prev, tableLabel: e.target.value }))}
        />
      )}

      {draft.orderType === "livraison" && (
        <div className="mb-3 grid grid-cols-1 gap-2">
          <input
            className="rounded-2xl border p-3 text-sm"
            placeholder="Nom client"
            value={draft.customerName}
            onChange={(e) => setDraft((prev) => ({ ...prev, customerName: e.target.value }))}
          />
          <input
            className="rounded-2xl border p-3 text-sm"
            placeholder="Téléphone client"
            value={draft.customerPhone}
            onChange={(e) => setDraft((prev) => ({ ...prev, customerPhone: e.target.value }))}
          />
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {draft.lines.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            Ticket vide. Sélectionnez un produit.
          </div>
        )}

        {draft.lines.map((line) => {
          const lineKey = makeLineKey(line);
          const isExisting = Boolean(line.is_existing_sale_item);

          return (
            <div
              key={lineKey}
              className={`rounded-3xl border p-3 ${isExisting ? "border-blue-200 bg-blue-50" : "border-slate-100 bg-white"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-black text-slate-900">
                    {line.name}
                    {isExisting && (
                      <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        Déjà envoyé
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {line.station || "-"} • {line.category || "-"}
                  </div>
                </div>

                {!isExisting && (
                  <button
                    onClick={() => removeLine(lineKey)}
                    className="rounded-xl bg-red-50 px-2 py-1 text-xs font-bold text-red-700"
                  >
                    Retirer
                  </button>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => decrementLine(lineKey)}
                  disabled={isExisting}
                  className="h-10 w-10 rounded-2xl bg-slate-100 text-lg font-black text-slate-700 disabled:opacity-40"
                >
                  -
                </button>

                <input
                  type="number"
                  min="1"
                  disabled={isExisting}
                  className="h-10 w-16 rounded-2xl border text-center font-black disabled:bg-slate-100 disabled:text-slate-500"
                  value={line.quantity}
                  onChange={(e) => updateLine(lineKey, "quantity", Number(e.target.value || 1))}
                />

                <button
                  onClick={() => incrementLine(lineKey)}
                  disabled={isExisting}
                  className="h-10 w-10 rounded-2xl bg-slate-900 text-lg font-black text-white disabled:opacity-40"
                >
                  +
                </button>

                <div className="ml-auto text-right">
                  <div className="text-xs text-slate-500">{formatMoney(line.price)} Ar</div>
                  <div className="font-black text-slate-900">
                    {formatMoney(Number(line.quantity) * Number(line.price))} Ar
                  </div>
                </div>
              </div>

              <input
                className="mt-3 w-full rounded-2xl border p-2 text-sm disabled:bg-slate-100"
                placeholder="Remarque ligne"
                disabled={isExisting}
                value={line.note || ""}
                onChange={(e) => updateLine(lineKey, "note", e.target.value)}
              />
            </div>
          );
        })}
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
          onClick={() => openCheckoutWithMethod("cash")}
          className="rounded-2xl bg-emerald-600 px-4 py-4 text-sm font-black text-white"
        >
          Espèces
        </button>
        <button
          onClick={() => openCheckoutWithMethod("mvola")}
          className="rounded-2xl bg-yellow-400 px-4 py-4 text-sm font-black text-slate-900"
        >
          MVola
        </button>
        <button
          onClick={() => openCheckoutWithMethod("orange_money")}
          className="rounded-2xl bg-orange-500 px-4 py-4 text-sm font-black text-white"
        >
          Orange Money
        </button>
        <button
          onClick={() => openCheckoutWithMethod("card")}
          className="rounded-2xl bg-blue-600 px-4 py-4 text-sm font-black text-white"
        >
          Carte
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2">
        <button
          onClick={() => {
            if (!draft.lines.length) {
              toast.error("Le ticket est vide");
              return;
            }
            setPaymentLines([
              {
                payment_method: "cash",
                amount: subtotal,
                received_amount: subtotal,
                reference: "",
                notes: "",
              },
            ]);
            setCheckoutOpen(true);
          }}
          className="rounded-2xl bg-slate-800 px-4 py-4 text-sm font-black text-white"
        >
          Encaisser / paiement mixte
        </button>

        <button
          onClick={() => validateSale(false)}
          disabled={savingSale}
          className="rounded-2xl bg-slate-950 px-4 py-4 text-sm font-black text-white disabled:opacity-60"
        >
          {savingSale ? "Enregistrement..." : existingTableSale?.id ? "Ajouter à la commande" : "Valider sans paiement"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-5 text-white shadow-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">POS Vente — Sprint 1</h1>
            <p className="mt-1 text-sm text-slate-200">Catalogue réel POS branché au backend.</p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm">
              <div className="text-slate-300">Site</div>
              <div className="font-bold">{activeTerminal?.site_name || user?.site?.name || "Non défini"}</div>
            </div>

            <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm">
              <div className="text-slate-300">Dépôt</div>
              <div className="font-bold">
                {activeTerminal?.warehouse_name || user?.warehouse?.name || "Non défini"}
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm">
              <div className="text-slate-300">Poste</div>
              <div className="font-bold">{activeTerminal?.name || "Aucun poste"}</div>
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
                      active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
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
                      <div className="mt-1 text-xs font-medium text-slate-500">{product.station}</div>
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

      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Encaissement</h2>
                <p className="text-sm text-slate-500">Total à encaisser : {formatMoney(subtotal)} Ar</p>
              </div>
              <button
                onClick={() => setCheckoutOpen(false)}
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700"
              >
                Fermer
              </button>
            </div>

            <div className="space-y-3">
              {paymentLines.map((line, index) => (
                <div key={index} className="grid grid-cols-1 gap-2 rounded-2xl bg-slate-50 p-3 md:grid-cols-5">
                  <select
                    className="rounded-xl border p-2"
                    value={line.payment_method}
                    onChange={(e) => updatePaymentLine(index, "payment_method", e.target.value)}
                  >
                    {filteredPaymentMethods.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    className="rounded-xl border p-2"
                    value={line.amount}
                    onChange={(e) => updatePaymentLine(index, "amount", e.target.value)}
                    placeholder="Montant"
                  />

                  <input
                    type="number"
                    className="rounded-xl border p-2"
                    value={line.received_amount}
                    onChange={(e) => updatePaymentLine(index, "received_amount", e.target.value)}
                    placeholder="Reçu"
                  />

                  <input
                    className="rounded-xl border p-2"
                    value={line.reference}
                    onChange={(e) => updatePaymentLine(index, "reference", e.target.value)}
                    placeholder="Référence"
                  />

                  <button
                    onClick={() => removePaymentLine(index)}
                    className="rounded-xl bg-red-100 px-3 py-2 text-sm font-bold text-red-700"
                  >
                    Retirer
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl bg-slate-900 p-4 text-white">
              <div className="flex items-center justify-between text-sm">
                <span>Total paiements</span>
                <strong>{formatMoney(paymentTotal)} Ar</strong>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span>Reste</span>
                <strong>{formatMoney(paymentBalance)} Ar</strong>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={addPaymentLine}
                className="rounded-xl bg-slate-100 px-4 py-3 font-bold text-slate-700"
              >
                Ajouter paiement
              </button>

              <button
                onClick={() => validateSale(true)}
                disabled={savingSale || paymentTotal <= 0 || paymentTotal < subtotal}
                className="ml-auto rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white disabled:opacity-60"
              >
                {savingSale ? "Encaissement..." : "Valider encaissement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
