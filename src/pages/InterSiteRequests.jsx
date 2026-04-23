import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import useReferences from "../hooks/useReferences";
import { formatDateTime, formatQty } from "../utils/formatters";

function extractCollection(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function extractItem(payload) {
  return payload?.data || payload;
}

function businessBadgeClass(status) {
  switch (String(status || "").trim().toLowerCase()) {
    case "pending":
      return "bg-slate-100 text-slate-700";
    case "approved":
      return "bg-blue-100 text-blue-700";
    case "in_transit":
      return "bg-amber-100 text-amber-700";
    case "completed":
      return "bg-emerald-100 text-emerald-700";
    case "rejected":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function transportBadgeClass(status) {
  switch (String(status || "").trim().toLowerCase()) {
    case "waiting":
      return "bg-slate-100 text-slate-700";
    case "security_verified":
      return "bg-orange-100 text-orange-700";
    case "picked_up":
      return "bg-blue-100 text-blue-700";
    case "received":
      return "bg-emerald-100 text-emerald-700";
    case "rejected":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function StatCard({ label, value, children }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-slate-800">
        {children || value || "-"}
      </div>
    </div>
  );
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true
  );
}

export default function InterSiteRequest() {
  const { user } = useAuth();

  const {
    sites: hookSites = [],
    warehouses: hookWarehouses = [],
    products: hookProducts = [],
    loading: hookRefsLoading,
  } = useReferences() || {};

  const [sites, setSites] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  const [refsLoading, setRefsLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvalDraftLines, setApprovalDraftLines] = useState([]);

  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    status: "",
  });

  const [form, setForm] = useState({
    from_site_id: "",
    to_site_id: "",
    from_warehouse_id: "",
    to_warehouse_id: "",
    notes: "",
    lines: [
      {
        product_id: "",
        requested_quantity: "",
        notes: "",
      },
    ],
  });

  const [selectedCategory, setSelectedCategory] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const role = String(user?.role || "").trim().toLowerCase();

  const isGlobalApprover = [
    "pdg",
    "admin",
    "administrateur",
    "superadmin",
    "super_admin",
  ].includes(role);

  const isSourceManagerRole = [
    "manager",
    "responsable",
    "coordinateur",
    "coordonnateur",
    "controleur",
    "contrôleur",
    "stock",
  ].includes(role);

  const isDriverRole = ["driver", "chauffeur", "livreur", "courier"].includes(role);

  const backendWeb = import.meta.env.VITE_BACKEND_WEB_URL || "";
  const backendWebWithIndex = backendWeb.includes("/index.php")
    ? backendWeb
    : `${backendWeb}/index.php`;

  useEffect(() => {
    const syncDisplay = () => {
      setIsMobile(window.innerWidth < 1280);
      setIsStandalone(isStandaloneMode());
    };

    syncDisplay();
    window.addEventListener("resize", syncDisplay);

    return () => window.removeEventListener("resize", syncDisplay);
  }, []);

  useEffect(() => {
    if (cartOpen || detailOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }

    document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen, detailOpen]);

  const loadReferenceFallbacks = async () => {
    try {
      let finalSites = Array.isArray(hookSites) ? hookSites : [];
      let finalWarehouses = Array.isArray(hookWarehouses) ? hookWarehouses : [];
      let finalProducts = Array.isArray(hookProducts) ? hookProducts : [];

      if (finalSites.length === 0) {
        const siteCandidates = ["/references/sites", "/sites"];
        for (const url of siteCandidates) {
          try {
            const res = await api.get(url);
            const rows = extractCollection(res.data);
            if (rows.length > 0) {
              finalSites = rows;
              break;
            }
          } catch (_) {}
        }
      }

      if (finalWarehouses.length === 0) {
        const warehouseCandidates = ["/references/warehouses", "/warehouses"];
        for (const url of warehouseCandidates) {
          try {
            const res = await api.get(url);
            const rows = extractCollection(res.data);
            if (Array.isArray(rows) && rows.length > 0) {
              finalWarehouses = rows;
              break;
            }
          } catch (e) {
            console.error(`Échec de l'appel sur ${url}:`, e?.response?.status, e.message);
          }
        }
      }

      if (finalProducts.length === 0) {
        const productCandidates = ["/products", "/references/products-by-category"];
        for (const url of productCandidates) {
          try {
            const res = await api.get(url);
            const rows = extractCollection(res.data);
            if (rows.length > 0) {
              finalProducts = rows;
              break;
            }
          } catch (_) {}
        }
      }

      setSites(finalSites);
      setWarehouses(finalWarehouses);
      setProducts(finalProducts);

      if (
        finalSites.length === 0 ||
        finalWarehouses.length === 0 ||
        finalProducts.length === 0
      ) {
        toast.error("Certaines références sont incomplètes. Vérifie les endpoints.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les références.");
    } finally {
      setRefsLoading(false);
    }
  };

  const loadRequests = async () => {
    try {
      setRequestsLoading(true);
      const res = await api.get("/inter-site-requests");
      const rows = extractCollection(res.data);
      setRequests(rows);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les BT");
    } finally {
      setRequestsLoading(false);
    }
  };

  const loadPendingCount = async () => {
    try {
      const res = await api.get("/inter-site-requests/pending-count");
      const count = Number(res?.data?.count || 0);
      setPendingCount(Number.isFinite(count) ? count : 0);
    } catch (err) {
      console.error(err);
      setPendingCount(0);
    }
  };

  const openRequest = async (id) => {
    if (!id) return;

    try {
      setDetailLoading(true);
      setDetailOpen(true);
      const res = await api.get(`/inter-site-requests/${id}`);
      const requestItem = extractItem(res.data);
      setSelectedRequest(requestItem);
      setApprovalDraftLines(
        (requestItem?.lines || []).map((line) => ({
          id: line.id,
          product_id: line.product_id,
          requested_quantity: line.requested_quantity,
          approved_quantity:
            line.approved_quantity != null
              ? String(line.approved_quantity)
              : String(line.requested_quantity ?? 0),
          notes: line.notes || "",
        }))
      );
    } catch (err) {
      console.error(err);
      toast.error("Impossible d’ouvrir ce BT");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    loadPendingCount();
  }, []);

  useEffect(() => {
    if (!hookRefsLoading) {
      loadReferenceFallbacks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hookRefsLoading]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadPendingCount();
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (refsLoading) return;

    setForm((prev) => {
      const next = { ...prev };

      if (!next.to_site_id && user?.site_id) {
        next.to_site_id = String(user.site_id);
      }

      return next;
    });
  }, [refsLoading, user?.site_id]);

  const sourceWarehouses = useMemo(() => {
    if (!form.from_site_id) return [];
    return warehouses.filter(
      (warehouse) => Number(warehouse.site_id) === Number(form.from_site_id)
    );
  }, [warehouses, form.from_site_id]);

  const destinationWarehouses = useMemo(() => {
    if (!form.to_site_id) return [];
    return warehouses.filter(
      (warehouse) => Number(warehouse.site_id) === Number(form.to_site_id)
    );
  }, [warehouses, form.to_site_id]);

  useEffect(() => {
    if (!form.from_site_id) return;

    const valid = sourceWarehouses.some(
      (w) => Number(w.id) === Number(form.from_warehouse_id)
    );

    if (!valid) {
      setForm((prev) => ({
        ...prev,
        from_warehouse_id: sourceWarehouses[0]?.id
          ? String(sourceWarehouses[0].id)
          : "",
      }));
    }
  }, [form.from_site_id, sourceWarehouses, form.from_warehouse_id]);

  useEffect(() => {
    if (!form.to_site_id) return;

    const valid = destinationWarehouses.some(
      (w) => Number(w.id) === Number(form.to_warehouse_id)
    );

    if (!valid) {
      setForm((prev) => ({
        ...prev,
        to_warehouse_id: destinationWarehouses[0]?.id
          ? String(destinationWarehouses[0].id)
          : "",
      }));
    }
  }, [form.to_site_id, destinationWarehouses, form.to_warehouse_id]);

  const filteredRequests = useMemo(() => {
    return requests.filter((item) => {
      const haystack = [
        item.request_number,
        item.notes,
        item.from_site?.name,
        item.fromSite?.name,
        item.to_site?.name,
        item.toSite?.name,
        item.status,
        item.transport_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchSearch = filters.search
        ? haystack.includes(filters.search.toLowerCase())
        : true;

      const matchStatus = filters.status
        ? String(item.status || "").toLowerCase() ===
          String(filters.status || "").toLowerCase()
        : true;

      return matchSearch && matchStatus;
    });
  }, [requests, filters]);

  const selectedFromSiteId = Number(
    selectedRequest?.from_site_id ??
      selectedRequest?.from_site?.id ??
      selectedRequest?.fromSite?.id ??
      0
  );

  const userSiteId = Number(user?.site_id ?? 0);

  const canApproveRequest =
    !!selectedRequest &&
    String(selectedRequest.status || "").toLowerCase() === "pending" &&
    !isDriverRole &&
    (isGlobalApprover || (isSourceManagerRole && userSiteId === selectedFromSiteId));

  const transferScanUrl = useMemo(() => {
    if (selectedRequest?.qr_scan_url) return selectedRequest.qr_scan_url;
    if (!selectedRequest?.qr_token) return "";
    return `${backendWebWithIndex}/scan-transfer/${selectedRequest.qr_token}`;
  }, [selectedRequest, backendWebWithIndex]);

  const transferQrImageUrl = useMemo(() => {
    if (!selectedRequest?.qr_token) return "";
    return `${backendWebWithIndex}/transfer-qr/${selectedRequest.qr_token}.svg`;
  }, [selectedRequest, backendWebWithIndex]);

  const transferPrintUrl = useMemo(() => {
    if (selectedRequest?.print_url) return selectedRequest.print_url;
    if (!selectedRequest?.id) return "";
    return `${backendWebWithIndex}/print/inter-site-transfer/${selectedRequest.id}`;
  }, [selectedRequest, backendWebWithIndex]);

  const printSelectedRequest = () => {
    if (!transferPrintUrl) {
      toast.error("URL d'impression introuvable");
      return;
    }
    window.open(transferPrintUrl, "_blank");
  };

  const updateLine = (index, field, value) => {
    setForm((prev) => {
      const lines = [...prev.lines];
      lines[index] = {
        ...lines[index],
        [field]: value,
      };
      return { ...prev, lines };
    });
  };

  const removeLine = (index) => {
    setForm((prev) => {
      const lines = prev.lines.filter((_, i) => i !== index);
      return {
        ...prev,
        lines:
          lines.length > 0
            ? lines
            : [
                {
                  product_id: "",
                  requested_quantity: "",
                  notes: "",
                },
              ],
      };
    });
  };

  const resetForm = () => {
    setForm({
      from_site_id: "",
      to_site_id: user?.site_id ? String(user.site_id) : "",
      from_warehouse_id: "",
      to_warehouse_id: "",
      notes: "",
      lines: [
        {
          product_id: "",
          requested_quantity: "",
          notes: "",
        },
      ],
    });
    setSelectedCategory("");
    setProductSearch("");
    setCartOpen(false);
  };

  const categories = useMemo(() => {
    const map = new Map();

    (products || []).forEach((product) => {
      const id =
        product.category?.id ??
        product.category_id ??
        `cat-${product.category?.name || product.category_name || "autres"}`;

      const name =
        product.category?.name ||
        product.category_name ||
        "Sans catégorie";

      if (!map.has(String(id))) {
        map.set(String(id), {
          id: String(id),
          name,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const filteredProducts = useMemo(() => {
    let rows = [...(products || [])];

    if (selectedCategory) {
      rows = rows.filter((product) => {
        const catId = String(product.category?.id ?? product.category_id ?? "");
        const fallbackId = String(
          `cat-${product.category?.name || product.category_name || "autres"}`
        );
        return catId === selectedCategory || fallbackId === selectedCategory;
      });
    }

    if (productSearch.trim()) {
      const q = productSearch.trim().toLowerCase();
      rows = rows.filter((product) =>
        [
          product.name,
          product.code,
          product.short_name,
          product.category?.name,
          product.category_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    rows.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    return rows.slice(0, 8);
  }, [products, selectedCategory, productSearch]);

  const addProductToCart = (product) => {
    setForm((prev) => {
      const existingIndex = prev.lines.findIndex(
        (line) => Number(line.product_id) === Number(product.id)
      );

      if (existingIndex >= 0) {
        const lines = [...prev.lines];
        const currentQty = Number(lines[existingIndex].requested_quantity || 0);
        lines[existingIndex] = {
          ...lines[existingIndex],
          requested_quantity: String(currentQty + 1),
        };
        return { ...prev, lines };
      }

      const sanitizedLines =
        prev.lines.length === 1 &&
        !prev.lines[0].product_id &&
        !prev.lines[0].requested_quantity &&
        !prev.lines[0].notes
          ? []
          : prev.lines;

      return {
        ...prev,
        lines: [
          ...sanitizedLines,
          {
            product_id: String(product.id),
            requested_quantity: "1",
            notes: "",
          },
        ],
      };
    });

    setCartOpen(true);
  };

  const decrementLine = (index) => {
    const line = form.lines[index];
    const qty = Number(line?.requested_quantity || 0);

    if (qty <= 1) {
      removeLine(index);
      return;
    }

    updateLine(index, "requested_quantity", String(qty - 1));
  };

  const incrementLine = (index) => {
    const line = form.lines[index];
    const qty = Number(line?.requested_quantity || 0);
    updateLine(index, "requested_quantity", String((qty || 0) + 1));
  };


  const updateApprovalLine = (index, field, value) => {
    setApprovalDraftLines((prev) => {
      const lines = [...prev];
      lines[index] = {
        ...lines[index],
        [field]: value,
      };
      return lines;
    });
  };

  const createRequest = async () => {
    if (!form.from_site_id) {
      toast.error("Choisir le site expéditeur");
      return;
    }

    if (!form.to_site_id) {
      toast.error("Choisir le site destinataire");
      return;
    }

    if (Number(form.from_site_id) === Number(form.to_site_id)) {
      toast.error("Le site expéditeur et le site destinataire doivent être différents");
      return;
    }

    const invalidLine = form.lines.find(
      (line) =>
        !line.product_id ||
        !line.requested_quantity ||
        Number(line.requested_quantity) <= 0
    );

    if (invalidLine) {
      toast.error("Compléter correctement les lignes du BT");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        from_site_id: Number(form.from_site_id),
        to_site_id: Number(form.to_site_id),
        from_warehouse_id: form.from_warehouse_id
          ? Number(form.from_warehouse_id)
          : null,
        to_warehouse_id: form.to_warehouse_id
          ? Number(form.to_warehouse_id)
          : null,
        notes: form.notes || "",
        lines: form.lines.map((line) => ({
          product_id: Number(line.product_id),
          requested_quantity: Number(line.requested_quantity),
          notes: line.notes || "",
        })),
      };

      const res = await api.post("/inter-site-requests", payload);
      const created = extractItem(res.data);

      toast.success(res.data?.message || "BT créé");
      await loadRequests();
      await loadPendingCount();

      if (created?.id) {
        await openRequest(created.id);
      }

      resetForm();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur création BT");
    } finally {
      setSubmitting(false);
    }
  };

  const approveRequest = async () => {
    if (!selectedRequest?.id) return;

    const payload = {
      lines: (approvalDraftLines || []).map((line) => ({
        id: Number(line.id),
        approved_quantity: Number(line.approved_quantity || 0),
        notes: line.notes || "",
      })),
    };

    const invalidLine = payload.lines.find(
      (line) => !Number.isFinite(line.approved_quantity) || line.approved_quantity < 0
    );

    if (!payload.lines.length) {
      toast.error("Aucune ligne à approuver");
      return;
    }

    if (invalidLine) {
      toast.error("Les quantités approuvées doivent être supérieures ou égales à 0");
      return;
    }

    try {
      setApproving(true);

      const res = await api.post(
        `/inter-site-requests/${selectedRequest.id}/approve`,
        payload
      );

      toast.success(res.data?.message || "Bon de transfert approuvé");

      await loadRequests();
      await loadPendingCount();
      await openRequest(selectedRequest.id);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur approbation BT");
    } finally {
      setApproving(false);
    }
  };

  const cartLineCount = form.lines.filter((line) => line.product_id).length;
  const totalRequestedQty = form.lines.reduce(
    (sum, line) => sum + Number(line.requested_quantity || 0),
    0
  );

  const renderDetailContent = () => (
    <>
      {detailLoading && (
        <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
          Chargement du détail...
        </div>
      )}

      {!detailLoading && !selectedRequest && (
        <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
          Aucun BT sélectionné.
        </div>
      )}

      {!detailLoading && selectedRequest && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-slate-800">
                {selectedRequest.request_number}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Détail du bon de transfert
              </p>
            </div>

            <button
              type="button"
              onClick={() => setDetailOpen(false)}
              className="rounded-xl bg-slate-200 px-3 py-2 text-sm text-slate-700"
            >
              Fermer
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <StatCard label="Numéro" value={selectedRequest.request_number} />
            <StatCard
              label="Demandé le"
              value={formatDateTime(selectedRequest.requested_at || selectedRequest.created_at)}
            />
            <StatCard
              label="Site expéditeur"
              value={selectedRequest.from_site?.name || selectedRequest.fromSite?.name}
            />
            <StatCard
              label="Site destinataire"
              value={selectedRequest.to_site?.name || selectedRequest.toSite?.name}
            />
            <StatCard
              label="Dépôt expéditeur"
              value={selectedRequest.from_warehouse?.name || selectedRequest.fromWarehouse?.name}
            />
            <StatCard
              label="Dépôt destinataire"
              value={selectedRequest.to_warehouse?.name || selectedRequest.toWarehouse?.name}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Statut métier
              </div>
              <div className="mt-2">
                <span
                  className={`rounded-lg px-2 py-1 text-xs font-semibold ${businessBadgeClass(
                    selectedRequest.status
                  )}`}
                >
                  {selectedRequest.status}
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Statut transport
              </div>
              <div className="mt-2">
                <span
                  className={`rounded-lg px-2 py-1 text-xs font-semibold ${transportBadgeClass(
                    selectedRequest.transport_status
                  )}`}
                >
                  {selectedRequest.transport_status}
                </span>
              </div>
            </div>
          </div>

          {String(selectedRequest.status || "").toLowerCase() === "pending" && (
            <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-700">
              Ce BT est en attente d’approbation avant la sortie dépôt.
            </div>
          )}

          {selectedRequest.approved_at && (
            <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-700">
              Approuvé le {formatDateTime(selectedRequest.approved_at)} par{" "}
              {selectedRequest.approvedBy?.name ||
                selectedRequest.approved_by?.name ||
                "-"}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {transferPrintUrl && (
              <button
                onClick={printSelectedRequest}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
              >
                Imprimer BT
              </button>
            )}

            {transferScanUrl && (
              <a
                href={transferScanUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-blue-700 px-4 py-2 text-sm text-white"
              >
                Ouvrir scan
              </a>
            )}

            {canApproveRequest && (
              <button
                onClick={approveRequest}
                disabled={approving}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                {approving ? "Validation..." : "Valider la demande"}
              </button>
            )}
          </div>

          {selectedRequest.qr_token && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    QR Code du bon de transfert
                  </h3>
                  <p className="text-sm text-slate-500">
                    À scanner par la sécurité, le chauffeur et la réception.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <a href={transferScanUrl} target="_blank" rel="noreferrer">
                    <img
                      src={transferQrImageUrl}
                      alt="QR Code BT"
                      className="h-44 w-44 rounded-xl border bg-white p-2"
                    />
                  </a>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      Token QR
                    </div>
                    <div className="mt-1 break-all text-sm font-semibold text-slate-800">
                      {selectedRequest.qr_token}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      URL de scan
                    </div>
                    <div className="mt-1 break-all text-sm text-slate-800">
                      {transferScanUrl || "-"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
                    Ce QR peut être scanné :
                    <br />• par la sécurité à la sortie dépôt
                    <br />• par le chauffeur lors de la prise en charge
                    <br />• par la réception à l’arrivée
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-800">Lignes</h3>
              {canApproveRequest && String(selectedRequest.status || "").toLowerCase() === "pending" && (
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  Modifiable avant validation
                </span>
              )}
            </div>

            <div className="space-y-3">
              {(canApproveRequest && String(selectedRequest.status || "").toLowerCase() === "pending"
                ? approvalDraftLines
                : (selectedRequest.lines ?? [])
              ).map((line, index) => {
                const sourceLine =
                  (selectedRequest.lines ?? []).find(
                    (item) => Number(item.id) === Number(line.id)
                  ) || line;
                const product = sourceLine.product;

                return (
                  <div
                    key={line.id || `${line.product_id}-${index}`}
                    className="rounded-xl bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-800">
                          {product?.name || "-"}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {product?.code || "Sans code"}
                        </div>
                      </div>

                      <div className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-700">
                        Demandé : {formatQty(sourceLine.requested_quantity)}
                      </div>
                    </div>

                    {canApproveRequest && String(selectedRequest.status || "").toLowerCase() === "pending" ? (
                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr]">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            Quantité approuvée
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            className="w-full rounded-xl border p-3"
                            value={line.approved_quantity}
                            onChange={(e) =>
                              updateApprovalLine(index, "approved_quantity", e.target.value)
                            }
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateApprovalLine(
                                index,
                                "approved_quantity",
                                String(sourceLine.requested_quantity ?? 0)
                              )
                            }
                            className="mt-2 rounded-lg bg-slate-200 px-3 py-2 text-xs font-medium text-slate-700"
                          >
                            Reprendre quantité demandée
                          </button>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">
                            Notes validation
                          </label>
                          <textarea
                            className="min-h-[96px] w-full rounded-xl border p-3"
                            value={line.notes || ""}
                            onChange={(e) => updateApprovalLine(index, "notes", e.target.value)}
                            placeholder="Ajustement éventuel du stock préparé, remarque, substitution..."
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-500">
                          <div>Demandé : {formatQty(sourceLine.requested_quantity)}</div>
                          <div>
                            Approuvé :{" "}
                            {sourceLine.approved_quantity != null
                              ? formatQty(sourceLine.approved_quantity)
                              : "-"}
                          </div>
                          <div>
                            Expédié :{" "}
                            {sourceLine.sent_quantity != null
                              ? formatQty(sourceLine.sent_quantity)
                              : "-"}
                          </div>
                          <div>
                            Reçu :{" "}
                            {sourceLine.received_quantity != null
                              ? formatQty(sourceLine.received_quantity)
                              : "-"}
                          </div>
                        </div>

                        {sourceLine.notes && (
                          <div className="mt-2 text-sm text-slate-600">{sourceLine.notes}</div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Notes
            </div>
            <div className="mt-1 text-sm text-slate-800">
              {selectedRequest.notes || "-"}
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (refsLoading) {
    return <div className="p-6">Chargement des références...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Demandes inter-sites</h1>
          <p className="text-slate-500">
            Création, approbation et suivi des bons de transfert.
          </p>
        </div>

        {pendingCount > 0 && (isGlobalApprover || isSourceManagerRole) && (
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-bold text-white">
              {pendingCount}
            </span>
            Demande(s) en attente de validation
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Bloc 1 : Formulaire */}
        <div className="rounded-2xl bg-white p-5 shadow">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">Créer BT</h2>
              <p className="mt-1 text-sm text-slate-500">
                Sélection rapide des produits avec panier masqué.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Nouveau
            </span>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Site expéditeur
                </label>
                <select
                  className="w-full rounded-xl border p-3"
                  value={form.from_site_id}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      from_site_id: e.target.value,
                    }))
                  }
                >
                  <option value="">Choisir site expéditeur</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Site destinataire
                </label>
                <select
                  className="w-full rounded-xl border p-3"
                  value={form.to_site_id}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      to_site_id: e.target.value,
                    }))
                  }
                >
                  <option value="">Choisir site destinataire</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Dépôt expéditeur
                </label>
                <select
                  className="w-full rounded-xl border p-3"
                  value={form.from_warehouse_id}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      from_warehouse_id: e.target.value,
                    }))
                  }
                >
                  <option value="">Choisir</option>
                  {sourceWarehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Dépôt destinataire
                </label>
                <select
                  className="w-full rounded-xl border p-3"
                  value={form.to_warehouse_id}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      to_warehouse_id: e.target.value,
                    }))
                  }
                >
                  <option value="">Choisir</option>
                  {destinationWarehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Articles</h3>
                  <p className="text-sm text-slate-500">
                    Catégories visibles, 8 produits affichés maximum.
                  </p>
                </div>

                <div className="w-full lg:w-80">
                  <input
                    type="text"
                    className="w-full rounded-xl border p-3"
                    placeholder="Rechercher un produit..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("")}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${
                    selectedCategory === ""
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  Toutes
                </button>

                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategory(String(category.id))}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${
                      selectedCategory === String(category.id)
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {filteredProducts.length === 0 && (
                  <div className="col-span-full rounded-xl bg-slate-50 p-4 text-slate-500">
                    Aucun produit trouvé.
                  </div>
                )}

                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProductToCart(product)}
                    className="rounded-2xl border border-slate-200 p-4 text-left transition hover:bg-slate-50"
                  >
                    <div className="font-semibold text-slate-800">{product.name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {product.code || "Sans code"}
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      {product.category?.name || product.category_name || "Sans catégorie"}
                    </div>
                    <div className="mt-3 text-sm text-blue-700">Ajouter au panier</div>
                  </button>
                ))}
              </div>
            </div>

            <textarea
              className="w-full rounded-xl border p-3"
              rows={4}
              placeholder="Notes générales"
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                onClick={createRequest}
                disabled={submitting}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-white disabled:opacity-60"
              >
                {submitting ? "Enregistrement..." : "Créer le BT"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="w-full rounded-xl bg-slate-200 px-4 py-3 text-slate-800"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>

        {/* Bloc 2 : Liste */}
        <div className="rounded-2xl bg-white p-5 shadow">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2"><h2 className="text-xl font-semibold text-slate-800">Liste BT</h2>{pendingCount > 0 && (isGlobalApprover || isSourceManagerRole) && (<span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-bold text-white">{pendingCount}</span>)}</div>
              <p className="mt-1 text-sm text-slate-500">
                Cliquez sur un BT pour ouvrir son détail.
              </p>
            </div>

            <button
              onClick={loadRequests}
              disabled={requestsLoading}
              className="rounded-xl bg-slate-200 px-3 py-2 text-sm text-slate-800"
            >
              {requestsLoading ? "..." : "Rafraîchir"}
            </button>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              className="w-full rounded-xl border p-3"
              placeholder="Recherche numéro / site / note"
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
            />

            <select
              className="w-full rounded-xl border p-3"
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value }))
              }
            >
              <option value="">Tous statuts</option>
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="in_transit">in_transit</option>
              <option value="completed">completed</option>
              <option value="rejected">rejected</option>
            </select>
          </div>

          <div className="space-y-3">
            {filteredRequests.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Aucun BT trouvé.
              </div>
            )}

            {filteredRequests.map((request) => (
              <div
                key={request.id}
                onClick={() => openRequest(request.id)}
                className={`cursor-pointer rounded-xl border p-4 transition ${
                  Number(selectedRequest?.id) === Number(request.id) && detailOpen
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-800">
                      {request.request_number}
                    </div>
                    <div className="text-sm text-slate-500">
                      {(request.from_site?.name || request.fromSite?.name || "-")} →{" "}
                      {(request.to_site?.name || request.toSite?.name || "-")}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {formatDateTime(request.requested_at || request.created_at)}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span
                      className={`rounded-lg px-2 py-1 text-xs font-semibold ${businessBadgeClass(
                        request.status
                      )}`}
                    >
                      {request.status}
                    </span>
                    <span
                      className={`rounded-lg px-2 py-1 text-xs font-semibold ${transportBadgeClass(
                        request.transport_status
                      )}`}
                    >
                      {request.transport_status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bouton flottant panier */}
      <button
        type="button"
        onClick={() => setCartOpen(true)}
        className="fixed bottom-5 right-5 z-40 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-2xl"
      >
        Voir le panier ({cartLineCount})
      </button>

      {/* Drawer panier */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-black/40">
          <div
            className={`absolute bg-white shadow-2xl ${
              isMobile
                ? "bottom-0 left-0 right-0 max-h-[88vh] rounded-t-3xl"
                : "bottom-0 right-0 top-0 w-full max-w-lg"
            }`}
          >
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Panier BT</h3>
                <p className="text-sm text-slate-500">
                  {cartLineCount} ligne(s) • {formatQty(totalRequestedQty)} total
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="rounded-xl bg-slate-200 px-3 py-2 text-sm text-slate-700"
              >
                Fermer
              </button>
            </div>

            <div className="max-h-[calc(100vh-170px)] space-y-3 overflow-y-auto p-4">
              {form.lines.filter((line) => line.product_id).length === 0 && (
                <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                  Aucun produit dans le panier.
                </div>
              )}

              {form.lines.map((line, index) => {
                const product = products.find(
                  (item) => Number(item.id) === Number(line.product_id)
                );

                if (!line.product_id) return null;

                return (
                  <div key={`${line.product_id}-${index}`} className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-800">
                          {product?.name || `Produit #${line.product_id}`}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {product?.code || "Sans code"}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="rounded-xl bg-red-600 px-3 py-2 text-sm text-white"
                      >
                        Retirer
                      </button>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => decrementLine(index)}
                        className="rounded-xl bg-slate-200 px-3 py-2 text-slate-800"
                      >
                        -
                      </button>

                      <input
                        type="number"
                        step="0.001"
                        className="w-full rounded-xl border p-3 text-center"
                        value={line.requested_quantity}
                        onChange={(e) =>
                          updateLine(index, "requested_quantity", e.target.value)
                        }
                      />

                      <button
                        type="button"
                        onClick={() => incrementLine(index)}
                        className="rounded-xl bg-slate-900 px-3 py-2 text-white"
                      >
                        +
                      </button>
                    </div>

                    <textarea
                      className="mt-3 w-full rounded-xl border p-3"
                      rows={2}
                      placeholder="Notes ligne"
                      value={line.notes}
                      onChange={(e) => updateLine(index, "notes", e.target.value)}
                    />
                  </div>
                );
              })}
            </div>

            <div className="border-t p-4">
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-white"
              >
                Fermer le panier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer détail BT */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 bg-black/40">
          <div
            className={`absolute overflow-y-auto bg-white shadow-2xl ${
              isStandalone
                ? "inset-0"
                : isMobile
                ? "bottom-0 left-0 right-0 top-[8%] rounded-t-3xl"
                : "bottom-0 right-0 top-0 w-full max-w-3xl"
            }`}
          >
            <div className="p-5">{renderDetailContent()}</div>
          </div>
        </div>
      )}
    </div>
  );
}
