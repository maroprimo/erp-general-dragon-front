import { useEffect, useMemo, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import api from "../services/api";
import toast from "react-hot-toast";

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function formatDateTime(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("fr-FR");
  } catch {
    return value;
  }
}

function formatQty(value) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function extractToken(value) {
  if (!value) return "";

  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("scan-transfer");
    if (idx >= 0 && parts[idx + 1]) {
      return parts[idx + 1];
    }
  } catch (_) {
    // rien
  }

  return value.replace(/^.*scan-transfer\//, "").trim();
}

function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-100 text-blue-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-800 break-words">{value || "-"}</div>
    </div>
  );
}

export default function TransferScanMobile() {
  const [scanToken, setScanToken] = useState("");
  const [transfer, setTransfer] = useState(null);
  const [allWarehouses, setAllWarehouses] = useState([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const scannerRef = useRef(null);
  const scannerActiveRef = useRef(false);

  useEffect(() => {
    const loadWarehouses = async () => {
      try {
        const res = await api.get("/warehouses");
        setAllWarehouses(asArray(res.data));
      } catch (err) {
        console.error(err);
      }
    };

    loadWarehouses();
  }, []);

  const loadTransfer = async (tokenValue) => {
    const token = extractToken(tokenValue || scanToken);

    if (!token) {
      toast.error("Token QR introuvable");
      return;
    }

    try {
      setLoading(true);
      const res = await api.get(`/transfer-scan/${token}`);
      const data = res.data?.data || res.data || null;
      setTransfer(data);
      setScanToken(token);
      setFromWarehouseId(String(data?.from_warehouse_id || ""));
      setToWarehouseId(String(data?.to_warehouse_id || ""));
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Impossible de charger le bon de transfert");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("scan_token");
    if (token) {
      setScanToken(token);
      loadTransfer(token);
    }
  }, []);

  useEffect(() => {
    if (!cameraOpen) return;
    if (scannerActiveRef.current) return;

    const scanner = new Html5QrcodeScanner(
      "transfer-qr-reader",
      { fps: 10, qrbox: { width: 240, height: 240 } },
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
        loadTransfer(token);
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

  const fromSiteWarehouses = useMemo(() => {
    if (!transfer?.from_site_id) return allWarehouses;
    return allWarehouses.filter(
      (w) => Number(w.site_id) === Number(transfer.from_site_id)
    );
  }, [allWarehouses, transfer]);

  const toSiteWarehouses = useMemo(() => {
    if (!transfer?.to_site_id) return allWarehouses;
    return allWarehouses.filter(
      (w) => Number(w.site_id) === Number(transfer.to_site_id)
    );
  }, [allWarehouses, transfer]);

  const canSecurityCheck =
    !!transfer &&
    !transfer.rejected_at &&
    !transfer.security_verified_at &&
    !transfer.destination_received_at;

  const canDriverPickup =
    !!transfer &&
    !transfer.rejected_at &&
    !!transfer.security_verified_at &&
    !transfer.driver_picked_at &&
    !transfer.destination_received_at;

  const canDestinationReceive =
    !!transfer &&
    !transfer.rejected_at &&
    !!transfer.security_verified_at &&
    !!transfer.driver_picked_at &&
    !transfer.destination_received_at;

  const canReject =
    !!transfer &&
    !transfer.rejected_at &&
    !transfer.driver_picked_at &&
    !transfer.destination_received_at;

  const workflowTone = useMemo(() => {
    if (!transfer) return "slate";
    if (transfer.rejected_at) return "red";
    if (transfer.destination_received_at) return "emerald";
    if (transfer.driver_picked_at) return "blue";
    if (transfer.security_verified_at) return "amber";
    return "slate";
  }, [transfer]);

  const securityCheck = async () => {
    if (!fromWarehouseId || !toWarehouseId) {
      toast.error("Choisir dépôt source et dépôt destination");
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.post(`/transfer-scan/${scanToken}/security-check`, {
        from_warehouse_id: Number(fromWarehouseId),
        to_warehouse_id: Number(toWarehouseId),
      });
      toast.success(res.data?.message || "Bon vérifié par sécurité");
      setTransfer(res.data?.data || res.data || null);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur vérification sécurité");
    } finally {
      setActionLoading(false);
    }
  };

  const driverPickup = async () => {
    try {
      setActionLoading(true);
      const res = await api.post(`/transfer-scan/${scanToken}/driver-pickup`);
      toast.success(res.data?.message || "Prise en charge chauffeur enregistrée");
      setTransfer(res.data?.data || res.data || null);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur prise en charge chauffeur");
    } finally {
      setActionLoading(false);
    }
  };

  const destinationReceive = async () => {
    if (!toWarehouseId) {
      toast.error("Choisir le dépôt destination");
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.post(`/transfer-scan/${scanToken}/destination-receive`, {
        to_warehouse_id: Number(toWarehouseId),
      });
      toast.success(res.data?.message || "Réception destination enregistrée");
      setTransfer(res.data?.data || res.data || null);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur réception destination");
    } finally {
      setActionLoading(false);
    }
  };

  const rejectTransfer = async () => {
    if (!rejectReason.trim()) {
      toast.error("Indiquer le motif du rejet");
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.post(`/transfer-scan/${scanToken}/reject`, {
        reject_reason: rejectReason,
      });
      toast.success(res.data?.message || "Bon rejeté");
      setTransfer(res.data?.data || res.data || null);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur rejet du transfert");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto w-full max-w-6xl p-3 sm:p-4 md:p-6 space-y-4">
        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">Scan transfert</h1>
              <p className="text-sm text-slate-500">
                Sécurité → Chauffeur → Réception destination.
              </p>
            </div>

            <Badge tone={workflowTone}>
              {transfer?.transport_status || transfer?.status || "waiting"}
            </Badge>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
            <input
              className="rounded-2xl border border-slate-200 p-3 text-sm"
              placeholder="Coller le token ou l’URL du QR transfert"
              value={scanToken}
              onChange={(e) => setScanToken(e.target.value)}
            />

            <button
              onClick={() => loadTransfer(scanToken)}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
            >
              Charger
            </button>

            <button
              onClick={() => setCameraOpen((p) => !p)}
              className="rounded-2xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white"
            >
              {cameraOpen ? "Fermer caméra" : "Scanner"}
            </button>
          </div>

          {cameraOpen && (
            <div className="rounded-2xl border border-slate-200 p-3">
              <div id="transfer-qr-reader" />
            </div>
          )}
        </div>

        {loading && (
          <div className="rounded-3xl bg-white p-4 shadow-sm text-slate-500">
            Chargement...
          </div>
        )}

        {transfer && (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <InfoCard label="Bon" value={transfer.request_number} />
              <InfoCard label="Site source" value={transfer.from_site?.name} />
              <InfoCard label="Site destination" value={transfer.to_site?.name} />
              <InfoCard label="Notes" value={transfer.notes || "-"} />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <InfoCard label="Sécurité" value={formatDateTime(transfer.security_verified_at)} />
              <InfoCard label="Chauffeur" value={formatDateTime(transfer.driver_picked_at)} />
              <InfoCard label="Réception" value={formatDateTime(transfer.destination_received_at)} />
              <InfoCard label="Rejet" value={formatDateTime(transfer.rejected_at)} />
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Dépôt source
                  </label>
                  <select
                    className="w-full rounded-2xl border border-slate-200 p-3 text-sm"
                    value={fromWarehouseId}
                    onChange={(e) => setFromWarehouseId(e.target.value)}
                  >
                    <option value="">Choisir</option>
                    {fromSiteWarehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
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
                    value={toWarehouseId}
                    onChange={(e) => setToWarehouseId(e.target.value)}
                  >
                    <option value="">Choisir</option>
                    {toSiteWarehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {canReject && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Motif du rejet
                  </label>
                  <textarea
                    className="w-full rounded-2xl border border-slate-200 p-3 text-sm"
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Indiquer pourquoi le bon est rejeté"
                  />
                </div>
              )}
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">Lignes transfert</h2>
                <Badge tone="slate">{(transfer.lines || []).length} ligne(s)</Badge>
              </div>

              <div className="space-y-3">
                {(transfer.lines || []).map((line) => (
                  <div
                    key={line.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="font-semibold text-slate-800">
                      {line.product?.name || "-"}
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-500 md:grid-cols-4">
                      <div>Demandé : {formatQty(line.requested_quantity)}</div>
                      <div>Validé : {formatQty(line.approved_quantity)}</div>
                      <div>Envoyé : {formatQty(line.sent_quantity)}</div>
                      <div>Reçu : {formatQty(line.received_quantity)}</div>
                    </div>
                  </div>
                ))}

                {(!transfer.lines || transfer.lines.length === 0) && (
                  <div className="rounded-2xl bg-slate-50 p-4 text-slate-500">
                    Aucune ligne de transfert.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">Historique scans</h2>
                <Badge tone="slate">{(transfer.scan_events || []).length} événement(s)</Badge>
              </div>

              <div className="space-y-3">
                {(transfer.scan_events || []).map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="font-semibold text-slate-800">
                      {event.scan_stage || "-"}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {formatDateTime(event.scanned_at)}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {event.user?.name || event.user?.email || "-"}
                    </div>
                  </div>
                ))}

                {(!transfer.scan_events || transfer.scan_events.length === 0) && (
                  <div className="rounded-2xl bg-slate-50 p-4 text-slate-500">
                    Aucun historique de scan.
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-3 z-10">
              <div className="rounded-3xl bg-white/95 p-3 shadow-lg backdrop-blur space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <button
                    onClick={securityCheck}
                    disabled={!canSecurityCheck || actionLoading}
                    className="rounded-2xl bg-blue-700 px-4 py-4 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {actionLoading && canSecurityCheck ? "Traitement..." : "Vérification sécurité"}
                  </button>

                  <button
                    onClick={driverPickup}
                    disabled={!canDriverPickup || actionLoading}
                    className="rounded-2xl bg-slate-900 px-4 py-4 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {actionLoading && canDriverPickup ? "Traitement..." : "Prise en charge chauffeur"}
                  </button>

                  <button
                    onClick={destinationReceive}
                    disabled={!canDestinationReceive || actionLoading}
                    className="rounded-2xl bg-emerald-700 px-4 py-4 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {actionLoading && canDestinationReceive ? "Traitement..." : "Réception destination"}
                  </button>

                  <button
                    onClick={rejectTransfer}
                    disabled={!canReject || actionLoading}
                    className="rounded-2xl bg-red-700 px-4 py-4 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {actionLoading && canReject ? "Traitement..." : "Rejeter le bon"}
                  </button>
                </div>

                {transfer.rejected_at && (
                  <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">
                    Ce bon a été rejeté. Motif : {transfer.reject_reason || "-"}
                  </div>
                )}

                {transfer.destination_received_at && (
                  <div className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">
                    Ce bon a déjà été réceptionné à destination.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}