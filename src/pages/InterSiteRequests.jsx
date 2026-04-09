import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import useReferences from "../hooks/useReferences";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import ConfirmBox from "../components/ConfirmBox";
import { formatDateTime, formatQty } from "../utils/formatters";

const statusBadgeClass = (status) => {
  switch (status) {
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
};

const transportBadgeClass = (status) => {
  switch (status) {
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
};

export default function InterSiteRequests() {
  const { sites, products, warehouses, loading } = useReferences();
  const { user } = useAuth();

  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const [filters, setFilters] = useState({
    status: "",
    search: "",
  });

  const [createForm, setCreateForm] = useState({
    from_site_id: "",
    to_site_id: "",
    notes: "",
    lines: [{ product_id: "", requested_quantity: "", notes: "" }],
  });

  const backendWeb = import.meta.env.VITE_BACKEND_WEB_URL || "";
  const backendWebWithIndex = backendWeb.includes("/index.php")
    ? backendWeb
    : `${backendWeb}/index.php`;

  const loadRequests = async () => {
    try {
      const res = await api.get("/inter-site-requests");
      setRequests(res.data.data ?? res.data);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les transferts inter-sites");
    }
  };

  useEffect(() => {
    loadRequests();

    if (user?.site_id) {
      setCreateForm((prev) => ({
        ...prev,
        to_site_id: String(user.site_id),
      }));
    }
  }, [user]);

  const filteredRequests = useMemo(() => {
    return (requests ?? []).filter((req) => {
      const matchStatus = filters.status ? req.status === filters.status : true;

      const haystack = [
        req.request_number,
        req.from_site?.name,
        req.to_site?.name,
        req.status,
        req.transport_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchSearch = filters.search
        ? haystack.includes(filters.search.toLowerCase())
        : true;

      return matchStatus && matchSearch;
    });
  }, [requests, filters]);

  const addLine = () => {
    setCreateForm((prev) => ({
      ...prev,
      lines: [...prev.lines, { product_id: "", requested_quantity: "", notes: "" }],
    }));
  };

  const removeLine = (index) => {
    setCreateForm((prev) => ({
      ...prev,
      lines:
        prev.lines.length === 1
          ? prev.lines
          : prev.lines.filter((_, i) => i !== index),
    }));
  };

  const updateLine = (index, field, value) => {
    const lines = [...createForm.lines];
    lines[index][field] = value;
    setCreateForm((prev) => ({ ...prev, lines }));
  };

  const createRequest = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        from_site_id: Number(createForm.from_site_id),
        to_site_id: Number(createForm.to_site_id),
        notes: createForm.notes,
        lines: createForm.lines.map((line) => ({
          product_id: Number(line.product_id),
          requested_quantity: Number(line.requested_quantity),
          notes: line.notes || "",
        })),
      };

      const res = await api.post("/inter-site-requests", payload);
      toast.success(res.data.message || "Bon de transfert créé");

      setCreateForm({
        from_site_id: "",
        to_site_id: user?.site_id ? String(user.site_id) : "",
        notes: "",
        lines: [{ product_id: "", requested_quantity: "", notes: "" }],
      });

      loadRequests();
    } catch (err) {
      console.error(err);
      toast.error("Erreur création bon de transfert");
    }
  };

  const openRequest = async (id) => {
    try {
      const res = await api.get(`/inter-site-requests/${id}`);
      console.log("BT DETAIL =", res.data);
      setSelectedRequest(res.data);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Impossible d’ouvrir le bon de transfert");
    }
  };

  const updateApprovedLine = (lineId, value) => {
    setSelectedRequest((prev) => ({
      ...prev,
      lines: prev.lines.map((line) =>
        line.id === lineId ? { ...line, approved_quantity: value } : line
      ),
    }));
  };

  const approveRequest = async () => {
    try {
      const payload = {
        lines: selectedRequest.lines.map((line) => ({
          id: line.id,
          approved_quantity: Number(line.approved_quantity ?? 0),
          notes: line.notes || "",
        })),
      };

      const res = await api.put(
        `/inter-site-requests/${selectedRequest.id}/approve`,
        payload
      );

      toast.success(res.data.message || "Bon de transfert approuvé");
      setConfirmAction(null);
      await openRequest(selectedRequest.id);
      loadRequests();
    } catch (err) {
      console.error(err);
      toast.error("Erreur approbation");
    }
  };

  const canApprove =
    selectedRequest &&
    Number(user?.site_id) === Number(selectedRequest.from_site_id);

  const linkedReceipt =
    selectedRequest?.goods_receipt || selectedRequest?.goodsReceipt || null;

  const canPrintReceipt =
    Boolean(linkedReceipt) ||
    Boolean(selectedRequest?.goods_receipt_id) ||
    selectedRequest?.status === "completed";

  if (loading) {
    return <div className="p-6">Chargement des références...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          Bons de transfert inter-sites
        </h1>
        <p className="text-slate-500">
          Création, suivi, QR et impression des transferts.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* BLOC GAUCHE */}
        <div className="xl:col-span-3">
          <div className="sticky top-4 rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-4 text-2xl font-bold text-slate-800">Créer un BT</h2>

            <form onSubmit={createRequest} className="space-y-4">
              <select
                className="w-full rounded-xl border p-3"
                value={createForm.from_site_id}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, from_site_id: e.target.value }))
                }
              >
                <option value="">Site expéditeur</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>

              <select
                className="w-full rounded-xl border p-3"
                value={createForm.to_site_id}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, to_site_id: e.target.value }))
                }
              >
                <option value="">Site demandeur</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>

              <input
                className="w-full rounded-xl border p-3"
                placeholder="Notes"
                value={createForm.notes}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, notes: e.target.value }))
                }
              />

              <div className="space-y-3">
                {createForm.lines.map((line, index) => (
                  <div key={index} className="rounded-xl border p-4 space-y-3">
                    <select
                      className="w-full rounded-xl border p-3"
                      value={line.product_id}
                      onChange={(e) => updateLine(index, "product_id", e.target.value)}
                    >
                      <option value="">Produit</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>

                    <input
                      className="w-full rounded-xl border p-3"
                      type="number"
                      step="0.001"
                      placeholder="Qté demandée"
                      value={line.requested_quantity}
                      onChange={(e) =>
                        updateLine(index, "requested_quantity", e.target.value)
                      }
                    />

                    <input
                      className="w-full rounded-xl border p-3"
                      placeholder="Notes ligne"
                      value={line.notes}
                      onChange={(e) => updateLine(index, "notes", e.target.value)}
                    />

                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="w-full rounded-xl bg-red-600 px-4 py-2 text-white"
                    >
                      Retirer la ligne
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={addLine}
                  className="rounded-xl bg-slate-700 px-4 py-3 text-white"
                >
                  Ajouter ligne
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-4 py-3 text-white"
                >
                  Créer BT
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* BLOC CENTRE */}
        <div className="xl:col-span-4">
          <div className="rounded-2xl bg-white p-6 shadow">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-slate-800">Liste des BT</h2>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3">
              <input
                className="rounded-xl border p-3"
                placeholder="Recherche numéro / site / statut"
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
              />

              <select
                className="rounded-xl border p-3"
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

            <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
              {filteredRequests.map((req) => (
                <div
                  id={`bt-${req.request_number}`}
                  key={req.id}
                  className={`rounded-xl border p-4 transition cursor-pointer ${
                    selectedRequest?.id === req.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                  onClick={() => openRequest(req.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-800">
                        {req.request_number}
                      </div>
                      <div className="text-sm text-slate-500">
                        {req.from_site?.name ?? "Source"} → {req.to_site?.name ?? "Destination"}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span
                          className={`rounded-lg px-2 py-1 text-xs font-semibold ${statusBadgeClass(
                            req.status
                          )}`}
                        >
                          {req.status}
                        </span>

                        <span
                          className={`rounded-lg px-2 py-1 text-xs font-semibold ${transportBadgeClass(
                            req.transport_status
                          )}`}
                        >
                          {req.transport_status}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openRequest(req.id);
                        }}
                        className="rounded-xl bg-blue-600 px-3 py-2 text-white"
                      >
                        Ouvrir
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(
                            `${backendWebWithIndex}/print/inter-site-transfer/${req.id}`,
                            "_blank"
                          );
                        }}
                        className="rounded-xl bg-slate-900 px-3 py-2 text-white"
                      >
                        Imprimer BT
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredRequests.length === 0 && (
                <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                  Aucun bon trouvé.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BLOC DROITE */}
        <div className="xl:col-span-5">
          <div className="rounded-2xl bg-white p-6 shadow min-h-[75vh]">
            {!selectedRequest ? (
              <div className="flex h-full items-center justify-center text-slate-400">
                Sélectionner un BT pour voir les détails
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">
                      {selectedRequest.request_number}
                    </h2>
                    <p className="text-slate-500">
                      {selectedRequest.from_site?.name ?? "Source"} →{" "}
                      {selectedRequest.to_site?.name ?? "Destination"}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`rounded-lg px-2 py-1 text-xs font-semibold ${statusBadgeClass(
                          selectedRequest.status
                        )}`}
                      >
                        {selectedRequest.status}
                      </span>

                      <span
                        className={`rounded-lg px-2 py-1 text-xs font-semibold ${transportBadgeClass(
                          selectedRequest.transport_status
                        )}`}
                      >
                        {selectedRequest.transport_status}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() =>
                        window.open(
                          `${backendWebWithIndex}/print/inter-site-transfer/${selectedRequest.id}`,
                          "_blank"
                        )
                      }
                      className="rounded-xl bg-slate-900 px-4 py-2 text-white"
                    >
                      Imprimer BT
                    </button>

                    {canPrintReceipt && (
                      <button
                        onClick={() =>
                          window.open(
                            `${backendWebWithIndex}/print/inter-site-receipt/${selectedRequest.id}`,
                            "_blank"
                          )
                        }
                        className="rounded-xl bg-emerald-700 px-4 py-2 text-white"
                      >
                        Imprimer BR
                      </button>
                    )}
                  </div>
                </div>

                {selectedRequest.qr_token && (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">QR du bon</div>

                    <img
                      src={`${backendWebWithIndex}/transfer-qr/${selectedRequest.qr_token}.svg`}
                      alt="QR transfert"
                      className="mt-2 h-40 w-40 rounded-xl border bg-white p-2"
                    />

                    <a
                      href={selectedRequest.qr_scan_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block text-sm text-blue-600 underline break-all"
                    >
                      Ouvrir le lien de scan
                    </a>
                  </div>
                )}

                {selectedRequest.status === "approved" && (
                  <div className="rounded-2xl bg-amber-50 p-5">
                    <h3 className="text-lg font-semibold text-amber-700">
                      Étape suivante : Scan sécurité obligatoire
                    </h3>
                    <p className="mt-2 text-sm text-slate-700">
                      Le transfert doit maintenant passer par le workflow QR :
                      sortie dépôt → prise en charge chauffeur → réception finale.
                    </p>

                    {selectedRequest.qr_scan_url && (
                      <a
                        href={selectedRequest.qr_scan_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block rounded-xl bg-amber-700 px-4 py-2 text-white"
                      >
                        Ouvrir le scan mobile
                      </a>
                    )}
                  </div>
                )}

                {selectedRequest.status === "in_transit" && (
                  <div className="rounded-2xl bg-blue-50 p-5">
                    <h3 className="text-lg font-semibold text-blue-700">
                      Réception via scan QR
                    </h3>
                    <p className="mt-2 text-sm text-slate-700">
                      La réception finale doit être confirmée depuis l’interface mobile de scan.
                    </p>

                    {selectedRequest.qr_scan_url && (
                      <a
                        href={selectedRequest.qr_scan_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block rounded-xl bg-blue-700 px-4 py-2 text-white"
                      >
                        Ouvrir le scan mobile
                      </a>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Créé le</div>
                    <div className="font-semibold text-slate-800">
                      {formatDateTime(selectedRequest.requested_at)}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Approuvé le</div>
                    <div className="font-semibold text-slate-800">
                      {formatDateTime(selectedRequest.approved_at)}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Sortie dépôt</div>
                    <div className="font-semibold text-slate-800">
                      {formatDateTime(selectedRequest.security_verified_at || selectedRequest.sent_at)}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Réception finale</div>
                    <div className="font-semibold text-slate-800">
                      {formatDateTime(selectedRequest.destination_received_at || selectedRequest.received_at)}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-left">
                    <thead className="border-b border-slate-200">
                      <tr className="text-slate-600">
                        <th className="px-4 py-3">Produit</th>
                        <th className="px-4 py-3">Demandé</th>
                        <th className="px-4 py-3">Approuvé</th>
                        <th className="px-4 py-3">Expédié</th>
                        <th className="px-4 py-3">Reçu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedRequest.lines ?? []).map((line) => (
                        <tr
                          key={line.id}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >
                          <td className="px-4 py-3">{line.product?.name ?? "-"}</td>
                          <td className="px-4 py-3">{formatQty(line.requested_quantity)}</td>
                          <td className="px-4 py-3">
                            {selectedRequest.status === "pending" && canApprove ? (
                              <input
                                type="number"
                                step="0.001"
                                className="rounded border p-2"
                                value={line.approved_quantity ?? ""}
                                onChange={(e) =>
                                  updateApprovedLine(line.id, e.target.value)
                                }
                              />
                            ) : (
                              line.approved_quantity != null
                                ? formatQty(line.approved_quantity)
                                : "-"
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {line.sent_quantity != null ? formatQty(line.sent_quantity) : "-"}
                          </td>
                          <td className="px-4 py-3">
                            {line.received_quantity != null ? formatQty(line.received_quantity) : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selectedRequest.status === "pending" && canApprove && (
                  <button
                    onClick={() => setConfirmAction("approve")}
                    className="rounded-xl bg-emerald-700 px-4 py-2 text-white"
                  >
                    Approuver
                  </button>
                )}

                {selectedRequest.reject_reason && (
                  <div className="rounded-xl bg-red-50 p-4 text-red-700">
                    <div className="font-semibold">Motif de rejet</div>
                    <div>{selectedRequest.reject_reason}</div>
                  </div>
                )}

                {canPrintReceipt && (
                  <div className="rounded-2xl bg-emerald-50 p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-emerald-700">
                          BR automatique généré
                        </h3>
                        <p className="text-sm text-slate-600">
                          {linkedReceipt?.receipt_number || "BR disponible"}
                        </p>
                      </div>

                      <button
                        onClick={() =>
                          window.open(
                            `${backendWebWithIndex}/print/inter-site-receipt/${selectedRequest.id}`,
                            "_blank"
                          )
                        }
                        className="rounded-xl bg-emerald-700 px-4 py-2 text-white"
                      >
                        Imprimer BR
                      </button>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl bg-slate-50 p-5">
                  <h3 className="mb-4 text-xl font-semibold text-slate-800">
                    Historique des scans
                  </h3>

                  <div className="space-y-3">
                    {(selectedRequest.scan_events ?? selectedRequest.scanEvents ?? []).length === 0 && (
                      <div className="rounded-xl bg-white p-4 text-slate-500">
                        Aucun scan enregistré pour le moment.
                      </div>
                    )}

                    {(selectedRequest.scan_events ?? selectedRequest.scanEvents ?? []).map(
                      (event) => (
                        <div
                          key={event.id}
                          className="rounded-xl border border-slate-200 bg-white p-4"
                        >
                          <div className="font-semibold text-slate-800">
                            {event.scan_stage} — {event.previous_status ?? "-"} → {event.new_status ?? "-"}
                          </div>

                          <div className="text-sm text-slate-500">
                            {event.user?.name ?? event.user?.email ?? "Utilisateur"} —{" "}
                            {formatDateTime(event.scanned_at)}
                          </div>

                          <div className="text-sm text-slate-500">
                            GPS: {event.latitude ?? "-"}, {event.longitude ?? "-"}
                          </div>

                          {event.meta && (
                            <div className="mt-2 text-xs text-slate-500 break-all">
                              {JSON.stringify(event.meta)}
                            </div>
                          )}

                          {event.notes && (
                            <div className="mt-2 text-sm text-slate-700">
                              {event.notes}
                            </div>
                          )}

                          {event.photo_url && (
                            <img
                              src={event.photo_url}
                              alt="scan"
                              className="mt-3 h-32 w-32 rounded-xl object-cover"
                            />
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmAction === "approve" && (
        <ConfirmBox
          title="Confirmer l’approbation"
          message="Voulez-vous vraiment approuver ce bon de transfert ?"
          onCancel={() => setConfirmAction(null)}
          onConfirm={approveRequest}
        />
      )}
    </div>
  );
}