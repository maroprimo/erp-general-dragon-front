import { useEffect, useRef, useState } from "react";
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

function extractToken(value) {
  if (!value) return "";

  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("scan-kitchen-consumption");

    if (idx >= 0 && parts[idx + 1]) {
      return parts[idx + 1];
    }
  } catch (_) {}

  return value.replace(/^.*scan-kitchen-consumption\//, "").trim();
}

export default function KitchenConsumptionScanMobile() {
  const [scanToken, setScanToken] = useState("");
  const [order, setOrder] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const scannerRef = useRef(null);
  const scannerActiveRef = useRef(false);

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
      { fps: 10, qrbox: { width: 250, height: 250 } },
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
      const res = await api.post(`/kitchen-consumption-scan/${scanToken}/verify`);
      toast.success(res.data?.message || "Bon vérifié");
      setOrder(res.data?.data || null);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur vérification cuisine");
    }
  };

  const finalizeKitchen = async () => {
    try {
      const res = await api.post(`/kitchen-consumption-scan/${scanToken}/finalize`);
      toast.success(res.data?.message || "Bon validé");
      setOrder(res.data?.data || null);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur validation finale");
    }
  };

  const workflow = order?.kitchen_workflow_status;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Scan sortie cuisine</h1>
        <p className="text-slate-500">
          Vérification cuisine puis validation finale du bon de sortie ingrédients.
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
            onClick={() => loadOrder(scanToken)}
            className="rounded-xl bg-slate-900 px-4 py-3 text-white"
          >
            Charger
          </button>

          <button
            onClick={() => setCameraOpen((p) => !p)}
            className="rounded-xl bg-blue-700 px-4 py-3 text-white"
          >
            {cameraOpen ? "Fermer caméra" : "Scanner avec caméra"}
          </button>
        </div>

        {cameraOpen && (
          <div className="rounded-2xl border p-4">
            <div id="kitchen-qr-reader" />
          </div>
        )}
      </div>

      {loading && <div>Chargement...</div>}

      {order && (
        <>
          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Ordre</div>
                <div className="font-semibold text-slate-800">
                  {order.order_number || "-"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Produit</div>
                <div className="font-semibold text-slate-800">
                  {order.product?.name || "-"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Site</div>
                <div className="font-semibold text-slate-800">
                  {order.site?.name || "-"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Workflow cuisine</div>
                <div className="font-semibold text-slate-800">
                  {order.kitchen_workflow_status || "-"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="mb-4 text-lg font-semibold text-slate-800">
              Lignes de consommation
            </div>

            <div className="space-y-3">
              {(order.consumptions || []).map((line) => (
                <div
                  key={line.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="font-semibold text-slate-800">
                    {line.product?.name || "-"}
                  </div>
                  <div className="text-sm text-slate-500">
                    Quantité : {line.quantity ?? line.consumed_quantity ?? "-"}
                  </div>
                </div>
              ))}

              {(!order.consumptions || order.consumptions.length === 0) && (
                <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                  Aucune ligne de consommation.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Vérification cuisine</div>
                <div className="font-semibold text-slate-800">
                  {formatDateTime(order.kitchen_verified_at)}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {order.kitchen_verified_by?.name ||
                    order.kitchen_verified_by?.email ||
                    "-"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Validation finale</div>
                <div className="font-semibold text-slate-800">
                  {formatDateTime(order.kitchen_validated_at)}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {order.kitchen_validated_by?.name ||
                    order.kitchen_validated_by?.email ||
                    "-"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="flex flex-wrap gap-3">
              {workflow === "waiting_kitchen" && (
                <button
                  onClick={verifyKitchen}
                  className="rounded-xl bg-blue-700 px-4 py-3 text-white"
                >
                  Vérification cuisine
                </button>
              )}

              {(workflow === "waiting_kitchen" || workflow === "kitchen_verified") && (
                <button
                  onClick={finalizeKitchen}
                  className="rounded-xl bg-emerald-700 px-4 py-3 text-white"
                >
                  Validation finale cuisine
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}