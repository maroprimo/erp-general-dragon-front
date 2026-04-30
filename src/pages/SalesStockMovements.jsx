import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("fr-FR");
}

function formatQty(value) {
  return Number(value || 0).toLocaleString("fr-FR", {
    maximumFractionDigits: 3,
  });
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

function movementTypeLabel(type) {
  switch (String(type || "")) {
    case "sale_finished_product":
      return "Produit fini vendu";
    case "sale_consumption":
      return "Ingrédient recette";
    default:
      return type || "-";
  }
}

function movementBadgeClass(type) {
  switch (String(type || "")) {
    case "sale_finished_product":
      return "bg-emerald-100 text-emerald-700";
    case "sale_consumption":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function SalesStockMovements() {
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState([]);
  const [selectedMovement, setSelectedMovement] = useState(null);

  const [sites, setSites] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [filters, setFilters] = useState({
    search: "",
    site_id: "",
    warehouse_id: "",
    movement_type: "",
    date_from: "",
    date_to: "",
  });

  const filteredWarehouses = useMemo(() => {
    if (!filters.site_id) return warehouses;

    return warehouses.filter(
      (warehouse) => Number(warehouse.site_id) === Number(filters.site_id)
    );
  }, [warehouses, filters.site_id]);

  const totals = useMemo(() => {
    return movements.reduce(
      (acc, row) => {
        acc.qty += Math.abs(Number(row.quantity || 0));
        acc.cost += Math.abs(Number(row.total_cost || 0));

        if (row.movement_type === "sale_finished_product") {
          acc.finished += Math.abs(Number(row.total_cost || 0));
        }

        if (row.movement_type === "sale_consumption") {
          acc.ingredients += Math.abs(Number(row.total_cost || 0));
        }

        return acc;
      },
      {
        qty: 0,
        cost: 0,
        finished: 0,
        ingredients: 0,
      }
    );
  }, [movements]);

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

  const loadMovements = async (customFilters = filters) => {
    try {
      setLoading(true);

      const params = {};

      Object.entries(customFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params[key] = value;
        }
      });

      const res = await api.get("/sales-stock-movements", { params });
      const rows = asArray(res.data);

      setMovements(rows);
      setSelectedMovement((prev) => prev || rows[0] || null);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les mouvements stock vente");
      setMovements([]);
      setSelectedMovement(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReferences();
    loadMovements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => {
    loadMovements(filters);
  };

  const resetFilters = () => {
    const next = {
      search: "",
      site_id: "",
      warehouse_id: "",
      movement_type: "",
      date_from: "",
      date_to: "",
    };

    setFilters(next);
    loadMovements(next);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-700 p-5 text-white shadow-xl">
        <h1 className="text-3xl font-black">
          Mouvements stock liés aux ventes
        </h1>
        <p className="mt-1 text-sm text-slate-200">
          Contrôle ticket par ticket des déductions stock POS.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-sm text-slate-500">Mouvements</div>
          <div className="text-2xl font-black text-slate-900">
            {movements.length}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-sm text-slate-500">Quantité sortie</div>
          <div className="text-2xl font-black text-slate-900">
            {formatQty(totals.qty)}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-sm text-slate-500">Coût total sortie</div>
          <div className="text-2xl font-black text-slate-900">
            {formatMoney(totals.cost)} Ar
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-sm text-slate-500">Produit fini / Ingrédients</div>
          <div className="text-lg font-black text-slate-900">
            {formatMoney(totals.finished)} / {formatMoney(totals.ingredients)} Ar
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-7">
          <input
            className="rounded-xl border p-3"
            placeholder="Recherche produit / ticket / dépôt"
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
            <option value="">Tous les sites</option>
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
            <option value="">Tous les dépôts</option>
            {filteredWarehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border p-3"
            value={filters.movement_type}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                movement_type: e.target.value,
              }))
            }
          >
            <option value="">Tous types</option>
            <option value="sale_finished_product">Produit fini vendu</option>
            <option value="sale_consumption">Ingrédient recette</option>
          </select>

          <input
            type="date"
            className="rounded-xl border p-3"
            value={filters.date_from}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, date_from: e.target.value }))
            }
          />

          <input
            type="date"
            className="rounded-xl border p-3"
            value={filters.date_to}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, date_to: e.target.value }))
            }
          />

          <div className="flex gap-2">
            <button
              onClick={applyFilters}
              className="rounded-xl bg-slate-900 px-4 py-3 text-white"
            >
              OK
            </button>

            <button
              onClick={resetFilters}
              className="rounded-xl bg-slate-100 px-4 py-3 text-slate-700"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-6">
          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">
                Liste des sorties stock vente
              </h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                {movements.length}
              </span>
            </div>

            <div className="max-h-[75vh] space-y-3 overflow-y-auto pr-1">
              {loading && (
                <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                  Chargement...
                </div>
              )}

              {!loading && movements.length === 0 && (
                <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                  Aucun mouvement stock vente trouvé.
                </div>
              )}

              {movements.map((movement) => (
                <div
                  key={movement.id}
                  onClick={() => setSelectedMovement(movement)}
                  className={`cursor-pointer rounded-xl border p-4 transition ${
                    Number(selectedMovement?.id) === Number(movement.id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-800">
                        {movement.product?.name || "-"}
                      </div>
                      <div className="text-sm text-slate-500">
                        {movement.sale?.sale_number || `Vente #${movement.reference_id}`} •{" "}
                        {movement.warehouse?.name || "-"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatDateTime(movement.movement_date || movement.created_at)}
                      </div>
                    </div>

                    <span
                      className={`rounded-lg px-2 py-1 text-xs font-semibold ${movementBadgeClass(
                        movement.movement_type
                      )}`}
                    >
                      {movementTypeLabel(movement.movement_type)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      Qté : {formatQty(Math.abs(Number(movement.quantity || 0)))}
                    </span>

                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      Coût : {formatMoney(movement.total_cost)} Ar
                    </span>

                    {movement.site?.name && (
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {movement.site.name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="xl:col-span-6">
          <div className="rounded-2xl bg-white p-5 shadow">
            {!selectedMovement && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Sélectionnez un mouvement.
              </div>
            )}

            {selectedMovement && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">
                      {selectedMovement.product?.name || "-"}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {selectedMovement.sale?.sale_number || `Vente #${selectedMovement.reference_id}`}
                    </p>
                  </div>

                  <span
                    className={`rounded-xl px-3 py-2 text-sm font-bold ${movementBadgeClass(
                      selectedMovement.movement_type
                    )}`}
                  >
                    {movementTypeLabel(selectedMovement.movement_type)}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Ticket</div>
                    <div className="font-semibold text-slate-800">
                      {selectedMovement.sale?.sale_number || "-"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Type vente</div>
                    <div className="font-semibold text-slate-800">
                      {selectedMovement.sale?.order_type || "-"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Dépôt déduit</div>
                    <div className="font-semibold text-slate-800">
                      {selectedMovement.warehouse?.name || "-"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Site</div>
                    <div className="font-semibold text-slate-800">
                      {selectedMovement.site?.name || "-"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Quantité sortie</div>
                    <div className="font-semibold text-slate-800">
                      {formatQty(Math.abs(Number(selectedMovement.quantity || 0)))}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Coût unitaire</div>
                    <div className="font-semibold text-slate-800">
                      {formatMoney(selectedMovement.unit_cost)} Ar
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Coût total</div>
                    <div className="font-semibold text-slate-800">
                      {formatMoney(selectedMovement.total_cost)} Ar
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Date mouvement</div>
                    <div className="font-semibold text-slate-800">
                      {formatDateTime(selectedMovement.movement_date || selectedMovement.created_at)}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Utilisateur</div>
                    <div className="font-semibold text-slate-800">
                      {selectedMovement.performed_by_user?.name ||
                        selectedMovement.sale?.user?.name ||
                        "-"}
                    </div>
                  </div>
                </div>

                {selectedMovement.notes && (
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">Notes</div>
                    <div className="font-semibold text-slate-800">
                      {selectedMovement.notes}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="mb-3 text-lg font-bold text-slate-800">
                    Lecture métier
                  </h3>

                  {selectedMovement.movement_type === "sale_finished_product" && (
                    <div className="rounded-xl bg-emerald-50 p-4 text-emerald-700">
                      Cette vente a déduit un produit fini du dépôt{" "}
                      <strong>{selectedMovement.warehouse?.name || "-"}</strong>.  
                      C’est le comportement attendu pour les produits déjà fabriqués
                      en cuisine, pizza ou pâtisserie.
                    </div>
                  )}

                  {selectedMovement.movement_type === "sale_consumption" && (
                    <div className="rounded-xl bg-amber-50 p-4 text-amber-700">
                      Cette vente a déduit des ingrédients via fiche technique.
                      Ce mode doit être utilisé seulement si le produit fini n’est
                      pas stocké ou si l’article POS est configuré pour déduire
                      directement les ingrédients.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}