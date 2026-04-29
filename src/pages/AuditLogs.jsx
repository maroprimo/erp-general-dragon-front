import { useEffect, useMemo, useState } from "react";
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
    return new Date(value).toLocaleString("fr-FR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return value;
  }
}

function badgeClass(module) {
  switch (String(module || "").toLowerCase()) {
    case "sales":
      return "bg-blue-100 text-blue-700";
    case "payments":
      return "bg-emerald-100 text-emerald-700";
    case "cash":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function AuditLogs() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    module: "",
    action: "",
    date_from: "",
    date_to: "",
  });

  const actions = useMemo(() => {
    return [...new Set(logs.map((log) => log.action).filter(Boolean))];
  }, [logs]);

  const loadLogs = async (customFilters = filters) => {
    try {
      setLoading(true);
      const params = {};
      Object.entries(customFilters).forEach(([key, value]) => {
        if (value !== "") params[key] = value;
      });

      const res = await api.get("/audit-logs", { params });
      const rows = asArray(res.data);
      setLogs(rows);
      setSelectedLog((prev) => prev || rows[0] || null);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger le journal d'audit");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => loadLogs(filters);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-700 p-5 text-white shadow-xl">
        <h1 className="text-3xl font-black">Journal d’audit</h1>
        <p className="mt-1 text-sm text-slate-200">
          Traçabilité complète des actions sensibles.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <input
            className="rounded-xl border p-3"
            placeholder="Recherche..."
            value={filters.search}
            onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
          />

          <select
            className="rounded-xl border p-3"
            value={filters.module}
            onChange={(e) => setFilters((p) => ({ ...p, module: e.target.value }))}
          >
            <option value="">Tous modules</option>
            <option value="sales">sales</option>
            <option value="payments">payments</option>
            <option value="cash">cash</option>
          </select>

          <select
            className="rounded-xl border p-3"
            value={filters.action}
            onChange={(e) => setFilters((p) => ({ ...p, action: e.target.value }))}
          >
            <option value="">Toutes actions</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>

          <input
            type="date"
            className="rounded-xl border p-3"
            value={filters.date_from}
            onChange={(e) => setFilters((p) => ({ ...p, date_from: e.target.value }))}
          />

          <input
            type="date"
            className="rounded-xl border p-3"
            value={filters.date_to}
            onChange={(e) => setFilters((p) => ({ ...p, date_to: e.target.value }))}
          />

          <button
            onClick={applyFilters}
            className="rounded-xl bg-slate-900 px-4 py-3 text-white"
          >
            OK
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Événements</h2>
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
                  Aucun audit trouvé.
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
                        {log.reference_number || `AUDIT-${log.id}`}
                      </div>
                      <div className="text-sm text-slate-500">
                        {log.action}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatDateTime(log.performed_at || log.created_at)}
                      </div>
                    </div>

                    <span
                      className={`rounded-lg px-2 py-1 text-xs font-semibold ${badgeClass(
                        log.module
                      )}`}
                    >
                      {log.module}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {log.user?.name && (
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs">
                        {log.user.name}
                      </span>
                    )}
                    {log.site?.name && (
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs">
                        {log.site.name}
                      </span>
                    )}
                    {log.terminal?.name && (
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs">
                        {log.terminal.name}
                      </span>
                    )}
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
                Sélectionnez un audit.
              </div>
            )}

            {selectedLog && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">
                      {selectedLog.reference_number || `AUDIT-${selectedLog.id}`}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {formatDateTime(selectedLog.performed_at || selectedLog.created_at)}
                    </p>
                  </div>

                  <span
                    className={`rounded-xl px-3 py-2 text-sm font-bold ${badgeClass(
                      selectedLog.module
                    )}`}
                  >
                    {selectedLog.module} / {selectedLog.action}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Utilisateur</div>
                    <div className="font-semibold">
                      {selectedLog.user?.name || selectedLog.user?.email || "-"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Site</div>
                    <div className="font-semibold">{selectedLog.site?.name || "-"}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Poste</div>
                    <div className="font-semibold">{selectedLog.terminal?.name || "-"}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">IP</div>
                    <div className="font-semibold">{selectedLog.ip_address || "-"}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 md:col-span-2">
                    <div className="text-sm text-slate-500">Notes</div>
                    <div className="font-semibold">{selectedLog.notes || "-"}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h3 className="mb-3 font-bold">Anciennes valeurs</h3>
                    <pre className="max-h-80 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
                      {JSON.stringify(selectedLog.old_values || {}, null, 2)}
                    </pre>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h3 className="mb-3 font-bold">Nouvelles valeurs</h3>
                    <pre className="max-h-80 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
                      {JSON.stringify(selectedLog.new_values || {}, null, 2)}
                    </pre>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="mb-3 font-bold">Meta</h3>
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