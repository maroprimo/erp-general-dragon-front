import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function money(v) {
  return Number(v || 0).toLocaleString("fr-FR");
}

function formatDate(value) {
  if (!value) return "-";
  return String(value).slice(0, 10);
}

function formatDateTime(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("fr-FR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function statusClass(status) {
  switch (String(status || "").toLowerCase()) {
    case "sent":
      return "bg-emerald-100 text-emerald-700";
    case "failed":
      return "bg-red-100 text-red-700";
    case "pending":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function ExecutiveReportLogs() {
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);

  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [sites, setSites] = useState([]);

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    site_id: "",
    date_from: "",
    date_to: "",
  });

  const selectedSummary = useMemo(() => {
    return selectedLog?.summary_snapshot || {};
  }, [selectedLog]);

  const loadSites = async () => {
    try {
      const res = await api.get("/sites");
      setSites(asArray(res.data));
    } catch (err) {
      console.error(err);
    }
  };

  const loadLogs = async (customFilters = filters) => {
    try {
      setLoading(true);

      const params = {};
      Object.entries(customFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params[key] = value;
        }
      });

      const res = await api.get("/executive-report-logs", { params });
      const rows = asArray(res.data);

      setLogs(rows);
      setSelectedLog((prev) => prev || rows[0] || null);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger l’historique des rapports");
      setLogs([]);
      setSelectedLog(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSites();
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => {
    loadLogs(filters);
  };

  const resetFilters = () => {
    const next = {
      search: "",
      status: "",
      site_id: "",
      date_from: "",
      date_to: "",
    };

    setFilters(next);
    loadLogs(next);
  };

  const resendSelected = async () => {
    if (!selectedLog?.id) return;

    const ok = window.confirm(
      `Relancer l'envoi du rapport ${selectedLog.subject || ""} ?`
    );

    if (!ok) return;

    try {
      setResending(true);

      const res = await api.post(`/executive-report-logs/${selectedLog.id}/resend`);

      toast.success(res.data?.message || "Rapport relancé");

      setSelectedLog(res.data?.data || selectedLog);
      await loadLogs();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur relance rapport");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-700 p-5 text-white shadow-xl">
        <h1 className="text-3xl font-black">Historique rapports PDG</h1>
        <p className="mt-1 text-sm text-slate-200">
          Suivi des rapports envoyés automatiquement ou manuellement.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <input
            className="rounded-xl border p-3"
            placeholder="Recherche email / sujet"
            value={filters.search}
            onChange={(e) =>
              setFilters((p) => ({ ...p, search: e.target.value }))
            }
          />

          <select
            className="rounded-xl border p-3"
            value={filters.status}
            onChange={(e) =>
              setFilters((p) => ({ ...p, status: e.target.value }))
            }
          >
            <option value="">Tous statuts</option>
            <option value="sent">Envoyé</option>
            <option value="failed">Erreur</option>
            <option value="pending">En attente</option>
          </select>

          <select
            className="rounded-xl border p-3"
            value={filters.site_id}
            onChange={(e) =>
              setFilters((p) => ({ ...p, site_id: e.target.value }))
            }
          >
            <option value="">Tous sites</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            className="rounded-xl border p-3"
            value={filters.date_from}
            onChange={(e) =>
              setFilters((p) => ({ ...p, date_from: e.target.value }))
            }
          />

          <input
            type="date"
            className="rounded-xl border p-3"
            value={filters.date_to}
            onChange={(e) =>
              setFilters((p) => ({ ...p, date_to: e.target.value }))
            }
          />

          <div className="flex gap-2">
            <button
              onClick={applyFilters}
              className="rounded-xl bg-slate-900 px-4 py-3 font-bold text-white"
            >
              OK
            </button>

            <button
              onClick={resetFilters}
              className="rounded-xl bg-slate-100 px-4 py-3 font-bold text-slate-700"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Rapports</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                {logs.length}
              </span>
            </div>

            <div className="max-h-[75vh] space-y-3 overflow-y-auto pr-1">
              {loading && (
                <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                  Chargement...
                </div>
              )}

              {!loading && logs.length === 0 && (
                <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                  Aucun rapport trouvé.
                </div>
              )}

              {logs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`cursor-pointer rounded-xl border p-4 transition ${
                    Number(selectedLog?.id) === Number(log.id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-800">
                        {log.subject || `Rapport #${log.id}`}
                      </div>
                      <div className="text-sm text-slate-500">
                        {formatDate(log.date_from)} au {formatDate(log.date_to)}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatDateTime(log.sent_at || log.created_at)}
                      </div>
                    </div>

                    <span
                      className={`rounded-lg px-2 py-1 text-xs font-semibold ${statusClass(
                        log.status
                      )}`}
                    >
                      {log.status}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs">
                      {log.triggered_by_type}
                    </span>

                    {log.site?.name && (
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs">
                        {log.site.name}
                      </span>
                    )}

                    {(log.to_emails || []).slice(0, 2).map((email) => (
                      <span
                        key={email}
                        className="rounded-lg bg-slate-100 px-2 py-1 text-xs"
                      >
                        {email}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="xl:col-span-7">
          <div className="rounded-2xl bg-white p-5 shadow">
            {!selectedLog && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Sélectionnez un rapport.
              </div>
            )}

            {selectedLog && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">
                      {selectedLog.subject || `Rapport #${selectedLog.id}`}
                    </h2>
                    <p className="text-sm text-slate-500">
                      Période : {formatDate(selectedLog.date_from)} au{" "}
                      {formatDate(selectedLog.date_to)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-xl px-3 py-2 text-sm font-bold ${statusClass(
                        selectedLog.status
                      )}`}
                    >
                      {selectedLog.status}
                    </span>

                    <button
                      onClick={resendSelected}
                      disabled={resending}
                      className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                    >
                      {resending ? "Relance..." : "Relancer"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Déclencheur</div>
                    <div className="font-semibold">
                      {selectedLog.triggered_by_type || "-"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Envoyé le</div>
                    <div className="font-semibold">
                      {formatDateTime(selectedLog.sent_at)}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Site</div>
                    <div className="font-semibold">
                      {selectedLog.site?.name || "Tous sites"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4 md:col-span-2">
                    <div className="text-sm text-slate-500">Destinataires</div>
                    <div className="font-semibold">
                      {(selectedLog.to_emails || []).join(", ") || "-"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">CC</div>
                    <div className="font-semibold">
                      {(selectedLog.cc_emails || []).join(", ") || "-"}
                    </div>
                  </div>
                </div>

                {selectedLog.error_message && (
                  <div className="rounded-2xl bg-red-50 p-4 text-red-700">
                    <div className="font-black">Erreur</div>
                    <div className="text-sm">{selectedLog.error_message}</div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                    <div className="text-sm text-slate-500">CA</div>
                    <div className="text-xl font-black">
                      {money(selectedSummary.total_sales)} Ar
                    </div>
                  </div>

                  <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                    <div className="text-sm text-slate-500">Paiements</div>
                    <div className="text-xl font-black text-emerald-700">
                      {money(selectedSummary.payments_total)} Ar
                    </div>
                  </div>

                  <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                    <div className="text-sm text-slate-500">Écart caisse</div>
                    <div
                      className={`text-xl font-black ${
                        Number(selectedSummary.cash_difference_total || 0) < 0
                          ? "text-red-700"
                          : "text-emerald-700"
                      }`}
                    >
                      {money(selectedSummary.cash_difference_total)} Ar
                    </div>
                  </div>

                  <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                    <div className="text-sm text-slate-500">Pertes cuisine</div>
                    <div className="text-xl font-black text-red-700">
                      {money(selectedSummary.kitchen_loss_value)} Ar
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="mb-3 font-bold">Données techniques</h3>
                  <pre className="max-h-80 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
                    {JSON.stringify(selectedLog.meta || {}, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
