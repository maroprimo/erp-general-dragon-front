import { useEffect, useMemo, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import api from "../services/api";
import toast from "react-hot-toast";
import { formatDateTime } from "../utils/formatters";

function firstValue(...values) {
  return values.find((value) => value !== null && value !== undefined && value !== "");
}

function displayUser(userLike) {
  if (!userLike) return "-";
  if (typeof userLike === "string") return userLike;
  return userLike?.name || userLike?.email || "-";
}

function extractToken(value) {
  if (!value) return "";

  try {
    const url = new URL(value);

    const tokenFromQuery = url.searchParams.get("scan_token");
    if (tokenFromQuery) {
      return tokenFromQuery;
    }

    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("scan-purchase-document");

    if (idx >= 0 && parts[idx + 1]) {
      return parts[idx + 1];
    }
  } catch (_) {}

  const fromQueryMatch = value.match(/[?&]scan_token=([^&]+)/);
  if (fromQueryMatch?.[1]) {
    return decodeURIComponent(fromQueryMatch[1]);
  }

  return value.replace(/^.*scan-purchase-document\//, "").trim();
}

export default function PurchaseDocumentScanMobile() {
  const [scanToken, setScanToken] = useState("");
  const [data, setData] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const scannerRef = useRef(null);
  const scannerActiveRef = useRef(false);

  const loadDocument = async (tokenValue) => {
    const token = extractToken(tokenValue || scanToken);

    if (!token) {
      toast.error("Token QR introuvable");
      return;
    }

    try {
      setLoading(true);
      const res = await api.get(`/purchase-document-scan/${token}`);
      setData(res.data);
      setScanToken(token);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Impossible de charger le document");
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
      "purchase-doc-qr-reader",
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

  const securityCheck = async () => {
    try {
      setProcessing(true);
      const res = await api.post(`/purchase-document-scan/${scanToken}/security-check`);
      toast.success(res.data.message || "Vérification sécurité OK");
      await loadDocument(scanToken);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur sécurité");
    } finally {
      setProcessing(false);
    }
  };

  const stockValidate = async () => {
    try {
      setProcessing(true);
      const res = await api.post(`/purchase-document-scan/${scanToken}/stock-validate`);
      toast.success(res.data.message || "Validation OK");
      await loadDocument(scanToken);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur validation");
    } finally {
      setProcessing(false);
    }
  };

  const document = data?.document || null;
  const purchaseOrder =
    document?.purchaseOrder ||
    document?.purchase_order ||
    document?.goodsReceipt?.purchaseOrder ||
    document?.goodsReceipt?.purchase_order ||
    null;
  const goodsReceipt = document?.goodsReceipt || document?.goods_receipt || null;

  const resolvedSecurityVerifiedAt = firstValue(
    document?.security_verified_at,
    goodsReceipt?.security_verified_at,
    purchaseOrder?.security_verified_at
  );

  const resolvedSecurityVerifiedBy = firstValue(
    document?.security_verified_by,
    document?.securityVerifiedBy,
    goodsReceipt?.security_verified_by,
    goodsReceipt?.securityVerifiedBy,
    purchaseOrder?.security_verified_by,
    purchaseOrder?.securityVerifiedBy
  );

  const resolvedStockValidatedAt = firstValue(
    document?.stock_validated_at,
    goodsReceipt?.stock_validated_at,
    purchaseOrder?.stock_validated_at
  );

  const resolvedStockValidatedBy = firstValue(
    document?.stock_validated_by,
    document?.stockValidatedBy,
    goodsReceipt?.stock_validated_by,
    goodsReceipt?.stockValidatedBy,
    purchaseOrder?.stock_validated_by,
    purchaseOrder?.stockValidatedBy
  );

  const resolvedManagerVerifiedAt = firstValue(
    document?.manager_verified_at,
    document?.validated_at,
    document?.admin_validated_at,
    goodsReceipt?.manager_verified_at
  );

  const resolvedManagerVerifiedBy = firstValue(
    document?.manager_verified_by,
    document?.managerVerifiedBy,
    document?.validated_by,
    document?.validatedBy,
    document?.admin_validated_by,
    document?.adminValidatedBy,
    goodsReceipt?.manager_verified_by,
    goodsReceipt?.managerVerifiedBy
  );

  const workflow = String(document?.workflow_status || "").toLowerCase();
  const label = String(data?.label || "").toUpperCase();
  const sourceType = String(document?.source_type || "").toLowerCase();
  const status = String(document?.status || "").toLowerCase();

  const isBC = label === "BC" || !!document?.order_number;
  const isBR = label === "BR" || !!document?.receipt_number;
  const isInvoice = label === "FACTURE" || !!document?.invoice_number;

  const isDirectBr = isBR && sourceType === "purchase_pos_direct";
  const isDirectInvoice = isInvoice && !document?.goods_receipt_id;

  const canSecurityCheck = useMemo(() => {
    if (isBC) {
      return (
        !resolvedSecurityVerifiedAt &&
        ["waiting_security", "pending", "", "-"].includes(workflow)
      );
    }

    return false;
  }, [isBC, resolvedSecurityVerifiedAt, workflow]);

  const canManagerValidate = useMemo(() => {
    if (isBC) {
      return (
        !!resolvedSecurityVerifiedAt &&
        !resolvedStockValidatedAt &&
        workflow === "security_verified"
      );
    }

    if (isBR) {
      return (
        !resolvedManagerVerifiedAt &&
        !document?.stock_applied_at &&
        ["waiting_manager", "security_verified", "stock_validated", "", "-"].includes(
          workflow
        )
      );
    }

    if (isInvoice) {
      return status === "draft";
    }

    return false;
  }, [
    isBC,
    isBR,
    isInvoice,
    resolvedSecurityVerifiedAt,
    resolvedStockValidatedAt,
    resolvedManagerVerifiedAt,
    document?.stock_applied_at,
    workflow,
    status,
  ]);

  const actionLabel = useMemo(() => {
    if (isInvoice) return "Validation facture";
    if (isBR) return "Validation responsable stock";
    return "Validation responsable stock";
  }, [isInvoice, isBR]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Scan document achat</h1>
        <p className="text-slate-500">Sécurité puis validation responsable.</p>
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
            <div id="purchase-doc-qr-reader" />
          </div>
        )}
      </div>

      {loading && <div>Chargement...</div>}

      {data && (
        <>
          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Type</div>
                <div className="font-semibold text-slate-800">{data.label || "-"}</div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Workflow</div>
                <div className="font-semibold text-slate-800">
                  {document?.workflow_status || "-"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Statut</div>
                <div className="font-semibold text-slate-800">
                  {document?.status || "-"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Date sécurité</div>
                <div className="font-semibold text-slate-800">
                  {formatDateTime(resolvedSecurityVerifiedAt)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Vérifié sécurité</div>
              <div className="font-semibold text-slate-800">
                {formatDateTime(resolvedSecurityVerifiedAt)}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {displayUser(resolvedSecurityVerifiedBy)}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Validation stock</div>
              <div className="font-semibold text-slate-800">
                {formatDateTime(resolvedStockValidatedAt)}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {displayUser(resolvedStockValidatedBy)}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">
                {isInvoice ? "Validation manager / admin" : "Vérification responsable"}
              </div>
              <div className="font-semibold text-slate-800">
                {formatDateTime(resolvedManagerVerifiedAt)}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {displayUser(resolvedManagerVerifiedBy)}
              </div>
            </div>
          </div>

          {isBR && !resolvedManagerVerifiedAt && (
            <div className="rounded-2xl bg-amber-50 p-4 text-amber-700">
              {isDirectBr
                ? "Ce BR direct doit être validé par le responsable avant intégration au stock."
                : "Ce BR doit être validé par le responsable avant intégration au stock."}
            </div>
          )}

          {isBR && resolvedManagerVerifiedAt && (
            <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-700">
              Ce BR a déjà été validé.
            </div>
          )}

          {isInvoice && isDirectInvoice && status === "draft" && (
            <div className="rounded-2xl bg-amber-50 p-4 text-amber-700">
              Cette facture directe est en brouillon. Le stock n’entrera qu’après validation.
            </div>
          )}

          {isInvoice && status === "validated" && (
            <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-700">
              Cette facture a déjà été validée.
            </div>
          )}

          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="flex flex-wrap gap-3">
              {canSecurityCheck && (
                <button
                  onClick={securityCheck}
                  disabled={processing}
                  className="rounded-xl bg-slate-900 px-4 py-3 text-white disabled:opacity-60"
                >
                  {processing ? "Traitement..." : "Vérification sécurité"}
                </button>
              )}

              {canManagerValidate && (
                <button
                  onClick={stockValidate}
                  disabled={processing}
                  className="rounded-xl bg-emerald-700 px-4 py-3 text-white disabled:opacity-60"
                >
                  {processing ? "Traitement..." : actionLabel}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}