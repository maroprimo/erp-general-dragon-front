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

function levelClass(level) {
  switch (String(level || "").toLowerCase()) {
    case "danger":
      return "bg-red-100 text-red-700 border-red-200";
    case "warning":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "success":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function categoryLabel(category) {
  switch (String(category || "")) {
    case "cash":
      return "Caisse";
    case "kitchen_loss":
      return "Pertes cuisine";
    case "stock":
      return "Stock";
    case "report":
      return "Rapport";
    case "sale":
      return "Vente";
    case "system":
      return "Système";
    default:
      return category || "-";
  }
}

export default function ExecutiveNotifications() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [counters, setCounters] = useState({});
  const [sites, setSites] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [filters, setFilters] = useState({
    search: "",
    category: "",
    level: "",
    site_id: "",
    warehouse_id: "",
    is_read: "",
    date_from: "",
    date_to: "",
  });

  const visibleWarehouses = useMemo(() => {
    if (!filters.site_id) return warehouses;
    return warehouses.filter(
      (warehouse) => Number(warehouse.site_id) === Number(filters.site_id)
    );
  }, [warehouses, filters.site_id]);

  const loadReferences = async () => {
    try {
      const [sitesRes, warehousesRes] = await Promise.all([
        api.get("/sites"),
        api.get("/warehouses"),
      ]);

      setSites(asArray(sitesRes.data));
      setWarehouses(asArray(warehousesRes.data));
    } catch (err) {
      console.error(err);
    }
  };

  const loadCounters = async () => {
    try {
      const res = await api.get("/executive-notifications/counters");
      setCounters(res.data || {});
    } catch (err) {
      console.error(err);
    }
  };

  const loadNotifications = async (customFilters = filters) => {
    try {
      setLoading(true);

      const params = {};
      Object.entries(customFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params[key] = value;
        }
      });

      const res = await api.get("/executive-notifications", { params });
      const rows = asArray(res.data);

      setNotifications(rows);
      setSelectedNotification((prev) => prev || rows[0] || null);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les notifications PDG");
      setNotifications([]);
      setSelectedNotification(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReferences();
    loadCounters();
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => {
    loadNotifications(filters);
  };

  const resetFilters = () => {
    const next = {
      search: "",
      category: "",
      level: "",
      site_id: "",
      warehouse_id: "",
      is_read: "",
      date_from: "",
      date_to: "",
    };

    setFilters(next);
    loadNotifications(next);
  };

  const markAsRead = async (notification) => {
    if (!notification?.id) return;

    try {
      const res = await api.post(`/executive-notifications/${notification.id}/read`);
      toast.success(res.data?.message || "Notification lue");

      setSelectedNotification(res.data?.data || notification);
      await loadCounters();
      await loadNotifications();
    } catch (err) {
      console.error(err);
      toast.error("Erreur marquage lecture");
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await api.post("/executive-notifications/mark-all-read");
      toast.success(res.data?.message || "Notifications lues");

      await loadCounters();
      await loadNotifications();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lecture globale");
    }
  };

  const removeNotification = async (notification) => {
    if (!notification?.id) return;

    const ok = window.confirm("Supprimer cette notification ?");
    if (!ok) return;

    try {
      const res = await api.delete(`/executive-notifications/${notification.id}`);
      toast.success(res.data?.message || "Notification supprimée");

      setSelectedNotification(null);
      await loadCounters();
      await loadNotifications();
    } catch (err) {
      console.error(err);
      toast.error("Erreur suppression notification");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-red-900 p-5 text-white shadow-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-3xl font-black">Centre notifications PDG</h1>
            <p className="mt-1 text-sm text-slate-200">
              Alertes importantes : caisse, pertes cuisine, stock, rapports et système.
            </p>
          </div>

          <button
            onClick={markAllAsRead}
            className="rounded-xl bg-white px-4 py-3 font-bold text-slate-900"
          >
            Tout marquer comme lu
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-sm text-slate-500">Non lues</div>
          <div className="text-3xl font-black text-slate-900">
            {counters.unread || 0}
          </div>
        </div>

        <div className="rounded-2xl bg-red-50 p-4 shadow">
          <div className="text-sm text-red-600">Danger</div>
          <div className="text-3xl font-black text-red-700">
            {counters.danger || 0}
          </div>
        </div>

        <div className="rounded-2xl bg-amber-50 p-4 shadow">
          <div className="text-sm text-amber-600">Warning</div>
          <div className="text-3xl font-black text-amber-700">
            {counters.warning || 0}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 shadow">
          <div className="text-sm text-slate-500">Total affiché</div>
          <div className="text-3xl font-black text-slate-900">
            {notifications.length}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-8">
          <input
            className="rounded-xl border p-3"
            placeholder="Recherche..."
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
          />

          <select
            className="rounded-xl border p-3"
            value={filters.category}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, category: e.target.value }))
            }
          >
            <option value="">Toutes catégories</option>
            <option value="cash">Caisse</option>
            <option value="kitchen_loss">Pertes cuisine</option>
            <option value="stock">Stock</option>
            <option value="report">Rapport</option>
            <option value="sale">Vente</option>
            <option value="system">Système</option>
          </select>

          <select
            className="rounded-xl border p-3"
            value={filters.level}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, level: e.target.value }))
            }
          >
            <option value="">Tous niveaux</option>
            <option value="danger">Danger</option>
            <option value="warning">Warning</option>
            <option value="success">Succès</option>
            <option value="info">Info</option>
          </select>

          <select
            className="rounded-xl border p-3"
            value={filters.site_id}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                site_id: e.target.value,
                warehouse_id: "",
              }))
            }
          >
            <option value="">Tous sites</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border p-3"
            value={filters.warehouse_id}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, warehouse_id: e.target.value }))
            }
          >
            <option value="">Tous dépôts</option>
            {visibleWarehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border p-3"
            value={filters.is_read}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, is_read: e.target.value }))
            }
          >
            <option value="">Toutes</option>
            <option value="false">Non lues</option>
            <option value="true">Lues</option>
          </select>

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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">
                Notifications
              </h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                {notifications.length}
              </span>
            </div>

            <div className="max-h-[75vh] space-y-3 overflow-y-auto pr-1">
              {loading && (
                <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                  Chargement...
                </div>
              )}

              {!loading && notifications.length === 0 && (
                <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                  Aucune notification.
                </div>
              )}

              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => setSelectedNotification(notification)}
                  className={`cursor-pointer rounded-xl border p-4 transition ${
                    Number(selectedNotification?.id) === Number(notification.id)
                      ? "border-blue-500 bg-blue-50"
                      : notification.is_read
                      ? "border-slate-200 bg-white hover:bg-slate-50"
                      : "border-amber-300 bg-amber-50 hover:bg-amber-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-800">
                        {notification.title}
                      </div>

                      <div className="text-sm text-slate-500">
                        {categoryLabel(notification.category)} •{" "}
                        {formatDateTime(notification.notified_at || notification.created_at)}
                      </div>
                    </div>

                    <span
                      className={`rounded-lg border px-2 py-1 text-xs font-semibold ${levelClass(
                        notification.level
                      )}`}
                    >
                      {notification.level}
                    </span>
                  </div>

                  <div className="mt-3 line-clamp-2 text-sm text-slate-600">
                    {notification.message || "-"}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {!notification.is_read && (
                      <span className="rounded-lg bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                        Non lue
                      </span>
                    )}

                    {notification.site?.name && (
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs">
                        {notification.site.name}
                      </span>
                    )}

                    {notification.warehouse?.name && (
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs">
                        {notification.warehouse.name}
                      </span>
                    )}

                    {notification.amount !== null && notification.amount !== undefined && (
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs">
                        {money(notification.amount)} Ar
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
            {!selectedNotification && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Sélectionnez une notification.
              </div>
            )}

            {selectedNotification && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">
                      {selectedNotification.title}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {categoryLabel(selectedNotification.category)} •{" "}
                      {formatDateTime(
                        selectedNotification.notified_at ||
                          selectedNotification.created_at
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-xl border px-3 py-2 text-sm font-bold ${levelClass(
                        selectedNotification.level
                      )}`}
                    >
                      {selectedNotification.level}
                    </span>

                    {!selectedNotification.is_read && (
                      <button
                        onClick={() => markAsRead(selectedNotification)}
                        className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white"
                      >
                        Marquer lu
                      </button>
                    )}

                    <button
                      onClick={() => removeNotification(selectedNotification)}
                      className="rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">Message</div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {selectedNotification.message || "-"}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Site</div>
                    <div className="font-semibold">
                      {selectedNotification.site?.name || "Global"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Dépôt</div>
                    <div className="font-semibold">
                      {selectedNotification.warehouse?.name || "-"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Montant</div>
                    <div className="font-semibold">
                      {selectedNotification.amount !== null &&
                      selectedNotification.amount !== undefined
                        ? `${money(selectedNotification.amount)} Ar`
                        : "-"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Référence</div>
                    <div className="font-semibold">
                      {selectedNotification.reference_type || "-"} #
                      {selectedNotification.reference_id || "-"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Statut lecture</div>
                    <div className="font-semibold">
                      {selectedNotification.is_read ? "Lue" : "Non lue"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Lu par</div>
                    <div className="font-semibold">
                      {selectedNotification.read_by?.name ||
                        selectedNotification.readBy?.name ||
                        "-"}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="mb-3 font-bold">Données techniques</h3>
                  <pre className="max-h-80 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
                    {JSON.stringify(selectedNotification.meta || {}, null, 2)}
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