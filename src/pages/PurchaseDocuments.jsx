import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const INVOICE_ENDPOINT = "/supplier-invoices";

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function firstValue(...values) {
  return values.find((value) => value !== null && value !== undefined && value !== "");
}

function formatDateTime(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("fr-FR");
  } catch {
    return value;
  }
}

function formatNumber(value, digits = 3) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function formatMoney(value) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function displayUser(userLike) {
  if (!userLike) return "-";
  if (typeof userLike === "string") return userLike;
  return userLike?.name || userLike?.email || "-";
}

function workflowBadgeClass(status) {
  switch (status) {
    case "waiting_security":
      return "bg-slate-100 text-slate-700";
    case "security_verified":
      return "bg-orange-100 text-orange-700";
    case "stock_validated":
      return "bg-emerald-100 text-emerald-700";
    case "waiting_manager":
      return "bg-amber-100 text-amber-700";
    case "manager_verified":
      return "bg-blue-100 text-blue-700";
    case "invoiced":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function typeBadgeClass(type) {
  switch (type) {
    case "BC":
      return "bg-red-100 text-red-700";
    case "BR":
      return "bg-orange-100 text-orange-700";
    case "FACTURE":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function hydrateBcLines(lines = []) {
  return lines.map((line) => {
    const quantity = Number(line.quantity ?? 0);
    const accepted =
      line.accepted_quantity !== null && line.accepted_quantity !== undefined
        ? Number(line.accepted_quantity)
        : quantity;
    const rejected =
      line.rejected_quantity !== null && line.rejected_quantity !== undefined
        ? Number(line.rejected_quantity)
        : Math.max(quantity - accepted, 0);

    return {
      ...line,
      quantity,
      accepted_quantity: accepted,
      rejected_quantity: rejected,
    };
  });
}

function normalizePurchaseOrders(items = []) {
  return items
    .filter((doc) => {
      const source = String(doc?.source || "").trim().toLowerCase();
      return source !== "purchase_pos_br_direct";
    })
    .map((doc) => ({
      id: doc.id,
      doc_type: "BC",
      doc_number: doc.order_number || `BC-${doc.id}`,
      doc_date: doc.order_date || doc.created_at || null,
      status: doc.status || "-",
      workflow_status: doc.workflow_status || "-",
      qr_token: doc.qr_token || null,
      qr_scan_url: doc.qr_scan_url || null,

      security_verified_at: firstValue(
        doc.security_verified_at
      ),
      security_verified_by: firstValue(
        doc.security_verified_by,
        doc.securityVerifiedBy
      ),

      stock_validated_at: firstValue(
        doc.stock_validated_at
      ),
      stock_validated_by: firstValue(
        doc.stock_validated_by,
        doc.stockValidatedBy
      ),

      manager_verified_at: firstValue(
        doc.manager_verified_at
      ),
      manager_verified_by: firstValue(
        doc.manager_verified_by,
        doc.managerVerifiedBy
      ),

      supplier_name: doc.supplier?.company_name || doc.supplier?.name || "-",
      site_name: doc.site?.name || "-",
      site_id: doc.site?.id ?? doc.site_id ?? null,
      warehouse_name: doc.warehouse?.name || "-",
      warehouse_id: doc.warehouse?.id ?? doc.warehouse_id ?? null,
      total_price: doc.total_price ?? doc.total_amount ?? null,
      notes: doc.notes || "",
      validated_to_br_at: doc.validated_to_br_at || null,
      generated_goods_receipt_id: doc.generated_goods_receipt_id || null,
      generated_goods_receipt:
        doc.generated_goods_receipt || doc.generatedGoodsReceipt || null,
      source: doc.source || null,
      lines: hydrateBcLines(doc.lines || []),
      raw: doc,
    }));
}

function normalizeGoodsReceipts(items = []) {
  return items.map((doc) => {
    const purchaseOrder = doc.purchaseOrder || doc.purchase_order || null;

    return {
      id: doc.id,
      doc_type: "BR",
      doc_number: doc.receipt_number || `BR-${doc.id}`,
      doc_date: doc.received_at || doc.document_date || doc.created_at || null,
      status: doc.status || "-",
      workflow_status: doc.workflow_status || "-",
      qr_token: doc.qr_token || null,
      qr_scan_url: doc.qr_scan_url || null,

      security_verified_at: firstValue(
        doc.security_verified_at,
        purchaseOrder?.security_verified_at
      ),
      security_verified_by: firstValue(
        doc.security_verified_by,
        doc.securityVerifiedBy,
        purchaseOrder?.security_verified_by,
        purchaseOrder?.securityVerifiedBy
      ),

      stock_validated_at: firstValue(
        doc.stock_validated_at,
        purchaseOrder?.stock_validated_at
      ),
      stock_validated_by: firstValue(
        doc.stock_validated_by,
        doc.stockValidatedBy,
        purchaseOrder?.stock_validated_by,
        purchaseOrder?.stockValidatedBy
      ),

      manager_verified_at: firstValue(
        doc.manager_verified_at
      ),
      manager_verified_by: firstValue(
        doc.manager_verified_by,
        doc.managerVerifiedBy
      ),

      invoiced_at: firstValue(doc.invoiced_at),
      stock_applied_at: firstValue(doc.stock_applied_at),
      source_type: doc.source_type || null,

      supplier_name:
        doc.supplier?.company_name ||
        doc.supplier?.name ||
        purchaseOrder?.supplier?.company_name ||
        purchaseOrder?.supplier?.name ||
        "-",

      site_name: doc.site?.name || "-",
      site_id: doc.site?.id ?? doc.site_id ?? null,
      warehouse_name: doc.warehouse?.name || "-",
      warehouse_id: doc.warehouse?.id ?? doc.warehouse_id ?? null,
      total_price: doc.total_price ?? null,
      notes: doc.notes || "",
      lines: doc.lines || [],
      raw: doc,
    };
  });
}

function normalizeInvoices(items = []) {
  return items.map((doc) => {
    const goodsReceipt = doc.goods_receipt || doc.goodsReceipt || null;
    const purchaseOrder =
      goodsReceipt?.purchaseOrder ||
      goodsReceipt?.purchase_order ||
      doc.purchaseOrder ||
      doc.purchase_order ||
      null;

    return {
      id: doc.id,
      doc_type: "FACTURE",
      doc_number: doc.invoice_number || `FAC-${doc.id}`,
      doc_date: doc.invoice_date || doc.created_at || null,
      status: doc.status || "-",
      workflow_status: doc.workflow_status || "-",
      qr_token: doc.qr_token || null,
      qr_scan_url: doc.qr_scan_url || null,

      security_verified_at: firstValue(
        doc.security_verified_at,
        goodsReceipt?.security_verified_at,
        purchaseOrder?.security_verified_at
      ),
      security_verified_by: firstValue(
        doc.security_verified_by,
        doc.securityVerifiedBy,
        goodsReceipt?.security_verified_by,
        goodsReceipt?.securityVerifiedBy,
        purchaseOrder?.security_verified_by,
        purchaseOrder?.securityVerifiedBy
      ),

      stock_validated_at: firstValue(
        doc.stock_validated_at,
        goodsReceipt?.stock_validated_at,
        purchaseOrder?.stock_validated_at
      ),
      stock_validated_by: firstValue(
        doc.stock_validated_by,
        doc.stockValidatedBy,
        goodsReceipt?.stock_validated_by,
        goodsReceipt?.stockValidatedBy,
        purchaseOrder?.stock_validated_by,
        purchaseOrder?.stockValidatedBy
      ),

      manager_verified_at: firstValue(
        doc.validated_at,
        doc.admin_validated_at,
        doc.manager_verified_at,
        goodsReceipt?.manager_verified_at
      ),
      manager_verified_by: firstValue(
        doc.validated_by,
        doc.validatedBy,
        doc.admin_validated_by,
        doc.adminValidatedBy,
        doc.manager_verified_by,
        doc.managerVerifiedBy,
        goodsReceipt?.manager_verified_by,
        goodsReceipt?.managerVerifiedBy
      ),

      supplier_name: doc.supplier?.company_name || doc.supplier?.name || "-",
      site_name: doc.site?.name || goodsReceipt?.site?.name || "-",
      site_id:
        doc.site?.id ??
        doc.site_id ??
        goodsReceipt?.site?.id ??
        goodsReceipt?.site_id ??
        null,
      warehouse_name: goodsReceipt?.warehouse?.name || doc.warehouse?.name || "-",
      warehouse_id:
        goodsReceipt?.warehouse?.id ??
        goodsReceipt?.warehouse_id ??
        doc.warehouse?.id ??
        doc.warehouse_id ??
        null,
      total_price: doc.amount_ttc ?? doc.total_price ?? null,
      notes: doc.notes || "",
      goods_receipt: goodsReceipt,
      lines: doc.lines || [],
      raw: doc,
    };
  });
}

function computeLineQuantity(line) {
  return (
    line.quantity ??
    line.received_quantity ??
    line.accepted_quantity ??
    line.ordered_quantity ??
    0
  );
}

function computeLineUnitPrice(line) {
  return line.unit_price ?? line.unit_cost ?? 0;
}

export default function PurchaseDocuments() {
  const { user } = useAuth();
  const isStockSiteUser = user?.role === "stock";

  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [tab, setTab] = useState("ALL");
  const [filters, setFilters] = useState({
    search: "",
    workflow_status: "",
  });

  const backendWeb = import.meta.env.VITE_BACKEND_WEB_URL || "";
  const backendWebWithIndex = backendWeb.includes("/index.php")
    ? backendWeb
    : `${backendWeb}/index.php`;

  const printUrl = (doc) => {
    const type =
      doc.doc_type === "BC" ? "bc" : doc.doc_type === "BR" ? "br" : "fac";
    return `${backendWebWithIndex}/print/purchase-document/${type}/${doc.id}`;
  };

  const refreshDocuments = async (focus = null) => {
    try {
      setLoading(true);

      const [poRes, grRes, invRes] = await Promise.allSettled([
        api.get("/purchase-orders"),
        api.get("/goods-receipts"),
        api.get(INVOICE_ENDPOINT),
      ]);

      const purchaseOrders =
        poRes.status === "fulfilled" ? asArray(poRes.value.data) : [];
      const goodsReceipts =
        grRes.status === "fulfilled" ? asArray(grRes.value.data) : [];
      const invoices =
        invRes.status === "fulfilled" ? asArray(invRes.value.data) : [];

      if (poRes.status === "rejected") console.error("Erreur BC:", poRes.reason);
      if (grRes.status === "rejected") console.error("Erreur BR:", grRes.reason);
      if (invRes.status === "rejected") console.error("Erreur Factures:", invRes.reason);

      let normalized = [
        ...normalizePurchaseOrders(purchaseOrders),
        ...normalizeGoodsReceipts(goodsReceipts),
        ...normalizeInvoices(invoices),
      ];

      if (isStockSiteUser && user?.site_id) {
        normalized = normalized.filter(
          (doc) => Number(doc.site_id) === Number(user.site_id)
        );
      }

      normalized = normalized.sort((a, b) => {
        const da = a.doc_date ? new Date(a.doc_date).getTime() : 0;
        const db = b.doc_date ? new Date(b.doc_date).getTime() : 0;
        return db - da;
      });

      setDocuments(normalized);

      const target =
        (focus &&
          normalized.find(
            (d) => d.doc_type === focus.doc_type && Number(d.id) === Number(focus.id)
          )) ||
        (selectedDoc &&
          normalized.find(
            (d) =>
              d.doc_type === selectedDoc.doc_type &&
              Number(d.id) === Number(selectedDoc.id)
          )) ||
        normalized[0] ||
        null;

      setSelectedDoc(target);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les documents d’achats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, user?.site_id]);

  const stats = useMemo(() => {
    return {
      all: documents.length,
      bc: documents.filter((d) => d.doc_type === "BC").length,
      br: documents.filter((d) => d.doc_type === "BR").length,
      fact: documents.filter((d) => d.doc_type === "FACTURE").length,
      waitingSecurity: documents.filter((d) => d.workflow_status === "waiting_security")
        .length,
      securityVerified: documents.filter((d) => d.workflow_status === "security_verified")
        .length,
      managerVerified: documents.filter((d) => d.workflow_status === "manager_verified")
        .length,
      invoiced: documents.filter((d) => d.workflow_status === "invoiced").length,
    };
  }, [documents]);

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const tabOk = tab === "ALL" ? true : doc.doc_type === tab;

      const workflowOk = filters.workflow_status
        ? doc.workflow_status === filters.workflow_status
        : true;

      const haystack = [
        doc.doc_number,
        doc.doc_type,
        doc.status,
        doc.workflow_status,
        doc.supplier_name,
        doc.site_name,
        doc.warehouse_name,
        doc.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const searchOk = filters.search
        ? haystack.includes(filters.search.toLowerCase())
        : true;

      return tabOk && workflowOk && searchOk;
    });
  }, [documents, tab, filters]);

  const isDirectBr =
    selectedDoc?.doc_type === "BR" &&
    String(selectedDoc?.source_type || "").toLowerCase() === "purchase_pos_direct";

  const canEditBc =
    selectedDoc?.doc_type === "BC" &&
    !selectedDoc?.generated_goods_receipt_id &&
    !!selectedDoc?.stock_validated_at &&
    selectedDoc?.workflow_status === "stock_validated";

  const canValidateBcToBr = canEditBc;

  const canInvoiceBr =
    selectedDoc?.doc_type === "BR" &&
    !!selectedDoc?.manager_verified_at &&
    !selectedDoc?.invoiced_at;

  const updateBcLine = (lineId, field, value) => {
    setSelectedDoc((prev) => {
      if (!prev || prev.doc_type !== "BC") return prev;

      const lines = prev.lines.map((line) => {
        if (Number(line.id) !== Number(lineId)) return line;

        const quantity = Number(line.quantity || 0);
        const numericValue = value === "" ? "" : Number(value);

        let accepted =
          field === "accepted_quantity"
            ? numericValue
            : Number(line.accepted_quantity ?? quantity);

        let rejected =
          field === "rejected_quantity"
            ? numericValue
            : Number(line.rejected_quantity ?? 0);

        if (accepted === "") accepted = 0;
        if (rejected === "") rejected = 0;

        return {
          ...line,
          accepted_quantity: accepted,
          rejected_quantity: rejected,
          quantity,
        };
      });

      return { ...prev, lines };
    });
  };

  const validateBcToBr = async () => {
    if (!selectedDoc || selectedDoc.doc_type !== "BC") return;

    for (const line of selectedDoc.lines) {
      const quantity = Number(line.quantity || 0);
      const accepted = Number(line.accepted_quantity || 0);
      const rejected = Number(line.rejected_quantity || 0);

      if (accepted < 0 || rejected < 0) {
        toast.error("Les quantités ne peuvent pas être négatives.");
        return;
      }

      if (Number((accepted + rejected).toFixed(3)) !== Number(quantity.toFixed(3))) {
        toast.error(
          `La somme acceptée + rejetée doit être égale à la quantité commandée pour ${
            line.product?.name || line.name || "une ligne"
          }.`
        );
        return;
      }
    }

    try {
      setProcessing(true);

      const payload = {
        notes: selectedDoc.notes || "",
        lines: selectedDoc.lines.map((line) => ({
          line_id: line.id,
          accepted_quantity: Number(line.accepted_quantity || 0),
          rejected_quantity: Number(line.rejected_quantity || 0),
        })),
      };

      const res = await api.post(
        `/purchase-orders/${selectedDoc.id}/validate-to-br`,
        payload
      );

      toast.success(res.data?.message || "BC validé et converti en BR");

      const brId = res.data?.goods_receipt?.id;
      await refreshDocuments(
        brId ? { doc_type: "BR", id: brId } : { doc_type: "BC", id: selectedDoc.id }
      );
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Erreur lors de la validation du BC"
      );
    } finally {
      setProcessing(false);
    }
  };

  const createInvoiceFromBr = async () => {
    if (!selectedDoc || selectedDoc.doc_type !== "BR") return;

    try {
      setProcessing(true);
      const res = await api.post(`/goods-receipts/${selectedDoc.id}/create-invoice`);
      toast.success(res.data?.message || "Facture créée depuis BR");

      const invoiceId = res.data?.data?.id;
      await refreshDocuments(
        invoiceId
          ? { doc_type: "FACTURE", id: invoiceId }
          : { doc_type: "BR", id: selectedDoc.id }
      );
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur création facture");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="p-6">Chargement des documents d’achats...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Documents d’achats</h1>
          <p className="text-slate-500">
            Workflow final BC → BR → Facture avec QR, impression et validations.
          </p>
          {isStockSiteUser && user?.site_id && (
            <p className="mt-1 text-xs text-slate-400">
              Affichage limité aux documents de votre site.
            </p>
          )}
        </div>

        <button
          onClick={() => refreshDocuments()}
          className="rounded-xl bg-slate-900 px-4 py-3 text-white"
        >
          Rafraîchir
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-sm text-slate-500">Tous</div>
          <div className="text-2xl font-bold text-slate-800">{stats.all}</div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-sm text-slate-500">BC</div>
          <div className="text-2xl font-bold text-slate-800">{stats.bc}</div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-sm text-slate-500">BR</div>
          <div className="text-2xl font-bold text-slate-800">{stats.br}</div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-sm text-slate-500">Factures</div>
          <div className="text-2xl font-bold text-slate-800">{stats.fact}</div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-sm text-slate-500">Attente sécurité</div>
          <div className="text-2xl font-bold text-slate-800">
            {stats.waitingSecurity}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-sm text-slate-500">Sécurité OK</div>
          <div className="text-2xl font-bold text-slate-800">
            {stats.securityVerified}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-sm text-slate-500">Resp. vérifié</div>
          <div className="text-2xl font-bold text-slate-800">
            {stats.managerVerified}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-sm text-slate-500">Facturés</div>
          <div className="text-2xl font-bold text-slate-800">{stats.invoiced}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="mb-4 flex flex-wrap gap-2">
              {["ALL", "BC", "BR", "FACTURE"].map((item) => (
                <button
                  key={item}
                  onClick={() => setTab(item)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium ${
                    tab === item
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {item === "ALL" ? "Tous" : item}
                </button>
              ))}
            </div>

            <div className="mb-4 space-y-3">
              <input
                className="w-full rounded-xl border p-3"
                placeholder="Recherche numéro / fournisseur / site"
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
              />

              <select
                className="w-full rounded-xl border p-3"
                value={filters.workflow_status}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    workflow_status: e.target.value,
                  }))
                }
              >
                <option value="">Tous workflow</option>
                <option value="waiting_security">waiting_security</option>
                <option value="security_verified">security_verified</option>
                <option value="stock_validated">stock_validated</option>
                <option value="waiting_manager">waiting_manager</option>
                <option value="manager_verified">manager_verified</option>
                <option value="invoiced">invoiced</option>
              </select>
            </div>

            <div className="max-h-[72vh] space-y-3 overflow-y-auto pr-1">
              {filteredDocs.length === 0 && (
                <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                  Aucun document trouvé.
                </div>
              )}

              {filteredDocs.map((doc) => (
                <div
                  key={`${doc.doc_type}-${doc.id}`}
                  onClick={() => setSelectedDoc(doc)}
                  className={`cursor-pointer rounded-xl border p-4 transition ${
                    selectedDoc?.doc_type === doc.doc_type && selectedDoc?.id === doc.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-800">
                        {doc.doc_number}
                      </div>
                      <div className="text-sm text-slate-500">
                        {doc.supplier_name || "-"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDateTime(doc.doc_date)}
                      </div>
                    </div>

                    <span
                      className={`rounded-lg px-2 py-1 text-xs font-semibold ${typeBadgeClass(
                        doc.doc_type
                      )}`}
                    >
                      {doc.doc_type}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span
                      className={`rounded-lg px-2 py-1 text-xs font-semibold ${workflowBadgeClass(
                        doc.workflow_status
                      )}`}
                    >
                      {doc.workflow_status}
                    </span>

                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {doc.status}
                    </span>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(printUrl(doc), "_blank");
                      }}
                      className="rounded-xl bg-slate-900 px-3 py-2 text-white"
                    >
                      Imprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="xl:col-span-8">
          <div className="rounded-2xl bg-white p-6 shadow min-h-[72vh]">
            {!selectedDoc ? (
              <div className="flex h-full items-center justify-center text-slate-400">
                Aucun document sélectionné
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span
                        className={`rounded-lg px-2 py-1 text-xs font-semibold ${typeBadgeClass(
                          selectedDoc.doc_type
                        )}`}
                      >
                        {selectedDoc.doc_type}
                      </span>

                      <span
                        className={`rounded-lg px-2 py-1 text-xs font-semibold ${workflowBadgeClass(
                          selectedDoc.workflow_status
                        )}`}
                      >
                        {selectedDoc.workflow_status}
                      </span>
                    </div>

                    <h2 className="text-2xl font-bold text-slate-800">
                      {selectedDoc.doc_number}
                    </h2>

                    <p className="text-slate-500">
                      Fournisseur : {selectedDoc.supplier_name || "-"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => window.open(printUrl(selectedDoc), "_blank")}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-white"
                    >
                      Imprimer
                    </button>

                    {selectedDoc.qr_scan_url && (
                      <a
                        href={selectedDoc.qr_scan_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-blue-700 px-4 py-2 text-white"
                      >
                        Ouvrir scan
                      </a>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Date document</div>
                    <div className="font-semibold text-slate-800">
                      {formatDateTime(selectedDoc.doc_date)}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Site</div>
                    <div className="font-semibold text-slate-800">
                      {selectedDoc.site_name || "-"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Dépôt</div>
                    <div className="font-semibold text-slate-800">
                      {selectedDoc.warehouse_name || "-"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Montant total</div>
                    <div className="font-semibold text-slate-800">
                      {selectedDoc.total_price !== null
                        ? `${formatMoney(selectedDoc.total_price)} Ar`
                        : "-"}
                    </div>
                  </div>
                </div>

                {selectedDoc.doc_type === "BR" &&
                  isDirectBr &&
                  !selectedDoc?.manager_verified_at && (
                    <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
                      Ce BR direct doit être validé via “Ouvrir scan” avant intégration au stock.
                    </div>
                  )}

                {selectedDoc.doc_type === "BR" &&
                  isDirectBr &&
                  selectedDoc?.manager_verified_at && (
                    <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
                      Ce BR direct a été validé et intégré au stock.
                    </div>
                  )}

                {selectedDoc.qr_token && (
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <div className="mb-3 text-lg font-semibold text-slate-800">
                      QR du document
                    </div>

                    <div className="flex flex-col gap-4 md:flex-row md:items-start">
                      <img
                        src={`${backendWebWithIndex}/purchase-document-qr/${selectedDoc.qr_token}.svg`}
                        alt="QR document achat"
                        className="h-40 w-40 rounded-xl border bg-white p-2"
                      />

                      <div className="space-y-3">
                        <div className="text-sm text-slate-600 break-all">
                          {selectedDoc.qr_scan_url || "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Vérifié sécurité</div>
                    <div className="font-semibold text-slate-800">
                      {formatDateTime(selectedDoc.security_verified_at)}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {displayUser(selectedDoc.security_verified_by)}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Validation stock</div>
                    <div className="font-semibold text-slate-800">
                      {formatDateTime(selectedDoc.stock_validated_at)}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {displayUser(selectedDoc.stock_validated_by)}
                    </div>
                  </div>

                  {(selectedDoc.doc_type === "BR" || selectedDoc.doc_type === "FACTURE") && (
                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="text-sm text-slate-500">
                        {selectedDoc.doc_type === "FACTURE"
                          ? "Validation manager / admin"
                          : "Vérification responsable"}
                      </div>
                      <div className="font-semibold text-slate-800">
                        {formatDateTime(selectedDoc.manager_verified_at)}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {displayUser(selectedDoc.manager_verified_by)}
                      </div>
                    </div>
                  )}
                </div>

                {selectedDoc.notes && (
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Notes</div>
                    <div className="font-semibold text-slate-800">
                      {selectedDoc.notes}
                    </div>
                  </div>
                )}

                {selectedDoc.doc_type === "BC" &&
                  selectedDoc.generated_goods_receipt && (
                    <div className="rounded-xl bg-emerald-50 p-4">
                      <div className="text-sm font-semibold text-emerald-700">
                        BR généré
                      </div>
                      <div className="text-slate-700">
                        {selectedDoc.generated_goods_receipt.receipt_number || "-"}
                      </div>
                    </div>
                  )}

                {selectedDoc.doc_type === "BR" && selectedDoc.invoiced_at && (
                  <div className="rounded-xl bg-emerald-50 p-4">
                    <div className="text-sm font-semibold text-emerald-700">
                      Facturé le
                    </div>
                    <div className="text-slate-700">
                      {formatDateTime(selectedDoc.invoiced_at)}
                    </div>
                  </div>
                )}

                {(selectedDoc.doc_type === "BC" ||
                  selectedDoc.doc_type === "BR" ||
                  selectedDoc.doc_type === "FACTURE") &&
                  Array.isArray(selectedDoc.lines) &&
                  selectedDoc.lines.length > 0 && (
                    <div className="overflow-x-auto">
                      <h3 className="mb-3 text-xl font-semibold text-slate-800">
                        Lignes document
                      </h3>

                      <table className="min-w-full text-left">
                        <thead className="border-b border-slate-200">
                          <tr className="text-slate-600">
                            <th className="px-4 py-3">Produit</th>
                            <th className="px-4 py-3">Qté</th>
                            <th className="px-4 py-3">PU</th>
                            <th className="px-4 py-3">Montant</th>
                            {(selectedDoc.doc_type === "BC" ||
                              selectedDoc.doc_type === "BR") && (
                              <>
                                <th className="px-4 py-3">Acceptée</th>
                                <th className="px-4 py-3">Rejetée</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {selectedDoc.lines.map((line, index) => {
                            const qty = Number(computeLineQuantity(line) || 0);
                            const unitPrice = Number(computeLineUnitPrice(line) || 0);

                            return (
                              <tr
                                key={line.id || index}
                                className="border-b border-slate-100 hover:bg-slate-50"
                              >
                                <td className="px-4 py-3">
                                  {line.product?.name ||
                                    line.name ||
                                    line.product_name ||
                                    "-"}
                                </td>

                                <td className="px-4 py-3">{formatNumber(qty)}</td>

                                <td className="px-4 py-3">
                                  {formatMoney(unitPrice)} Ar
                                </td>

                                <td className="px-4 py-3">
                                  {formatMoney(qty * unitPrice)} Ar
                                </td>

                                {(selectedDoc.doc_type === "BC" ||
                                  selectedDoc.doc_type === "BR") && (
                                  <>
                                    <td className="px-4 py-3">
                                      {selectedDoc.doc_type === "BC" && canEditBc ? (
                                        <input
                                          type="number"
                                          step="0.001"
                                          className="w-28 rounded border p-2"
                                          value={line.accepted_quantity ?? qty}
                                          onChange={(e) =>
                                            updateBcLine(
                                              line.id,
                                              "accepted_quantity",
                                              e.target.value
                                            )
                                          }
                                        />
                                      ) : (
                                        formatNumber(line.accepted_quantity)
                                      )}
                                    </td>

                                    <td className="px-4 py-3">
                                      {selectedDoc.doc_type === "BC" && canEditBc ? (
                                        <input
                                          type="number"
                                          step="0.001"
                                          className="w-28 rounded border p-2"
                                          value={line.rejected_quantity ?? 0}
                                          onChange={(e) =>
                                            updateBcLine(
                                              line.id,
                                              "rejected_quantity",
                                              e.target.value
                                            )
                                          }
                                        />
                                      ) : (
                                        formatNumber(line.rejected_quantity)
                                      )}
                                    </td>
                                  </>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                <div className="flex flex-wrap gap-3">
                  {canValidateBcToBr && (
                    <button
                      onClick={validateBcToBr}
                      disabled={processing}
                      className="rounded-xl bg-emerald-700 px-4 py-3 text-white disabled:opacity-60"
                    >
                      {processing ? "Validation..." : "Valider BC → Générer BR"}
                    </button>
                  )}

                  {canInvoiceBr && (
                    <button
                      onClick={createInvoiceFromBr}
                      disabled={processing}
                      className="rounded-xl bg-emerald-700 px-4 py-3 text-white disabled:opacity-60"
                    >
                      {processing ? "Facturation..." : "Créer facture depuis BR"}
                    </button>
                  )}
                </div>

                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  Type : {selectedDoc.doc_type} | Statut métier : {selectedDoc.status}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}