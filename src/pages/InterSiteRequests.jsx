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
    finalSites = rows;
    break;
  } else {
    console.warn(`L'URL ${url} a renvoyé une collection vide ou invalide:`, res.data);
  }
} catch (e) {
  console.error(`Échec de l'appel sur ${url}:`, e.response?.status, e.message);
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

      if (!selectedRequest && rows.length > 0) {
        await openRequest(rows[0].id);
      }
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les BT");
    } finally {
      setRequestsLoading(false);
    }
  };

  const openRequest = async (id) => {
    if (!id) return;

    try {
      setDetailLoading(true);
      const res = await api.get(`/inter-site-requests/${id}`);
      setSelectedRequest(extractItem(res.data));
    } catch (err) {
      console.error(err);
      toast.error("Impossible d’ouvrir ce BT");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    if (!hookRefsLoading) {
      loadReferenceFallbacks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hookRefsLoading]);

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
  }, [form.from_site_id, sourceWarehouses]);

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
  }, [form.to_site_id, destinationWarehouses]);

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
      lines[index][field] = value;
      return { ...prev, lines };
    });
  };

  const addLine = () => {
    setForm((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          product_id: "",
          requested_quantity: "",
          notes: "",
        },
      ],
    }));
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

    try {
      setApproving(true);

      const res = await api.post(
        `/inter-site-requests/${selectedRequest.id}/approve`
      );

      toast.success(res.data?.message || "Bon de transfert approuvé");

      await loadRequests();
      await openRequest(selectedRequest.id);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur approbation BT");
    } finally {
      setApproving(false);
    }
  };

  if (refsLoading) {
    return <div className="p-6">Chargement des références...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Demandes inter-sites</h1>
        <p className="text-slate-500">
          Création, approbation et suivi des bons de transfert.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Bloc gauche */}
        <div className="rounded-2xl bg-white p-5 shadow xl:col-span-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800">Créer BT</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Nouveau
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Site expéditeur
              </label>
              <select
                className="w-full rounded-xl border p-3"
                value={form.from_site_id}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, from_site_id: e.target.value }))
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
                  setForm((prev) => ({ ...prev, to_site_id: e.target.value }))
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Lignes</h3>
                <button
                  type="button"
                  onClick={addLine}
                  className="rounded-xl bg-slate-700 px-3 py-2 text-sm text-white"
                >
                  Ajouter ligne
                </button>
              </div>

              <div className="space-y-4">
                {form.lines.map((line, index) => (
                  <div key={index} className="rounded-xl border p-4 space-y-3">
                    <select
                      className="w-full rounded-xl border p-3"
                      value={line.product_id}
                      onChange={(e) =>
                        updateLine(index, "product_id", e.target.value)
                      }
                    >
                      <option value="">Choisir produit</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      step="0.001"
                      className="w-full rounded-xl border p-3"
                      placeholder="Quantité demandée"
                      value={line.requested_quantity}
                      onChange={(e) =>
                        updateLine(index, "requested_quantity", e.target.value)
                      }
                    />

                    <input
                      type="text"
                      className="w-full rounded-xl border p-3"
                      placeholder="Notes ligne"
                      value={line.notes}
                      onChange={(e) =>
                        updateLine(index, "notes", e.target.value)
                      }
                    />

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="rounded-xl bg-red-600 px-4 py-2 text-white"
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
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

            <button
              onClick={createRequest}
              disabled={submitting}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-white disabled:opacity-60"
            >
              {submitting ? "Enregistrement..." : "Créer le BT"}
            </button>
          </div>
        </div>

        {/* Bloc centre */}
        <div className="rounded-2xl bg-white p-5 shadow xl:col-span-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800">Liste BT</h2>
            <button
              onClick={loadRequests}
              disabled={requestsLoading}
              className="rounded-xl bg-slate-200 px-3 py-2 text-sm text-slate-800"
            >
              {requestsLoading ? "..." : "Rafraîchir"}
            </button>
          </div>

          <div className="mb-4 space-y-3">
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

          <div className="max-h-[75vh] space-y-3 overflow-y-auto pr-1">
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
                  Number(selectedRequest?.id) === Number(request.id)
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
                    <div className="text-xs text-slate-400">
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

        {/* Bloc droite */}
        <div className="rounded-2xl bg-white p-5 shadow xl:col-span-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800">Détails BT</h2>

            {selectedRequest && (
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
                    className="rounded-xl bg-blue-700 px-3 py-2 text-sm text-white"
                  >
                    Ouvrir scan
                  </a>
                )}

                {canApproveRequest && (
                  <button
                    onClick={approveRequest}
                    disabled={approving}
                    className="rounded-xl bg-blue-700 px-4 py-2 text-white disabled:opacity-60"
                  >
                    {approving ? "Approbation..." : "Approuver BT"}
                  </button>
                )}
              </div>
            )}
          </div>

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

                    <div className="flex flex-wrap gap-2">
                      {transferPrintUrl && (
                        <button
                          onClick={printSelectedRequest}
                          className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
                        >
                          Imprimer
                        </button>
                      )}

                      {transferScanUrl && (
                        <a
                          href={transferScanUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl bg-blue-700 px-4 py-2 text-sm text-white"
                        >
                          Ouvrir le scan
                        </a>
                      )}
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
                <h3 className="mb-3 font-semibold text-slate-800">Lignes</h3>

                <div className="space-y-3">
                  {(selectedRequest.lines ?? []).map((line) => (
                    <div key={line.id} className="rounded-xl bg-slate-50 p-4">
                      <div className="font-semibold text-slate-800">
                        {line.product?.name || "-"}
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-500">
                        <div>Demandé : {formatQty(line.requested_quantity)}</div>
                        <div>
                          Approuvé :{" "}
                          {line.approved_quantity != null
                            ? formatQty(line.approved_quantity)
                            : "-"}
                        </div>
                        <div>
                          Expédié :{" "}
                          {line.sent_quantity != null
                            ? formatQty(line.sent_quantity)
                            : "-"}
                        </div>
                        <div>
                          Reçu :{" "}
                          {line.received_quantity != null
                            ? formatQty(line.received_quantity)
                            : "-"}
                        </div>
                      </div>

                      {line.notes && (
                        <div className="mt-2 text-sm text-slate-600">{line.notes}</div>
                      )}
                    </div>
                  ))}
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
        </div>
      </div>
    </div>
  );
}