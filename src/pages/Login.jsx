import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

export default function Login() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [terminalId, setTerminalId] = useState("");
  const [terminals, setTerminals] = useState([]);
  const [loadingTerminals, setLoadingTerminals] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadTerminals = async () => {
      try {
        setLoadingTerminals(true);
        const res = await api.get("/login-terminals");
        setTerminals(asArray(res.data));
      } catch (err) {
        console.error(err);
        setTerminals([]);
      } finally {
        setLoadingTerminals(false);
      }
    };

    loadTerminals();
  }, []);

  const terminalOptions = useMemo(() => {
    return terminals.map((terminal) => {
      const siteName = terminal?.site?.name || "Site";
      const warehouseName = terminal?.warehouse?.name || "Sans dépôt";
      const code = terminal?.code ? ` - ${terminal.code}` : "";

      return {
        value: String(terminal.id),
        label: `${siteName} • ${warehouseName} • ${terminal.name}${code}`,
        raw: terminal,
      };
    });
  }, [terminals]);

  const selectedTerminal = useMemo(() => {
    return terminalOptions.find((item) => item.value === terminalId)?.raw || null;
  }, [terminalOptions, terminalId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (terminalOptions.length > 0 && !terminalId) {
      setError("Choisir un poste");
      return;
    }

    try {
      setSubmitting(true);

      const terminalMeta = selectedTerminal
        ? {
            id: selectedTerminal.id,
            code: selectedTerminal.code || "",
            name: selectedTerminal.name || "",
            terminal_type: selectedTerminal.terminal_type || "",
            site_id: selectedTerminal.site_id || null,
            warehouse_id: selectedTerminal.warehouse_id || null,
            site_name: selectedTerminal?.site?.name || "",
            warehouse_name: selectedTerminal?.warehouse?.name || "",
          }
        : null;

      await login(email, password, terminalId, terminalMeta);
    } catch (err) {
      console.error(err);
      setError("Connexion impossible");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl"
      >
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-slate-800">General Dragon</h1>
          <p className="mt-2 text-sm text-slate-500">Connexion ERP Restaurants</p>
        </div>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-xl border border-slate-300 p-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Mot de passe"
            className="w-full rounded-xl border border-slate-300 p-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <select
            className="w-full rounded-xl border border-slate-300 p-3 disabled:bg-slate-100"
            value={terminalId}
            onChange={(e) => setTerminalId(e.target.value)}
            disabled={loadingTerminals}
          >
            <option value="">
              {loadingTerminals ? "Chargement des postes..." : "Choisir un poste"}
            </option>
            {terminalOptions.map((terminal) => (
              <option key={terminal.value} value={terminal.value}>
                {terminal.label}
              </option>
            ))}
          </select>

          {selectedTerminal && (
            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              <div>
                <strong>Site :</strong> {selectedTerminal?.site?.name || "-"}
              </div>
              <div>
                <strong>Dépôt :</strong> {selectedTerminal?.warehouse?.name || "Sans dépôt"}
              </div>
              <div>
                <strong>Poste :</strong> {selectedTerminal?.name || "-"}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting ? "Connexion..." : "Se connecter"}
          </button>
        </div>

        {error && <div className="mt-4 text-center text-red-600">{error}</div>}
      </form>
    </div>
  );
}