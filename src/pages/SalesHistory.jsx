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
    case "validated":
      return "bg-emerald-100 text-emerald-700";
    case "draft":
      return "bg-slate-100 text-slate-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function orderTypeLabel(value) {
  switch (String(value || "").toLowerCase()) {
    case "comptoir":
      return "Comptoir";
    case "salle":
      return "Salle";
    case "livraison":
      return "Livraison";
    default:
      return value || "-";
  }
}

export default function SalesHistory() {
  const { user, activeTerminal } = useAuth();

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [sales, setSales] = useState([]);
  const [sites, setSites] = useState([]);
  const [terminals, setTerminals] = useState([]);

  const [selectedSale, setSelectedSale] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    site_id: "",
    terminal_id: "",
    status: "",
    order_type: "",
    date_from: "",
    date_to: "",
  });

  const canCancelSale = useMemo(() => {
    const role = String(user?.role || "").toLowerCase();
    return ["pdg", "admin"].includes(role);
  }, [user]);

  const visibleSites = useMemo(() => {
    const role = String(user?.role || "").toLowerCase();
    const restricted = !["pdg", "admin"].includes(role);

    if (restricted && user?.site_id) {
      return (sites ?? []).filter((site) => Number(site.id) === Number(user.site_id));
    }

    return sites ?? [];
  }, [sites, user]);

  const visibleTerminals = useMemo(() => {
    if (!filters.site_id) return terminals ?? [];
    return (terminals ?? []).filter(
      (terminal) => Number(terminal.site_id) === Number(filters.site_id)
    );
  }, [terminals, filters.site_id]);

  const loadReferences = async () => {
    try {
      const [sitesRes, terminalsRes] = await Promise.all([
        api.get("/sites"),
        api.get("/terminals"),
      ]);

      setSites(asArray(sitesRes.data));
      setTerminals(asArray(terminalsRes.data));
    } catch (err) {
      console.error(err);
    }
  };

  const loadSales = async (customFilters = filters) => {
    try {
      setLoading(true);

      const params = {};

      Object.entries(customFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params[key] = value;
        }
      });

      const res = await api.get("/sales", { params });
      const rows = asArray(res.data);
      setSales(rows);

      if (!selectedSale && rows.length > 0) {
        await openSale(rows[0].id);
      } else if (selectedSale) {
        const stillExists = rows.some((item) => Number(item.id) === Number(selectedSale.id));
        if (!stillExists) {
          setSelectedSale(rows[0] || null);
          if (rows[0]?.id) {
            await openSale(rows[0].id);
          }
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger l'historique des ventes");
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  const openSale = async (saleId) => {
    if (!saleId) return;

    try {
      setDetailLoading(true);
      const res = await api.get(`/sales/${saleId}`);
      setSelectedSale(res.data?.data || res.data || null);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger le détail de la vente");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadReferences();
  }, []);

  useEffect(() => {
    const role = String(user?.role || "").toLowerCase();
    const restricted = !["pdg", "admin"].includes(role);

    const initialSiteId =
      restricted
        ? String(user?.site_id || "")
        : activeTerminal?.site_id
        ? String(activeTerminal.site_id)
        : "";

    setFilters((prev) => ({
      ...prev,
      site_id: prev.site_id || initialSiteId,
      terminal_id:
        prev.terminal_id || (activeTerminal?.id ? String(activeTerminal.id) : ""),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.site_id, user?.role, activeTerminal?.id, activeTerminal?.site_id]);

  useEffect(() => {
    loadSales(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => {
    loadSales(filters);
  };

  const cancelSale = async () => {
    if (!selectedSale?.id) return;

    const reason = window.prompt("Motif d'annulation (optionnel) :", "");
    if (reason === null) return;

    try {
      setCancelling(true);

      const res = await api.post(`/sales/${selectedSale.id}/cancel`, {
        cancel_reason: reason || "",
      });

      toast.success(res.data?.message || "Vente annulée");
      await loadSales(filters);
      await openSale(selectedSale.id);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur annulation vente");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-5 text-white shadow-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              Historique des ventes
            </h1>
            <p className="mt-1 text-sm text-slate-200">
              Contrôle des tickets, consultation et annulation sécurisée.
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
              <div className="text-slate-300">Poste actif</div>
              <div className="font-bold">
                {activeTerminal?.name || "Aucun poste"}
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm">
              <div className="text-slate-300">Utilisateur</div>
              <div className="font-bold">
                {user?.name || user?.email || "-"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-7">
          <input
            className="rounded-xl border p-3"
            placeholder="Recherche ticket / client / poste"
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
          />

          <select
            className="rounded-xl border p-3"
            value={filters.site_id}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                site_id: e.target.value,
                terminal_id: "",
              }))
            }
          >
            <option value="">Tous les sites</option>
            {visibleSites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border p-3"
            value={filters.terminal_id}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, terminal_id: e.target.value }))
            }
          >
            <option value="">Tous les postes</option>
            {visibleTerminals.map((terminal) => (
              <option key={terminal.id} value={terminal.id}>
                {terminal.name} {terminal.code ? `(${terminal.code})` : ""}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border p-3"
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, status: e.target.value }))
            }
          >
            <option value="">Tous statuts</option>
            <option value="validated">validated</option>
            <option value="draft">draft</option>
            <option value="cancelled">cancelled</option>
          </select>

          <select
            className="rounded-xl border p-3"
            value={filters.order_type}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, order_type: e.target.value }))
            }
          >
            <option value="">Tous types</option>
            <option value="comptoir">comptoir</option>
            <option value="salle">salle</option>
            <option value="livraison">livraison</option>
          </select>

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
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Tickets</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                {sales.length}
              </span>
            </div>

            <div className="max-h-[75vh] space-y-3 overflow-y-auto pr-1">
              {loading && (
                <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                  Chargement des ventes...
                </div>
              )}

              {!loading && sales.length === 0 && (
                <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                  Aucune vente trouvée.
                </div>
              )}

              {sales.map((sale) => (
                <div
                  key={sale.id}
                  onClick={() => openSale(sale.id)}
                  className={`cursor-pointer rounded-xl border p-4 transition ${
                    Number(selectedSale?.id) === Number(sale.id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-800">
                        {sale.sale_number}
                      </div>
                      <div className="text-sm text-slate-500">
                        {orderTypeLabel(sale.order_type)} • {formatMoney(sale.total)} Ar
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatDateTime(sale.created_at)}
                      </div>
                    </div>

                    <span
                      className={`rounded-lg px-2 py-1 text-xs font-semibold ${statusBadgeClass(
                        sale.status
                      )}`}
                    >
                      {sale.status}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {sale.site?.name && (
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {sale.site.name}
                      </span>
                    )}

                    {sale.terminal?.name && (
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {sale.terminal.name}
                      </span>
                    )}

                    {sale.customer_name && (
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {sale.customer_name}
                      </span>
                    )}

                    {sale.table_label && (
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        Table {sale.table_label}
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
            {detailLoading && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Chargement du détail...
              </div>
            )}

            {!detailLoading && !selectedSale && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Sélectionnez une vente.
              </div>
            )}

            {!detailLoading && selectedSale && (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">
                      {selectedSale.sale_number}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatDateTime(selectedSale.created_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-xl px-3 py-2 text-sm font-bold ${statusBadgeClass(
                        selectedSale.status
                      )}`}
                    >
                      {selectedSale.status}
                    </span>

                    {canCancelSale &&
                      selectedSale.status !== "cancelled" && (
                        <button
                          onClick={cancelSale}
                          disabled={cancelling}
                          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                        >
                          {cancelling ? "Annulation..." : "Annuler ticket"}
                        </button>
                      )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Type</div>
                    <div className="font-semibold text-slate-800">
                      {orderTypeLabel(selectedSale.order_type)}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Site</div>
                    <div className="font-semibold text-slate-800">
                      {selectedSale.site?.name || "-"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Poste</div>
                    <div className="font-semibold text-slate-800">
                      {selectedSale.terminal?.name || "-"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Utilisateur</div>
                    <div className="font-semibold text-slate-800">
                      {selectedSale.user?.name || selectedSale.user?.email || "-"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Client</div>
                    <div className="font-semibold text-slate-800">
                      {selectedSale.customer_name || "-"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Téléphone</div>
                    <div className="font-semibold text-slate-800">
                      {selectedSale.customer_phone || "-"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Table</div>
                    <div className="font-semibold text-slate-800">
                      {selectedSale.table_label || "-"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Sous-total</div>
                    <div className="font-semibold text-slate-800">
                      {formatMoney(selectedSale.subtotal)} Ar
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Total</div>
                    <div className="font-semibold text-slate-800">
                      {formatMoney(selectedSale.total)} Ar
                    </div>
                  </div>
                </div>

                {selectedSale.notes && (
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Notes</div>
                    <div className="font-semibold text-slate-800">
                      {selectedSale.notes}
                    </div>
                  </div>
                )}

                {selectedSale.status === "cancelled" && (
                  <div className="rounded-xl bg-red-50 p-4 text-red-700">
                    <div className="font-semibold">Ticket annulé</div>
                    <div className="text-sm">
                      {selectedSale.cancel_reason || "Aucun motif renseigné"}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="mb-3 text-lg font-semibold text-slate-800">
                    Lignes du ticket
                  </h3>

                  <div className="space-y-3">
                    {(selectedSale.items ?? []).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="font-semibold text-slate-800">
                              {item.product_name_snapshot}
                            </div>
                            <div className="text-sm text-slate-500">
                              {item.category_snapshot || "-"} • {item.station_snapshot || "-"}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-sm text-slate-500">
                              {Number(item.quantity || 0).toLocaleString("fr-FR")} ×{" "}
                              {formatMoney(item.unit_price)} Ar
                            </div>
                            <div className="font-bold text-slate-900">
                              {formatMoney(item.line_total)} Ar
                            </div>
                          </div>
                        </div>

                        {item.note && (
                          <div className="mt-2 text-sm text-slate-600">
                            Note : {item.note}
                          </div>
                        )}
                      </div>
                    ))}

                    {(selectedSale.items ?? []).length === 0 && (
                      <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                        Aucune ligne.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}