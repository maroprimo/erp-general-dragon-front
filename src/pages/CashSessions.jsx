import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("fr-FR");
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

function statusBadgeClass(status) {
  switch (String(status || "").toLowerCase()) {
    case "open":
      return "bg-emerald-100 text-emerald-700";
    case "closed":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

const PAYMENT_METHODS = [
  "cash",
  "mvola",
  "orange_money",
  "airtel_money",
  "card",
  "cheque",
  "voucher",
  "other",
];

export default function CashSessions() {
  const { user, activeTerminal } = useAuth();

  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  const [filters, setFilters] = useState({
    status: "",
    site_id: "",
    terminal_id: "",
    date_from: "",
    date_to: "",
  });

  const [openForm, setOpenForm] = useState({
    opening_cash_amount: "",
    opening_notes: "",
  });

  const [closeForm, setCloseForm] = useState({
    actual_cash_amount: "",
    closing_notes: "",
    actual_breakdown: {
      cash: "",
      mvola: "",
      orange_money: "",
      airtel_money: "",
      card: "",
      cheque: "",
      voucher: "",
      other: "",
    },
  });

  const canManageCash = useMemo(() => {
    const role = String(user?.role || "").toLowerCase();
    return ["pdg", "admin", "controle", "stock"].includes(role);
  }, [user]);

  const loadSessions = async (customFilters = filters) => {
    try {
      setLoading(true);

      const params = {};
      Object.entries(customFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params[key] = value;
        }
      });

      const res = await api.get("/cash-sessions", { params });
      const rows = asArray(res.data);
      setSessions(rows);

      if (!selectedSession && rows.length > 0) {
        await openSessionDetail(rows[0].id);
      }
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les sessions de caisse");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentSession = async () => {
    if (!activeTerminal?.id) {
      setCurrentSession(null);
      return;
    }

    try {
      const res = await api.get("/cash-sessions/current", {
        params: {
          terminal_id: activeTerminal.id,
        },
      });

      const data = res.data?.data || null;
      setCurrentSession(data);

      if (data?.summary) {
        setCloseForm((prev) => ({
          ...prev,
          actual_cash_amount:
            prev.actual_cash_amount || String(data.summary.expected_cash_drawer || ""),
        }));
      }
    } catch (err) {
      console.error(err);
      setCurrentSession(null);
    }
  };

  const openSessionDetail = async (sessionId) => {
    if (!sessionId) return;

    try {
      setDetailLoading(true);
      const res = await api.get(`/cash-sessions/${sessionId}`);
      setSelectedSession(res.data?.data || null);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger le détail de la session");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (activeTerminal?.site_id) {
      setFilters((prev) => ({
        ...prev,
        site_id: prev.site_id || String(activeTerminal.site_id),
        terminal_id: prev.terminal_id || String(activeTerminal.id || ""),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTerminal?.site_id, activeTerminal?.id]);

  useEffect(() => {
    loadSessions(filters);
    loadCurrentSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => {
    loadSessions(filters);
  };

  const handleOpenSession = async () => {
    if (!activeTerminal?.id) {
      toast.error("Aucun poste actif détecté");
      return;
    }

    if (!openForm.opening_cash_amount && Number(openForm.opening_cash_amount) !== 0) {
      toast.error("Saisir le fonds de caisse initial");
      return;
    }

    try {
      setOpening(true);

      const payload = {
        site_id: activeTerminal?.site_id || user?.site_id || null,
        warehouse_id: activeTerminal?.warehouse_id || user?.warehouse_id || null,
        terminal_id: activeTerminal.id,
        opening_cash_amount: Number(openForm.opening_cash_amount || 0),
        opening_notes: openForm.opening_notes || null,
      };

      const res = await api.post("/cash-sessions/open", payload);
      toast.success(res.data?.message || "Caisse ouverte");

      setOpenForm({
        opening_cash_amount: "",
        opening_notes: "",
      });

      await loadCurrentSession();
      await loadSessions(filters);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur ouverture caisse");
    } finally {
      setOpening(false);
    }
  };

  const handleCloseSession = async () => {
    if (!currentSession?.id) {
      toast.error("Aucune caisse ouverte");
      return;
    }

    try {
      setClosing(true);

      const breakdownPayload = {};
      Object.entries(closeForm.actual_breakdown).forEach(([key, value]) => {
        breakdownPayload[key] = Number(value || 0);
      });

      const payload = {
        actual_cash_amount: Number(closeForm.actual_cash_amount || 0),
        actual_breakdown: breakdownPayload,
        closing_notes: closeForm.closing_notes || null,
      };

      const res = await api.post(
        `/cash-sessions/${currentSession.id}/close`,
        payload
      );

      toast.success(res.data?.message || "Caisse clôturée");

      setCloseForm({
        actual_cash_amount: "",
        closing_notes: "",
        actual_breakdown: {
          cash: "",
          mvola: "",
          orange_money: "",
          airtel_money: "",
          card: "",
          cheque: "",
          voucher: "",
          other: "",
        },
      });

      await loadCurrentSession();
      await loadSessions(filters);
      if (selectedSession?.id === currentSession.id) {
        await openSessionDetail(currentSession.id);
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur clôture caisse");
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-5 text-white shadow-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              Ouverture & clôture caisse
            </h1>
            <p className="mt-1 text-sm text-slate-200">
              Gestion caisse par poste et par utilisateur.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm">
              <div className="text-slate-300">Site actif</div>
              <div className="font-bold">
                {activeTerminal?.site_name || user?.site?.name || "Non défini"}
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm">
              <div className="text-slate-300">Dépôt actif</div>
              <div className="font-bold">
                {activeTerminal?.warehouse_name || user?.warehouse?.name || "Non défini"}
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm">
              <div className="text-slate-300">Poste actif</div>
              <div className="font-bold">
                {activeTerminal?.name || "Aucun poste"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {!canManageCash && (
        <div className="rounded-2xl bg-amber-50 p-4 text-amber-700">
          Votre rôle ne permet pas encore de gérer la caisse.
        </div>
      )}

      {canManageCash && (
        <>
          {!currentSession && (
            <div className="rounded-2xl bg-white p-5 shadow">
              <h2 className="mb-4 text-xl font-bold text-slate-800">
                Ouvrir la caisse
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="rounded-xl border p-3"
                  placeholder="Fonds de caisse initial"
                  value={openForm.opening_cash_amount}
                  onChange={(e) =>
                    setOpenForm((prev) => ({
                      ...prev,
                      opening_cash_amount: e.target.value,
                    }))
                  }
                />

                <input
                  className="rounded-xl border p-3"
                  placeholder="Notes d'ouverture"
                  value={openForm.opening_notes}
                  onChange={(e) =>
                    setOpenForm((prev) => ({
                      ...prev,
                      opening_notes: e.target.value,
                    }))
                  }
                />
              </div>

              <button
                onClick={handleOpenSession}
                disabled={opening}
                className="mt-4 rounded-xl bg-slate-900 px-4 py-3 text-white disabled:opacity-60"
              >
                {opening ? "Ouverture..." : "Ouvrir la caisse"}
              </button>
            </div>
          )}

          {currentSession && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white p-5 shadow">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">
                      Caisse ouverte
                    </h2>
                    <div className="text-sm text-slate-500">
                      {currentSession.session_number} • ouverte le{" "}
                      {formatDateTime(currentSession.opened_at)}
                    </div>
                  </div>

                  <span
                    className={`rounded-xl px-3 py-2 text-sm font-bold ${statusBadgeClass(
                      currentSession.status
                    )}`}
                  >
                    {currentSession.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Fond initial</div>
                    <div className="font-semibold text-slate-800">
                      {formatMoney(currentSession.summary?.opening_cash_amount)} Ar
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Ventes</div>
                    <div className="font-semibold text-slate-800">
                      {formatMoney(currentSession.summary?.total_sales_amount)} Ar
                    </div>
                  </div>

                  <div className="rounded-xl bg-emerald-50 p-4">
                    <div className="text-sm text-emerald-600">Cash théorique</div>
                    <div className="font-semibold text-emerald-700">
                      {formatMoney(currentSession.summary?.expected_cash_drawer)} Ar
                    </div>
                  </div>

                  <div className="rounded-xl bg-blue-50 p-4">
                    <div className="text-sm text-blue-600">Paiements</div>
                    <div className="font-semibold text-blue-700">
                      {formatMoney(currentSession.summary?.total_payments_amount)} Ar
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                  <h3 className="mb-3 text-lg font-semibold text-slate-800">
                    Répartition théorique par mode
                  </h3>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {PAYMENT_METHODS.map((method) => (
                      <div key={method} className="rounded-xl bg-slate-50 p-3">
                        <div className="text-xs uppercase text-slate-500">
                          {method}
                        </div>
                        <div className="font-bold text-slate-900">
                          {formatMoney(
                            currentSession.summary?.payment_breakdown?.[method] || 0
                          )}{" "}
                          Ar
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow">
                <h2 className="mb-4 text-xl font-bold text-slate-800">
                  Clôturer la caisse
                </h2>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="rounded-xl border p-3"
                    placeholder="Cash compté"
                    value={closeForm.actual_cash_amount}
                    onChange={(e) =>
                      setCloseForm((prev) => ({
                        ...prev,
                        actual_cash_amount: e.target.value,
                      }))
                    }
                  />

                  {PAYMENT_METHODS.map((method) => (
                    <input
                      key={method}
                      type="number"
                      min="0"
                      step="0.01"
                      className="rounded-xl border p-3"
                      placeholder={`Compté ${method}`}
                      value={closeForm.actual_breakdown[method]}
                      onChange={(e) =>
                        setCloseForm((prev) => ({
                          ...prev,
                          actual_breakdown: {
                            ...prev.actual_breakdown,
                            [method]: e.target.value,
                          },
                        }))
                      }
                    />
                  ))}
                </div>

                <textarea
                  className="mt-4 w-full rounded-xl border p-3"
                  rows={3}
                  placeholder="Notes de clôture"
                  value={closeForm.closing_notes}
                  onChange={(e) =>
                    setCloseForm((prev) => ({
                      ...prev,
                      closing_notes: e.target.value,
                    }))
                  }
                />

                <button
                  onClick={handleCloseSession}
                  disabled={closing}
                  className="mt-4 rounded-xl bg-red-600 px-4 py-3 text-white disabled:opacity-60"
                >
                  {closing ? "Clôture..." : "Clôturer la caisse"}
                </button>
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
              <select
                className="rounded-xl border p-3"
                value={filters.status}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, status: e.target.value }))
                }
              >
                <option value="">Tous statuts</option>
                <option value="open">open</option>
                <option value="closed">closed</option>
              </select>

              <input
                className="rounded-xl border p-3"
                placeholder="Site ID"
                value={filters.site_id}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, site_id: e.target.value }))
                }
              />

              <input
                className="rounded-xl border p-3"
                placeholder="Terminal ID"
                value={filters.terminal_id}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, terminal_id: e.target.value }))
                }
              />

              <input
                type="date"
                className="rounded-xl border p-3"
                value={filters.date_from}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, date_from: e.target.value }))
                }
              />

              <div className="flex gap-2">
                <input
                  type="date"
                  className="w-full rounded-xl border p-3"
                  value={filters.date_to}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, date_to: e.target.value }))
                  }
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
                <h2 className="mb-4 text-xl font-bold text-slate-800">
                  Sessions caisse
                </h2>

                <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
                  {loading && (
                    <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                      Chargement...
                    </div>
                  )}

                  {!loading && sessions.length === 0 && (
                    <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                      Aucune session trouvée.
                    </div>
                  )}

                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => openSessionDetail(session.id)}
                      className={`cursor-pointer rounded-xl border p-4 transition ${
                        Number(selectedSession?.id) === Number(session.id)
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-800">
                            {session.session_number}
                          </div>
                          <div className="text-sm text-slate-500">
                            {session.terminal?.name || "-"}
                          </div>
                          <div className="text-xs text-slate-400">
                            {formatDateTime(session.opened_at)}
                          </div>
                        </div>

                        <span
                          className={`rounded-lg px-2 py-1 text-xs font-semibold ${statusBadgeClass(
                            session.status
                          )}`}
                        >
                          {session.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="xl:col-span-7">
                <h2 className="mb-4 text-xl font-bold text-slate-800">
                  Détail session
                </h2>

                {detailLoading && (
                  <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                    Chargement du détail...
                  </div>
                )}

                {!detailLoading && !selectedSession && (
                  <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                    Sélectionnez une session.
                  </div>
                )}

                {!detailLoading && selectedSession && (
                  <div className="space-y-4 rounded-2xl bg-slate-50 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-2xl font-black text-slate-900">
                          {selectedSession.session_number}
                        </div>
                        <div className="text-sm text-slate-500">
                          {selectedSession.terminal?.name || "-"} • ouverte par{" "}
                          {selectedSession.openedBy?.name || "-"}
                        </div>
                      </div>

                      <span
                        className={`rounded-xl px-3 py-2 text-sm font-bold ${statusBadgeClass(
                          selectedSession.status
                        )}`}
                      >
                        {selectedSession.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-xl bg-white p-4">
                        <div className="text-sm text-slate-500">Ouverte le</div>
                        <div className="font-semibold text-slate-800">
                          {formatDateTime(selectedSession.opened_at)}
                        </div>
                      </div>

                      <div className="rounded-xl bg-white p-4">
                        <div className="text-sm text-slate-500">Clôturée le</div>
                        <div className="font-semibold text-slate-800">
                          {formatDateTime(selectedSession.closed_at)}
                        </div>
                      </div>

                      <div className="rounded-xl bg-white p-4">
                        <div className="text-sm text-slate-500">Fond initial</div>
                        <div className="font-semibold text-slate-800">
                          {formatMoney(selectedSession.summary?.opening_cash_amount)} Ar
                        </div>
                      </div>

                      <div className="rounded-xl bg-white p-4">
                        <div className="text-sm text-slate-500">Ventes</div>
                        <div className="font-semibold text-slate-800">
                          {formatMoney(selectedSession.summary?.total_sales_amount)} Ar
                        </div>
                      </div>

                      <div className="rounded-xl bg-white p-4">
                        <div className="text-sm text-slate-500">Paiements</div>
                        <div className="font-semibold text-slate-800">
                          {formatMoney(selectedSession.summary?.total_payments_amount)} Ar
                        </div>
                      </div>

                      <div className="rounded-xl bg-white p-4">
                        <div className="text-sm text-slate-500">Cash théorique</div>
                        <div className="font-semibold text-slate-800">
                          {formatMoney(selectedSession.summary?.expected_cash_drawer)} Ar
                        </div>
                      </div>

                      <div className="rounded-xl bg-white p-4">
                        <div className="text-sm text-slate-500">Cash réel</div>
                        <div className="font-semibold text-slate-800">
                          {formatMoney(selectedSession.summary?.actual_cash_amount)} Ar
                        </div>
                      </div>

                      <div className="rounded-xl bg-white p-4">
                        <div className="text-sm text-slate-500">Écart</div>
                        <div className="font-semibold text-slate-800">
                          {formatMoney(selectedSession.summary?.cash_difference)} Ar
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-white p-4">
                      <div className="mb-3 text-sm font-semibold text-slate-700">
                        Répartition théorique
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {PAYMENT_METHODS.map((method) => (
                          <div key={method} className="rounded-xl bg-slate-50 p-3">
                            <div className="text-xs uppercase text-slate-500">
                              {method}
                            </div>
                            <div className="font-bold text-slate-900">
                              {formatMoney(
                                selectedSession.summary?.payment_breakdown?.[method] || 0
                              )}{" "}
                              Ar
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedSession.closing_notes && (
                      <div className="rounded-xl bg-white p-4">
                        <div className="text-sm text-slate-500">Notes clôture</div>
                        <div className="font-semibold text-slate-800">
                          {selectedSession.closing_notes}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}