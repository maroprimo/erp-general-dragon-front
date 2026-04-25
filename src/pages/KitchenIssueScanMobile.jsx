import { useEffect, useMemo, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import api from "../services/api";
import toast from "react-hot-toast";
import { formatDateTime, formatQty, formatMoney } from "../utils/formatters";
import { useAuth } from "../context/AuthContext";

function extractToken(value) {
  if (!value) return "";

  const raw = String(value).trim();

  try {
    const url = new URL(raw);

    const queryToken =
      url.searchParams.get("scan_token") ||
      url.searchParams.get("token") ||
      "";

    if (queryToken) {
      return queryToken.trim();
    }

    const parts = url.pathname.split("/").filter(Boolean);
    const scanIndex = parts.indexOf("scan-kitchen-issue");

    if (scanIndex >= 0 && parts[scanIndex + 1]) {
      return parts[scanIndex + 1].trim();
    }
  } catch (_) {
    // ce n'est pas une URL complète, on continue
  }

  return raw.replace(/^.*scan-kitchen-issue\//, "").trim();
}

function statusBadgeClass(status) {
  switch (status) {
    case "pending":
      return "bg-slate-100 text-slate-700";
    case "issued":
      return "bg-blue-100 text-blue-700";
    case "received":
      return "bg-emerald-100 text-emerald-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function workflowBadgeClass(status) {
  switch (status) {
    case "waiting_storekeeper":
      return "bg-slate-100 text-slate-700";
    case "source_issued":
      return "bg-amber-100 text-amber-700";
    case "kitchen_received":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function KitchenIssueScanMobile() {
  const { user } = useAuth();

  const [scanToken, setScanToken] = useState("");
  const [document, setDocument] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [form, setForm] = useState({
    lines: [],
    notes: "",
    latitude: "",
    longitude: "",
  });

  const [photo, setPhoto] = useState(null);

  const scannerRef = useRef(null);
  const scannerActiveRef = useRef(false);

  const loadDocument = async (tokenValue) => {
    const token = extractToken(tokenValue || scanToken);

    if (!token) {
      toast.error("Token QR introuvable");
      return;
    }

    setScanToken(token);

    try {
      setLoading(true);
      const res = await api.get(`/kitchen-issue-scan/${token}`);
      const data = res.data;

      setDocument(data);
      setScanToken(token);

      setForm((prev) => ({
        ...prev,
        notes: "",
        lines:
          (data.lines ?? []).map((line) => ({
            line_id: line.id,
            product_id: line.product_id,
            product_name: line.product?.name || "-",
            requested_quantity: Number(line.requested_quantity || 0),
            issued_quantity: Number(line.issued_quantity || 0),
            received_quantity: Number(line.received_quantity || 0),
            value_for_issue:
              Number(line.issued_quantity || 0) > 0
                ? String(line.issued_quantity)
                : String(line.requested_quantity || 0),
            value_for_receive:
              Number(line.received_quantity || 0) > 0
                ? String(line.received_quantity)
                : String(line.issued_quantity || 0),
          })) || [],
      }));
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Impossible de charger le BSC");
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
    if (!cameraOpen) return;
    if (scannerActiveRef.current) return;

    const scanner = new Html5QrcodeScanner(
      "kitchen-issue-qr-reader",
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

  const canIssueFromStore =
    document?.status === "pending" &&
    document?.workflow_status === "waiting_storekeeper";

  const canReceiveInKitchen =
    document?.status === "issued" &&
    document?.workflow_status === "source_issued";

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

  const updateLine = (lineId, field, value) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line) =>
        Number(line.line_id) === Number(lineId)
          ? { ...line, [field]: value }
          : line
      ),
    }));
  };

  const submitMultipart = async (endpoint, mode) => {
    try {
      setProcessing(true);

      const payload = new FormData();

      form.lines.forEach((line, index) => {
        payload.append(`lines[${index}][line_id]`, line.line_id);

        if (mode === "issue") {
          payload.append(
            `lines[${index}][issued_quantity]`,
            line.value_for_issue === "" ? "0" : line.value_for_issue
          );
        }

        if (mode === "receive") {
          payload.append(
            `lines[${index}][received_quantity]`,
            line.value_for_receive === "" ? "0" : line.value_for_receive
          );
        }
      });

      if (form.notes) payload.append("notes", form.notes);
      if (form.latitude) payload.append("latitude", form.latitude);
      if (form.longitude) payload.append("longitude", form.longitude);
      if (photo) payload.append("photo", photo);

      const res = await api.post(endpoint, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(res.data?.message || "Action effectuée");
      setDocument(res.data?.data || null);
      setPhoto(null);
      setForm((prev) => ({
        ...prev,
        notes: "",
      }));

      await loadDocument(scanToken);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur lors du scan");
    } finally {
      setProcessing(false);
    }
  };

  const issueSummary = useMemo(() => {
    return (document?.lines ?? []).reduce(
      (sum, line) => sum + Number(line.issued_quantity || 0),
      0
    );
  }, [document]);

  const receiveSummary = useMemo(() => {
    return (document?.lines ?? []).reduce(
      (sum, line) => sum + Number(line.received_quantity || 0),
      0
    );
  }, [document]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          Scan Bon de Sortie Cuisine
        </h1>
        <p className="text-slate-500">
          Sortie dépôt puis réception cuisine via QR code.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            className="rounded-xl border p-3"
            placeholder="Token ou URL QR"
            value={scanToken}
            onChange={(e) => setScanToken(e.target.value)}
          />

          <button
            onClick={() => loadDocument(scanToken)}
            className="rounded-xl bg-slate-900 px-4 py-3 text-white"
          >
            Charger le BSC
          </button>

          <button
            onClick={() => setCameraOpen((prev) => !prev)}
            className="rounded-xl bg-blue-700 px-4 py-3 text-white"
          >
            {cameraOpen ? "Fermer caméra" : "Scanner avec caméra"}
          </button>
        </div>

        {cameraOpen && (
          <div className="rounded-2xl border p-4">
            <div id="kitchen-issue-qr-reader" />
          </div>
        )}
      </div>

      {loading && <div>Chargement...</div>}

      {document && (
        <>
          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">BSC</div>
                <div className="font-semibold text-slate-800">
                  {document.issue_number}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Site</div>
                <div className="font-semibold text-slate-800">
                  {document.site?.name || "-"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Flux</div>
                <div className="font-semibold text-slate-800">
                  {document.from_warehouse?.name || "-"} →{" "}
                  {document.to_warehouse?.name || "-"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Date demande</div>
                <div className="font-semibold text-slate-800">
                  {formatDateTime(document.requested_at || document.created_at)}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className={`rounded-lg px-2 py-1 text-xs font-semibold ${statusBadgeClass(
                  document.status
                )}`}
              >
                {document.status}
              </span>

              <span
                className={`rounded-lg px-2 py-1 text-xs font-semibold ${workflowBadgeClass(
                  document.workflow_status
                )}`}
              >
                {document.workflow_status}
              </span>
            </div>

            {document.notes && (
              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-slate-700">
                <div className="font-semibold">Notes</div>
                <div>{document.notes}</div>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-800">
                Lignes du document
              </h2>

              <div className="flex flex-wrap gap-2 text-sm">
                <div className="rounded-xl bg-amber-50 px-3 py-2 text-amber-700">
                  Sorti : {formatQty(issueSummary)}
                </div>
                <div className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700">
                  Reçu : {formatQty(receiveSummary)}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {(form.lines ?? []).map((line) => (
                <div key={line.line_id} className="rounded-xl border p-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
                    <div className="xl:col-span-2">
                      <div className="text-sm text-slate-500">Produit</div>
                      <div className="font-semibold text-slate-800">
                        {line.product_name}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-slate-500">Demandé</div>
                      <div className="font-semibold text-slate-800">
                        {formatQty(line.requested_quantity)}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-slate-500">Sorti actuel</div>
                      <div className="font-semibold text-slate-800">
                        {formatQty(line.issued_quantity)}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-slate-500">Reçu actuel</div>
                      <div className="font-semibold text-slate-800">
                        {formatQty(line.received_quantity)}
                      </div>
                    </div>

                    <div>
                      {canIssueFromStore && (
                        <>
                          <div className="mb-1 text-sm text-slate-500">
                            Qté à sortir
                          </div>
                          <input
                            type="number"
                            step="0.001"
                            className="w-full rounded-xl border p-3"
                            value={line.value_for_issue}
                            onChange={(e) =>
                              updateLine(line.line_id, "value_for_issue", e.target.value)
                            }
                          />
                        </>
                      )}

                      {canReceiveInKitchen && (
                        <>
                          <div className="mb-1 text-sm text-slate-500">
                            Qté à recevoir
                          </div>
                          <input
                            type="number"
                            step="0.001"
                            className="w-full rounded-xl border p-3"
                            value={line.value_for_receive}
                            onChange={(e) =>
                              updateLine(
                                line.line_id,
                                "value_for_receive",
                                e.target.value
                              )
                            }
                          />
                        </>
                      )}

                      {!canIssueFromStore && !canReceiveInKitchen && (
                        <>
                          <div className="text-sm text-slate-500">État final</div>
                          <div className="font-semibold text-slate-800">
                            {formatQty(line.received_quantity)} /{" "}
                            {formatMoney(0).replace(",00", "")}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow space-y-4">
            <h2 className="text-xl font-semibold text-slate-800">
              Données de scan
            </h2>

            <textarea
              className="w-full rounded-xl border p-3"
              placeholder="Notes / réserves"
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <input
                className="rounded-xl border p-3"
                placeholder="Latitude"
                value={form.latitude}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, latitude: e.target.value }))
                }
              />
              <input
                className="rounded-xl border p-3"
                placeholder="Longitude"
                value={form.longitude}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, longitude: e.target.value }))
                }
              />
              <button
                onClick={captureLocation}
                className="rounded-xl bg-emerald-700 px-4 py-3 text-white"
              >
                Récupérer GPS
              </button>
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] || null)}
            />

            <div className="flex flex-wrap gap-3">
              {canIssueFromStore && (
                <button
                  onClick={() =>
                    submitMultipart(`/kitchen-issue-scan/${scanToken}/issue`, "issue")
                  }
                  disabled={processing}
                  className="rounded-xl bg-slate-900 px-4 py-3 text-white disabled:opacity-60"
                >
                  {processing
                    ? "Traitement..."
                    : "Confirmer sortie dépôt"}
                </button>
              )}

              {canReceiveInKitchen && user?.role === "cuisine" && (
                <button
                  onClick={() =>
                    submitMultipart(
                      `/kitchen-issue-scan/${scanToken}/receive`,
                      "receive"
                    )
                  }
                  disabled={processing}
                  className="rounded-xl bg-emerald-700 px-4 py-3 text-white disabled:opacity-60"
                >
                  {processing
                    ? "Traitement..."
                    : "Confirmer réception cuisine"}
                </button>
              )}
            </div>

            {!canIssueFromStore &&
              !(canReceiveInKitchen && user?.role === "cuisine") && (
                <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                  Aucune action disponible pour ce BSC à son état actuel.
                </div>
              )}
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <h2 className="mb-4 text-xl font-semibold text-slate-800">
              Historique des scans
            </h2>

            <div className="space-y-3">
              {(document.scan_events ?? document.scanEvents ?? []).length === 0 && (
                <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                  Aucun scan enregistré pour le moment.
                </div>
              )}

              {(document.scan_events ?? document.scanEvents ?? []).map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="font-semibold text-slate-800">
                    {event.scan_stage} — {event.new_status}
                  </div>

                  <div className="text-sm text-slate-500">
                    {event.user?.name ?? event.user?.email ?? "Utilisateur"} —{" "}
                    {formatDateTime(event.scanned_at)}
                  </div>

                  {(event.latitude || event.longitude) && (
                    <div className="text-sm text-slate-500">
                      GPS: {event.latitude ?? "-"}, {event.longitude ?? "-"}
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
                      className="mt-3 h-24 w-24 rounded-xl object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
