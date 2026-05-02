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

function qty(v) {
  return Number(v || 0).toLocaleString("fr-FR", {
    maximumFractionDigits: 3,
  });
}

function statusClass(status) {
  switch (String(status || "").toLowerCase()) {
    case "approved":
      return "bg-blue-100 text-blue-700";
    case "converted":
      return "bg-emerald-100 text-emerald-700";
    case "rejected":
    case "cancelled":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
}

function priorityClass(priority) {
  switch (String(priority || "").toLowerCase()) {
    case "urgent":
      return "bg-red-100 text-red-700 animate-pulse";
    case "warning":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function StockReplenishmentSuggestions() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  const [sites, setSites] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [filters, setFilters] = useState({
    search: "",
    site_id: "",
    warehouse_id: "",
    status: "pending",
    priority: "",
    suggestion_type: "",
  });

  const visibleWarehouses = useMemo(() => {
    if (!filters.site_id) return warehouses;
    return warehouses.filter(
      (warehouse) => Number(warehouse.site_id) === Number(filters.site_id)
    );
  }, [warehouses, filters.site_id]);

  const totals = useMemo(() => {
    return suggestions.reduce(
      (acc, row) => {
        acc.count += 1;
        acc.amount += Number(row.estimated_amount || 0);

        if (row.priority === "urgent") acc.urgent += 1;
        if (row.priority === "warning") acc.warning += 1;

        return acc;
      },
      { count: 0, amount: 0, urgent: 0, warning: 0 }
    );
  }, [suggestions]);

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

  const loadSuggestions = async (customFilters = filters) => {
    try {
      setLoading(true);

      const params = {};
      Object.entries(customFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params[key] = value;
        }
      });

      const res = await api.get("/stock-replenishment-suggestions", { params });
      const rows = asArray(res.data);

      setSuggestions(rows);
      setSelectedSuggestion((prev) => prev || rows[0] || null);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les suggestions");
      setSuggestions([]);
      setSelectedSuggestion(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReferences();
    loadSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => {
    loadSuggestions(filters);
  };

  const resetFilters = () => {
    const next = {
      search: "",
      site_id: "",
      warehouse_id: "",
      status: "pending",
      priority: "",
      suggestion_type: "",
    };

    setFilters(next);
    loadSuggestions(next);
  };

  const generateSuggestions = async () => {
    try {
      setGenerating(true);

      const payload = {
        site_id: filters.site_id || null,
        warehouse_id: filters.warehouse_id || null,
        force: false,
      };

      const res = await api.post("/stock-replenishment-suggestions/generate", payload);

      toast.success(res.data?.message || "Analyse exécutée");

      await loadSuggestions(filters);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur génération suggestions");
    } finally {
      setGenerating(false);
    }
  };

  const approveSuggestion = async () => {
    if (!selectedSuggestion?.id) return;

    const notes = window.prompt("Note d'approbation optionnelle :", "");
    if (notes === null) return;

    try {
      const res = await api.post(
        `/stock-replenishment-suggestions/${selectedSuggestion.id}/approve`,
        { notes }
      );

      toast.success(res.data?.message || "Suggestion approuvée");
      setSelectedSuggestion(res.data?.data || selectedSuggestion);
      await loadSuggestions(filters);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur approbation");
    }
  };

  const rejectSuggestion = async () => {
    if (!selectedSuggestion?.id) return;

    const notes = window.prompt("Motif du rejet :", "Suggestion rejetée");
    if (notes === null) return;

    try {
      const res = await api.post(
        `/stock-replenishment-suggestions/${selectedSuggestion.id}/reject`,
        { notes }
      );

      toast.success(res.data?.message || "Suggestion rejetée");
      setSelectedSuggestion(res.data?.data || selectedSuggestion);
      await loadSuggestions(filters);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur rejet");
    }
  };

  const cancelSuggestion = async () => {
    if (!selectedSuggestion?.id) return;

    const notes = window.prompt("Motif d'annulation :", "Suggestion annulée");
    if (notes === null) return;

    try {
      const res = await api.post(
        `/stock-replenishment-suggestions/${selectedSuggestion.id}/cancel`,
        { notes }
      );

      toast.success(res.data?.message || "Suggestion annulée");
      setSelectedSuggestion(res.data?.data || selectedSuggestion);
      await loadSuggestions(filters);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur annulation");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-900 p-5 text-white shadow-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-3xl font-black">Suggestions réapprovisionnement</h1>
            <p className="mt-1 text-sm text-slate-200">
              Proposition automatique d’achat ou de transfert depuis les stocks critiques.
            </p>
          </div>

          <button
            onClick={generateSuggestions}
            disabled={generating}
            className="rounded-xl bg-white px-4 py-3 font-bold text-slate-900 disabled:opacity-60"
          >
            {generating ? "Analyse..." : "Analyser maintenant"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-sm text-slate-500">Suggestions</div>
          <div className="text-3xl font-black text-slate-900">
            {totals.count}
          </div>
        </div>

        <div className="rounded-2xl bg-red-50 p-4 shadow">
          <div className="text-sm text-red-600">Urgentes</div>
          <div className="text-3xl font-black text-red-700">
            {totals.urgent}
          </div>
        </div>

        <div className="rounded-2xl bg-amber-50 p-4 shadow">
          <div className="text-sm text-amber-600">Warning</div>
          <div className="text-3xl font-black text-amber-700">
            {totals.warning}
          </div>
        </div>

        <div className="rounded-2xl bg-emerald-50 p-4 shadow">
          <div className="text-sm text-emerald-600">Montant estimé</div>
          <div className="text-3xl font-black text-emerald-700">
            {money(totals.amount)} Ar
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-7">
          <input
            className="rounded-xl border p-3"
            placeholder="Recherche produit / dépôt / fournisseur"
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
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, status: e.target.value }))
            }
          >
            <option value="">Tous statuts</option>
            <option value="pending">En attente</option>
            <option value="approved">Approuvée</option>
            <option value="rejected">Rejetée</option>
            <option value="converted">Convertie</option>
            <option value="cancelled">Annulée</option>
          </select>

          <select
            className="rounded-xl border p-3"
            value={filters.priority}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, priority: e.target.value }))
            }
          >
            <option value="">Toutes priorités</option>
            <option value="urgent">Urgent</option>
            <option value="warning">Warning</option>
            <option value="normal">Normal</option>
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
              <h2 className="text-xl font-bold text-slate-800">Suggestions</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                {suggestions.length}
              </span>
            </div>

            <div className="max-h-[75vh] space-y-3 overflow-y-auto pr-1">
              {loading && (
                <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                  Chargement...
                </div>
              )}

              {!loading && suggestions.length === 0 && (
                <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                  Aucune suggestion.
                </div>
              )}

              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  onClick={() => setSelectedSuggestion(suggestion)}
                  className={`cursor-pointer rounded-xl border p-4 transition ${
                    Number(selectedSuggestion?.id) === Number(suggestion.id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-800">
                        {suggestion.product?.name || "-"}
                      </div>

                      <div className="text-sm text-slate-500">
                        {suggestion.warehouse?.name || "-"} •{" "}
                        {suggestion.supplier?.name || "Sans fournisseur"}
                      </div>
                    </div>

                    <span
                      className={`rounded-lg px-2 py-1 text-xs font-semibold ${priorityClass(
                        suggestion.priority
                      )}`}
                    >
                      {suggestion.priority}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`rounded-lg px-2 py-1 text-xs ${statusClass(suggestion.status)}`}>
                      {suggestion.status}
                    </span>

                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs">
                      Dispo : {qty(suggestion.quantity_available)}
                    </span>

                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs">
                      Suggéré : {qty(suggestion.suggested_quantity)}
                    </span>

                    <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                      {money(suggestion.estimated_amount)} Ar
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="xl:col-span-7">
          <div className="rounded-2xl bg-white p-5 shadow">
            {!selectedSuggestion && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Sélectionnez une suggestion.
              </div>
            )}

            {selectedSuggestion && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">
                      {selectedSuggestion.product?.name || "-"}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {selectedSuggestion.product?.code || "-"} •{" "}
                      {selectedSuggestion.warehouse?.name || "-"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-xl px-3 py-2 text-sm font-bold ${priorityClass(
                        selectedSuggestion.priority
                      )}`}
                    >
                      {selectedSuggestion.priority}
                    </span>

                    <span
                      className={`rounded-xl px-3 py-2 text-sm font-bold ${statusClass(
                        selectedSuggestion.status
                      )}`}
                    >
                      {selectedSuggestion.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Disponible</div>
                    <div className="font-black">
                      {qty(selectedSuggestion.quantity_available)}{" "}
                      {selectedSuggestion.unit?.name || ""}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Seuil minimum</div>
                    <div className="font-black">
                      {qty(selectedSuggestion.min_stock)}{" "}
                      {selectedSuggestion.unit?.name || ""}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Cible stock</div>
                    <div className="font-black">
                      {qty(selectedSuggestion.target_stock)}{" "}
                      {selectedSuggestion.unit?.name || ""}
                    </div>
                  </div>

                  <div className="rounded-xl bg-emerald-50 p-4">
                    <div className="text-sm text-emerald-600">Qté suggérée</div>
                    <div className="font-black text-emerald-700">
                      {qty(selectedSuggestion.suggested_quantity)}{" "}
                      {selectedSuggestion.unit?.name || ""}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Prix dernier achat</div>
                    <div className="font-black">
                      {money(selectedSuggestion.last_purchase_price)} Ar
                    </div>
                  </div>

                  <div className="rounded-xl bg-emerald-50 p-4">
                    <div className="text-sm text-emerald-600">Montant estimé</div>
                    <div className="font-black text-emerald-700">
                      {money(selectedSuggestion.estimated_amount)} Ar
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Fournisseur</div>
                    <div className="font-black">
                      {selectedSuggestion.supplier?.name || "Sans fournisseur"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Type</div>
                    <div className="font-black">
                      {selectedSuggestion.suggestion_type}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">Raison</div>
                  <div className="font-semibold text-slate-900">
                    {selectedSuggestion.reason || "-"}
                  </div>
                </div>

                {selectedSuggestion.notes && (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Notes</div>
                    <div className="font-semibold text-slate-900">
                      {selectedSuggestion.notes}
                    </div>
                  </div>
                )}

                {selectedSuggestion.status === "pending" && (
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={approveSuggestion}
                      className="rounded-xl bg-blue-700 px-4 py-3 font-bold text-white"
                    >
                      Approuver
                    </button>

                    <button
                      onClick={rejectSuggestion}
                      className="rounded-xl bg-red-700 px-4 py-3 font-bold text-white"
                    >
                      Rejeter
                    </button>

                    <button
                      onClick={cancelSuggestion}
                      className="rounded-xl bg-slate-700 px-4 py-3 font-bold text-white"
                    >
                      Annuler
                    </button>
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="mb-3 font-bold">Données techniques</h3>
                  <pre className="max-h-80 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
                    {JSON.stringify(selectedSuggestion.meta || {}, null, 2)}
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