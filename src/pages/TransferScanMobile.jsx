import { useEffect, useMemo, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import useReferences from "../hooks/useReferences";
import toast from "react-hot-toast";
import { formatDateTime, formatQty } from "../utils/formatters";

function extractToken(value) {
  if (!value) return "";

  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    const scanIndex = parts.indexOf("scan-transfer");

    if (scanIndex >= 0 && parts[scanIndex + 1]) {
      return parts[scanIndex + 1];
    }
  } catch (_) {
    // ce n'est pas une URL complète
  }

  return value.replace(/^.*scan-transfer\//, "").trim();
}

function normalizeDocument(payload) {
  return payload?.data || payload;
}

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

const businessBadgeClass = (status) => {
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

function StatCard({ label, value, children }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-800 break-words">
        {children || value || "-"}
      </div>
    </div>
  );
}

export default function TransferScanMobile() {
  const { user } = useAuth();
  const { warehouses, loading: refsLoading } = useReferences();

  const [scanToken, setScanToken] = useState("");
  const [document, setDocument] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [form, setForm] = useState({
    from_warehouse_id: "",
    to_warehouse_id: "",
    reject_reason: "",
    notes: "",
    latitude: "",
    longitude: "",
  });

  const [photo, setPhoto] = useState(null);

  const scannerRef = useRef(null);
  const scannerActiveRef = useRef(false);

  const sourceWarehouses = useMemo(() => {
    if (!document) return [];

    const all = warehouses ?? [];

    const filtered = all.filter(
      (w) =>
        Number(w.site_id) === Number(document.from_site_id) ||
        Number(w.id) === Number(document.from_warehouse_id)
    );

    return filtered.length > 0 ? filtered : all;
  }, [warehouses, document]);

  const destinationWarehouses = useMemo(() => {
    if (!document) return [];

    const all = warehouses ?? [];

    const filtered = all.filter(
      (w) =>
        Number(w.site_id) === Number(document.to_site_id) ||
        Number(w.id) === Number(document.to_warehouse_id)
    );

    return filtered.length > 0 ? filtered : all;
  }, [warehouses, document]);

  const history = document?.scan_events ?? document?.scanEvents ?? [];

  const loadDocument = async (tokenValue) => {
    const token = extractToken(tokenValue || scanToken);

    if (!token) {
      toast.error("Token QR introuvable");
      return;
    }

    try {
      setLoading(true);
      const res = await api.get(`/transfer-scan/${token}`);
      const data = normalizeDocument(res.data);

      setDocument(data);
      setScanToken(token);

      setForm((prev) => ({
        ...prev,
        from_warehouse_id: data.from_warehouse_id
          ? String(data.from_warehouse_id)
          : "",
        to_warehouse_id: data.to_warehouse_id
          ? String(data.to_warehouse_id)
          : "",
        reject_reason: "",
        notes: "",
      }));
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Impossible de charger le bon"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("scan_token");

    if (token) {
      setScanToken(token);
      loadDocument(token);
    }
  }, []);

  useEffect(() => {
    if (!document) return;

    setForm((prev) => ({
      ...prev,
      from_warehouse_id:
        prev.from_warehouse_id ||
        (document.from_warehouse_id
          ? String(document.from_warehouse_id)
          : "") ||
        (sourceWarehouses[0]?.id ? String(sourceWarehouses[0].id) : ""),
      to_warehouse_id:
        prev.to_warehouse_id ||
        (document.to_warehouse_id ? String(document.to_warehouse_id) : "") ||
        (destinationWarehouses[0]?.id
          ? String(destinationWarehouses[0].id)
          : ""),
    }));
  }, [document, sourceWarehouses, destinationWarehouses]);

  useEffect(() => {
    if (!cameraOpen) return;
    if (scannerActiveRef.current) return;

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
      },
      false
    );

    scannerRef.current = scanner;
    scannerActiveRef.current = true;

    scanner.render(
      (decodedText) => {
        const token = extractToken(decodedText);
        setCameraOpen(false);

        scanner.clear().catch(() => {});
        scannerRef.current = null;
        scannerActiveRef.current = false;

        setScanToken(token);
        loadDocument(token);
      },
      () => {}
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
      scannerActiveRef.current = false;
    };
  }, [cameraOpen]);

  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Géolocalisation non disponible");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
        }));
        toast.success("Position GPS récupérée");
      },
      () => {
        toast.error("Impossible de récupérer la position GPS");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const submitMultipart = async (endpoint, extraFields = {}) => {
    try {
      setActionLoading(true);

      const payload = new FormData();

      Object.entries(extraFields).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          payload.append(key, value);
        }
      });

      if (form.notes) payload.append("notes", form.notes);
      if (form.latitude) payload.append("latitude", form.latitude);
      if (form.longitude) payload.append("longitude", form.longitude);
      if (photo) payload.append("photo", photo);

      const res = await api.post(endpoint, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updatedDoc = normalizeDocument(res.data);

      toast.success(res.data.message || "Action effectuée");
      setDocument(updatedDoc);
      setPhoto(null);
      setForm((prev) => ({
        ...prev,
        notes: "",
        reject_reason: "",
      }));
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur lors du scan");
    } finally {
      setActionLoading(false);
    }
  };

  const isAdmin = ["pdg", "admin"].includes(user?.role);
  const isSourceSite = Number(user?.site_id) === Number(document?.from_site_id);
  const isDestinationSite =
    Number(user?.site_id) === Number(document?.to_site_id);

const canSecurityCheck =
  ["pending", "approved"].includes(document?.status) &&
  document?.transport_status === "waiting" &&
  (isSecurity || isSourceSite || isAdmin);

const canReject =
  ["pending", "approved"].includes(document?.status) &&
  document?.transport_status === "waiting" &&
  (isSecurity || isSourceSite || isAdmin);

  const canDriverPickup =
    document?.status === "in_transit" &&
    document?.transport_status === "security_verified";

  const canReceive =
    document?.status === "in_transit" &&
    ["security_verified", "picked_up"].includes(document?.transport_status) &&
    (isDestinationSite || isAdmin);

  const nextStepLabel = useMemo(() => {
    if (!document) return "-";
    if (document.transport_status === "waiting") return "Vérification sécurité";
    if (document.transport_status === "security_verified")
      return "Prise en charge chauffeur";
    if (document.transport_status === "picked_up")
      return "Réception destination";
    if (document.transport_status === "received") return "Transfert terminé";
    if (document.transport_status === "rejected") return "Bon rejeté";
    return "-";
  }, [document]);

  if (refsLoading) {
    return <div className="p-6">Chargement des références...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto w-full max-w-6xl p-3 sm:p-4 md:p-6 space-y-4">
        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
                Scan transfert mobile
              </h1>
              <p className="text-sm text-slate-500">
                Sécurité, chauffeur et réception finale via QR code.
              </p>
            </div>

            {document && (
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${businessBadgeClass(
                    document.status
                  )}`}
                >
                  {document.status}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${transportBadgeClass(
                    document.transport_status
                  )}`}
                >
                  {document.transport_status}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
            <input
              className="rounded-2xl border border-slate-200 p-3 text-sm"
              placeholder="Token ou URL QR"
              value={scanToken}
              onChange={(e) => setScanToken(e.target.value)}
            />

            <button
              onClick={() => loadDocument(scanToken)}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
            >
              Charger le bon
            </button>

            <button
              onClick={() => setCameraOpen((prev) => !prev)}
              className="rounded-2xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white"
            >
              {cameraOpen ? "Fermer caméra" : "Scanner avec caméra"}
            </button>
          </div>

          {cameraOpen && (
            <div className="rounded-2xl border border-slate-200 p-3">
              <div id="qr-reader" />
            </div>
          )}
        </div>

        {loading && (
          <div className="rounded-3xl bg-white p-4 shadow-sm text-slate-500">
            Chargement...
          </div>
        )}

        {document && (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <StatCard label="Bon" value={document.request_number} />
              <StatCard
                label="Flux"
                value={`${document.from_site?.name || "-"} → ${document.to_site?.name || "-"}`}
              />
              <StatCard label="Étape suivante" value={nextStepLabel} />
              <StatCard
                label="Créé le"
                value={formatDateTime(document.requested_at || document.created_at)}
              />
              <StatCard label="Notes" value={document.notes || "-"} />
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">
                  Lignes du transfert
                </h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {(document.lines ?? []).length} ligne(s)
                </span>
              </div>

              <div className="space-y-3">
                {(document.lines ?? []).map((line) => (
                  <div
                    key={line.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="font-semibold text-slate-800">
                      {line.product?.name ?? "-"}
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-500 md:grid-cols-4">
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
                  </div>
                ))}
              </div>

              {document.reject_reason && (
                <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
                  <div className="font-semibold">Motif de rejet</div>
                  <div>{document.reject_reason}</div>
                </div>
              )}
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">
                  Données de scan
                </h2>
                <span className="text-xs text-slate-500">
                  Rôle connecté : {user?.role || "-"}
                </span>
              </div>

              {(canSecurityCheck || canReject) && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Dépôt source
                    </label>
                    <select
                      className="w-full rounded-2xl border border-slate-200 p-3 text-sm"
                      value={form.from_warehouse_id}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          from_warehouse_id: e.target.value,
                        }))
                      }
                    >
                      <option value="">Choisir dépôt source</option>
                      {sourceWarehouses.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}{" "}
                          {warehouse.site_id ? `(Site ${warehouse.site_id})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Dépôt destination
                    </label>
                    <select
                      className="w-full rounded-2xl border border-slate-200 p-3 text-sm"
                      value={form.to_warehouse_id}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          to_warehouse_id: e.target.value,
                        }))
                      }
                    >
                      <option value="">Choisir dépôt destination</option>
                      {destinationWarehouses.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}{" "}
                          {warehouse.site_id ? `(Site ${warehouse.site_id})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {canReject && (
                <input
                  className="w-full rounded-2xl border border-slate-200 p-3 text-sm"
                  placeholder="Motif de rejet"
                  value={form.reject_reason}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      reject_reason: e.target.value,
                    }))
                  }
                />
              )}

              <textarea
                className="w-full rounded-2xl border border-slate-200 p-3 text-sm"
                placeholder="Notes / réserves"
                rows={3}
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
              />

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <input
                  className="rounded-2xl border border-slate-200 p-3 text-sm"
                  placeholder="Latitude"
                  value={form.latitude}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, latitude: e.target.value }))
                  }
                />
                <input
                  className="rounded-2xl border border-slate-200 p-3 text-sm"
                  placeholder="Longitude"
                  value={form.longitude}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, longitude: e.target.value }))
                  }
                />
                <button
                  onClick={captureLocation}
                  className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white"
                >
                  Récupérer GPS
                </button>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Photo / réserve
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhoto(e.target.files[0])}
                  className="w-full rounded-2xl border border-slate-200 p-3 text-sm"
                />
              </div>
            </div>

            <div className="sticky bottom-3 z-10">
              <div className="rounded-3xl bg-white/95 p-3 shadow-lg backdrop-blur">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {canSecurityCheck && (
                    <button
                      onClick={() => {
                        if (!form.from_warehouse_id || !form.to_warehouse_id) {
                          toast.error(
                            "Choisir le dépôt source et le dépôt destination"
                          );
                          return;
                        }

                        submitMultipart(`/transfer-scan/${scanToken}/security-check`, {
                          from_warehouse_id: form.from_warehouse_id,
                          to_warehouse_id: form.to_warehouse_id,
                        });
                      }}
                      disabled={actionLoading}
                      className="rounded-2xl bg-slate-900 px-4 py-4 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {actionLoading ? "Traitement..." : "Valider sortie dépôt"}
                    </button>
                  )}

                  {canDriverPickup && (
                    <button
                      onClick={() =>
                        submitMultipart(`/transfer-scan/${scanToken}/driver-pickup`)
                      }
                      disabled={actionLoading}
                      className="rounded-2xl bg-blue-700 px-4 py-4 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {actionLoading
                        ? "Traitement..."
                        : "Confirmer prise en charge chauffeur"}
                    </button>
                  )}

                  {canReceive && (
                    <button
                      onClick={() =>
                        submitMultipart(
                          `/transfer-scan/${scanToken}/destination-receive`
                        )
                      }
                      disabled={actionLoading}
                      className="rounded-2xl bg-emerald-700 px-4 py-4 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {actionLoading ? "Traitement..." : "Confirmer réception finale"}
                    </button>
                  )}

                  {canReject && (
                    <button
                      onClick={() => {
                        if (!form.reject_reason) {
                          toast.error("Saisir un motif de rejet");
                          return;
                        }

                        submitMultipart(`/transfer-scan/${scanToken}/reject`, {
                          reject_reason: form.reject_reason,
                        });
                      }}
                      disabled={actionLoading}
                      className="rounded-2xl bg-red-700 px-4 py-4 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {actionLoading ? "Traitement..." : "Rejeter le bon"}
                    </button>
                  )}
                </div>

                {!canSecurityCheck &&
                  !canDriverPickup &&
                  !canReceive &&
                  !canReject && (
                    <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                      Aucune action disponible pour ce statut ou ce rôle.
                    </div>
                  )}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-800">
                Historique des scans
              </h2>

              <div className="space-y-3">
                {history.length === 0 && (
                  <div className="rounded-2xl bg-slate-50 p-4 text-slate-500">
                    Aucun scan enregistré pour le moment.
                  </div>
                )}

                {history.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="font-semibold text-slate-800">
                      {event.scan_stage} — {event.new_status}
                    </div>

                    <div className="mt-1 text-sm text-slate-500">
                      {event.user?.name ?? event.user?.email ?? "Utilisateur"} —{" "}
                      {formatDateTime(event.scanned_at)}
                    </div>

                    <div className="mt-1 text-sm text-slate-500">
                      GPS: {event.latitude ?? "-"}, {event.longitude ?? "-"}
                    </div>

                    {event.notes && (
                      <div className="mt-2 text-sm text-slate-700">
                        {event.notes}
                      </div>
                    )}

                    {event.photo_url && (
                      <img
                        src={event.photo_url}
                        alt="scan"
                        className="mt-3 h-28 w-28 rounded-2xl object-cover"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}