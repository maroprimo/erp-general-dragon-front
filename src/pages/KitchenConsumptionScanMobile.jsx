import { useEffect, useMemo, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import api from "../services/api";
import toast from "react-hot-toast";

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
    const idx = parts.indexOf("scan-kitchen-consumption");
    if (idx >= 0 && parts[idx + 1]) {
      return parts[idx + 1];
    }
  } catch (_) {
    // rien
  }

  return value.replace(/^.*scan-kitchen-consumption\//, "").trim();
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

export default function KitchenConsumptionScanMobile() {
  const [scanToken, setScanToken] = useState("");
  const [order, setOrder] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const scannerRef = useRef(null);
  const scannerActiveRef = useRef(false);

  const workflow = order?.kitchen_workflow_status || "waiting_kitchen";

  const workflowTone = useMemo(() => {
    if (workflow === "kitchen_validated") return "emerald";
    if (workflow === "kitchen_verified") return "blue";
    return "amber";
  }, [workflow]);

  const loadOrder = async (tokenValue) => {
    const token = extractToken(tokenValue || scanToken);

    if (!token) {
      toast.error("Token QR introuvable");
      return;
    }

    try {
      setLoading(true);
      const res = await api.get(`/kitchen-consumption-scan/${token}`);
      setOrder(res.data?.data || null);
      setScanToken(token);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Impossible de charger le bon cuisine");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("scan_token");
    if (token) {
      setScanToken(token);
      loadOrder(token);
    }
  }, []);

  useEffect(() => {
    if (!cameraOpen) return;
    if (scannerActiveRef.current) return;

    const scanner = new Html5QrcodeScanner(
      "kitchen-qr-reader",
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
        loadOrder(token);
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

  const verifyKitchen = async () => {
    try {
      setActionLoading(true);
      const res = await api.post(`/kitchen-consumption-scan/${scanToken}/verify`);
      toast.success(res.data?.message || "Bon vérifié");
      setOrder(res.data?.data || null);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur vérification cuisine");
    } finally {
      setActionLoading(false);
    }
  };

  const finalizeKitchen = async () => {
    try {
      setActionLoading(true);
      const res = await api.post(`/kitchen-consumption-scan/${scanToken}/finalize`);
      toast.success(res.data?.message || "Bon validé");
      setOrder(res.data?.data || null);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur validation finale");
    } finally {
      setActionLoading(false);
    }
  };

  const canVerify = workflow === "waiting_kitchen";
  const canFinalize = workflow === "waiting_kitchen" || workflow === "kitchen_verified";

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto w-full max-w-5xl p-3 sm:p-4 md:p-6 space-y-4">
        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">Scan sortie cuisine</h1>
              <p className="text-sm text-slate-500">
                Vérification cuisine puis validation finale du bon de sortie ingrédients.
              </p>
            </div>

            <Badge tone={workflowTone}>{workflow}</Badge>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
            <input
              className="rounded-2xl border border-slate-200 p-3 text-sm"
              placeholder="Coller le token ou l’URL QR"
              value={scanToken}
              onChange={(e) => setScanToken(e.target.value)}
            />

            <button
              onClick={() => loadOrder(scanToken)}
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
              <div id="kitchen-qr-reader" />
            </div>
          )}
        </div>

        {loading && (
          <div className="rounded-3xl bg-white p-4 shadow-sm text-slate-500">
            Chargement...
          </div>
        )}

        {order && (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <InfoCard label="Ordre" value={order.order_number} />
              <InfoCard label="Produit" value={order.product?.name || order.recipe?.product?.name} />
              <InfoCard label="Site" value={order.site?.name} />
              <InfoCard label="Dépôt" value={order.warehouse?.name} />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <InfoCard label="Qté prévue" value={formatQty(order.planned_quantity)} />
              <InfoCard label="Vérification cuisine" value={formatDateTime(order.kitchen_verified_at)} />
              <InfoCard label="Validation finale" value={formatDateTime(order.kitchen_validated_at)} />
              <InfoCard
                label="Utilisateur vérif./validation"
                value={
                  order.kitchen_validated_by?.name ||
                  order.kitchen_verified_by?.name ||
                  "-"
                }
              />
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">Consommations</h2>
                <Badge tone="slate">{(order.consumptions || []).length} ligne(s)</Badge>
              </div>

              <div className="space-y-3">
                {(order.consumptions || []).map((line) => (
                  <div
                    key={line.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="font-semibold text-slate-800">
                      {line.product?.name || "-"}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      Quantité : {formatQty(line.actual_quantity ?? line.quantity ?? line.consumed_quantity)}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Notes : {line.notes || "-"}
                    </div>
                  </div>
                ))}

                {(!order.consumptions || order.consumptions.length === 0) && (
                  <div className="rounded-2xl bg-slate-50 p-4 text-slate-500">
                    Aucune ligne de consommation.
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-3 z-10">
              <div className="rounded-3xl bg-white/95 p-3 shadow-lg backdrop-blur">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <button
                    onClick={verifyKitchen}
                    disabled={!canVerify || actionLoading}
                    className="rounded-2xl bg-blue-700 px-4 py-4 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {actionLoading && canVerify ? "Traitement..." : "Vérification cuisine"}
                  </button>

                  <button
                    onClick={finalizeKitchen}
                    disabled={!canFinalize || actionLoading}
                    className="rounded-2xl bg-emerald-700 px-4 py-4 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {actionLoading && canFinalize ? "Traitement..." : "Validation finale cuisine"}
                  </button>
                </div>

                {workflow === "kitchen_validated" && (
                  <div className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">
                    Ce bon a déjà été validé définitivement par la cuisine.
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