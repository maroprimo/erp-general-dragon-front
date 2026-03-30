import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [tableFilter, setTableFilter] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadLogs = async () => {
    try {
      const res = await api.get("/audit-logs");
      setLogs(res.data.data ?? res.data);
      setMessage("");
    } catch (err) {
      console.error(err);
      setError("Impossible de charger les logs d’audit");
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Correction : On entoure tout l'ensemble de variables avec des backticks ` `
      const text = `${log.action ?? ""} ${log.table_name ?? ""} ${log.description ?? ""} ${log.user?.name ?? ""} ${log.user?.email ?? ""}`.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());
      const matchesAction = actionFilter ? log.action === actionFilter : true;
      const matchesTable = tableFilter ? log.table_name === tableFilter : true;

      return matchesSearch && matchesAction && matchesTable;
    });
  }, [logs, search, actionFilter, tableFilter]);

  const actionOptions = [...new Set(logs.map((log) => log.action).filter(Boolean))];
  const tableOptions = [...new Set(logs.map((log) => log.table_name).filter(Boolean))];

  return (
    <div className="min-h-screen bg-slate-100 p-6 space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow">
        <h1 className="mb-4 text-3xl font-bold text-slate-800">
          Journal d’audit
        </h1>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <input
            type="text"
            placeholder="Rechercher..."
            className="rounded-xl border p-3"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="rounded-xl border p-3"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">Toutes les actions</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border p-3"
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
          >
            <option value="">Toutes les tables</option>
            {tableOptions.map((table) => (
              <option key={table} value={table}>
                {table}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">
            Liste des événements
          </h2>

          <button
            onClick={loadLogs}
            className="rounded-xl bg-slate-900 px-4 py-2 text-white"
          >
            Rafraîchir
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="border-b border-slate-200">
              <tr className="text-slate-600">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Table</th>
                <th className="px-4 py-3">Record ID</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : "-"}
                    </td>
                  <td className="px-4 py-3">
                    {log.user?.name || log.user?.email || "-"}
                  </td>
                  <td className="px-4 py-3">{log.action}</td>
                  <td className="px-4 py-3">{log.table_name || "-"}</td>
                  <td className="px-4 py-3">{log.record_id || "-"}</td>
                  <td className="px-4 py-3">{log.description || "-"}</td>
                  <td className="px-4 py-3">{log.ip_address || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="mt-4 text-slate-500">Aucun log trouvé.</div>
        )}

        {message && <div className="mt-4 text-emerald-700">{message}</div>}
        {error && <div className="mt-4 text-red-600">{error}</div>}
      </div>
    </div>
  );
}