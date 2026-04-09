import { useEffect, useState } from "react";
import api from "../services/api";
import useReferences from "../hooks/useReferences";
import toast from "react-hot-toast";
import { formatDateTime, formatQty } from "../utils/formatters";

export default function ProductionActions() {
  const { products, warehouses, loading } = useReferences();

  const [orders, setOrders] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [consumptionForm, setConsumptionForm] = useState({
    consumptions: [
      {
        product_id: "",
        warehouse_id: "",
        storage_location_id: "",
        actual_quantity: "",
        unit_cost: "",
        notes: "",
      },
    ],
  });

  const [finishForm, setFinishForm] = useState({
    ended_at: "",
    outputs: [
      {
        product_id: "",
        output_type: "principal",
        produced_quantity: "",
        storage_warehouse_id: "",
        storage_location_id: "",
        expiry_date: "",
        is_ready_for_stock: true,
      },
    ],
    losses: [],
  });

  const loadOrders = async () => {
    try {
      const res = await api.get("/production/orders");
      setOrders(res.data.data ?? res.data);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les fabrications");
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const openOrder = async (id) => {
    try {
      setSelectedId(id);
      const res = await api.get(`/production/orders/${id}`);
      setSelectedOrder(res.data);

const recipeLines = res.data.recipe?.lines ?? [];

const factor =
  Number(res.data.planned_quantity || 0) /
  Math.max(Number(res.data.recipe?.yield_quantity || 1), 0.0001);

setConsumptionForm({
  consumptions:
    recipeLines.length > 0
      ? recipeLines.map((line) => ({
          product_id: line.ingredient_product_id,
          warehouse_id: res.data.warehouse_id ?? "",
          storage_location_id: "",
          actual_quantity:
            Number(line.quantity_in_stock_unit || line.quantity || 0) * factor,
          unit_cost: "",
          notes: "Théorique fiche technique",
        }))
      : [
          {
            product_id: "",
            warehouse_id: "",
            storage_location_id: "",
            actual_quantity: "",
            unit_cost: "",
            notes: "",
          },
        ],
});

      setFinishForm({
        ended_at: "",
        outputs: [
          {
            product_id: res.data.recipe?.product?.id ?? "",
            output_type: "principal",
            produced_quantity: "",
            storage_warehouse_id: res.data.warehouse_id ?? "",
            storage_location_id: "",
            expiry_date: "",
            is_ready_for_stock: true,
          },
        ],
        losses: [],
      });
    } catch (err) {
      console.error(err);
      toast.error("Impossible d’ouvrir l’ordre de fabrication");
    }
  };

  const startProduction = async () => {
    try {
      const res = await api.post(`/production/orders/${selectedOrder.id}/start`);
      toast.success(res.data.message || "Fabrication démarrée");
      openOrder(selectedOrder.id);
      loadOrders();
    } catch (err) {
      console.error(err);
      toast.error("Erreur démarrage fabrication");
    }
  };

  const addConsumptionLine = () => {
    
    setConsumptionForm((prev) => ({
      consumptions: [
        ...prev.consumptions,
        {
          product_id: "",
          warehouse_id: "",
          storage_location_id: "",
          actual_quantity: "",
          unit_cost: "",
          notes: "",
        },
      ],
    }));
    

  };

  const updateConsumptionLine = (index, field, value) => {
    const consumptions = [...consumptionForm.consumptions];
    consumptions[index][field] = value;
    setConsumptionForm({ consumptions });
  };

  const saveConsumptions = async () => {
    try {
      const payload = {
        consumptions: consumptionForm.consumptions.map((line) => ({
          product_id: Number(line.product_id),
          warehouse_id: line.warehouse_id ? Number(line.warehouse_id) : null,
          storage_location_id: line.storage_location_id ? Number(line.storage_location_id) : null,
          actual_quantity: Number(line.actual_quantity),
          unit_cost: line.unit_cost ? Number(line.unit_cost) : null,
          notes: line.notes || "",
        })),
      };

      const res = await api.post(`/production/orders/${selectedOrder.id}/consumptions`, payload);
      toast.success(res.data.message || "Consommations enregistrées");
      openOrder(selectedOrder.id);
      loadOrders();
      const base = import.meta.env.VITE_BACKEND_WEB_URL || "";
    window.open(`${base}/print/production-consumption-ticket/${selectedOrder.id}`, "_blank");
    } catch (err) {
      console.error(err);
      toast.error("Erreur enregistrement consommations");
    }
  };

  const addOutput = () => {
    setFinishForm((prev) => ({
      ...prev,
      outputs: [
        ...prev.outputs,
        {
          product_id: "",
          output_type: "co_product",
          produced_quantity: "",
          storage_warehouse_id: "",
          storage_location_id: "",
          expiry_date: "",
          is_ready_for_stock: true,
        },
      ],
    }));
  };

  const updateOutput = (index, field, value) => {
    const outputs = [...finishForm.outputs];
    outputs[index][field] = value;
    setFinishForm((prev) => ({ ...prev, outputs }));
  };

  const addLoss = () => {
    setFinishForm((prev) => ({
      ...prev,
      losses: [
        ...prev.losses,
        {
          product_id: "",
          lost_quantity: "",
          reason: "yield_loss",
          notes: "",
        },
      ],
    }));
  };

  const updateLoss = (index, field, value) => {
    const losses = [...finishForm.losses];
    losses[index][field] = value;
    setFinishForm((prev) => ({ ...prev, losses }));
  };

  const finishProduction = async () => {
    try {
      const payload = {
        ended_at: finishForm.ended_at || null,
        outputs: finishForm.outputs.map((output) => ({
          product_id: Number(output.product_id),
          output_type: output.output_type,
          produced_quantity: Number(output.produced_quantity),
          storage_warehouse_id: output.storage_warehouse_id ? Number(output.storage_warehouse_id) : null,
          storage_location_id: output.storage_location_id ? Number(output.storage_location_id) : null,
          expiry_date: output.expiry_date || null,
          is_ready_for_stock: Boolean(output.is_ready_for_stock),
        })),
        losses: finishForm.losses.map((loss) => ({
          product_id: loss.product_id ? Number(loss.product_id) : null,
          lost_quantity: Number(loss.lost_quantity),
          reason: loss.reason,
          notes: loss.notes || "",
        })),
      };

      const res = await api.post(`/production/orders/${selectedOrder.id}/finish`, payload);
      toast.success(res.data.message || "Fabrication terminée");
      openOrder(selectedOrder.id);
      loadOrders();
    } catch (err) {
      console.error(err);
      toast.error("Erreur fin de fabrication");
    }
  };

  if (loading) {
    return <div className="p-6">Chargement des références...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Actions fabrication</h1>
        <p className="text-slate-500">
          Workflow complet : démarrage, consommation, produit fini.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Choisir un ordre de fabrication
        </label>

        <select
          className="w-full rounded-xl border p-3"
          value={selectedId}
          onChange={(e) => openOrder(e.target.value)}
        >
          <option value="">Choisir un OF</option>
          {orders.map((order) => (
            <option key={order.id} value={order.id}>
              {order.order_number} - {order.recipe?.product?.name ?? "Produit"} - {order.status}
            </option>
          ))}
        </select>
      </div>

      {selectedOrder && (
        <>
          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Produit</div>
                <div className="font-semibold text-slate-800">
                  {selectedOrder.recipe?.product?.name ?? "-"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Qté prévue</div>
                <div className="font-semibold text-slate-800">
                  {formatQty(selectedOrder.planned_quantity)}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Statut</div>
                <div className="font-semibold text-slate-800">
                  {selectedOrder.status}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Début</div>
                <div className="font-semibold text-slate-800">
                  {formatDateTime(selectedOrder.started_at)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* GAUCHE */}
            <div className="rounded-2xl bg-white p-5 shadow">
              <h2 className="mb-4 text-xl font-semibold text-slate-800">1. Top départ</h2>

              <div className="space-y-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">OF</div>
                  <div className="font-semibold text-slate-800">{selectedOrder.order_number}</div>
                </div>

              <button
                onClick={startProduction}
                // Le bouton se grise si le statut est déjà in_progress, finished ou cancelled
                disabled={selectedOrder.status !== "draft" && selectedOrder.status !== "planned"}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedOrder.status === "in_progress" ? "Fabrication en cours..." : "Démarrer la fabrication"}
              </button>

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">Rappel workflow</div>
                  <div className="mt-2 text-sm text-slate-700">
                    1. Démarrer
                    <br />
                    2. Déclarer les sorties d’ingrédients
                    <br />
                    3. Déclarer le produit fini
                  </div>
                </div>
              </div>
            </div>

            {/* CENTRE */}
            <div className="rounded-2xl bg-white p-5 shadow">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-800">2. Consommation</h2>
                <button
                  type="button"
                  onClick={addConsumptionLine}
                  className="rounded-xl bg-slate-700 px-4 py-2 text-white"
                >
                  Ajouter
                </button>
              </div>

              <div className="space-y-4">
                {consumptionForm.consumptions.map((line, index) => (
                  <div key={index} className="rounded-xl border p-4 space-y-3">
                    <select
                      className="w-full rounded-xl border p-3"
                      value={line.product_id}
                      onChange={(e) => updateConsumptionLine(index, "product_id", e.target.value)}
                    >
                      <option value="">Produit ingrédient</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>

                    <select
                      className="w-full rounded-xl border p-3"
                      value={line.warehouse_id}
                      onChange={(e) => updateConsumptionLine(index, "warehouse_id", e.target.value)}
                    >
                      <option value="">Dépôt</option>
                      {warehouses.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      className="w-full rounded-xl border p-3"
                      placeholder="Quantité consommée"
                      value={line.actual_quantity}
                      onChange={(e) => updateConsumptionLine(index, "actual_quantity", e.target.value)}
                    />

                    <input
                      type="number"
                      className="w-full rounded-xl border p-3"
                      placeholder="Coût unitaire"
                      value={line.unit_cost}
                      onChange={(e) => updateConsumptionLine(index, "unit_cost", e.target.value)}
                    />

                    <input
                      type="text"
                      className="w-full rounded-xl border p-3"
                      placeholder="Notes"
                      value={line.notes}
                      onChange={(e) => updateConsumptionLine(index, "notes", e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={saveConsumptions}
                className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-white"
              >
                Enregistrer consommations
              </button>
            </div>

            {/* DROITE */}
            <div className="rounded-2xl bg-white p-5 shadow">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-800">3. Fin fabrication</h2>
                <button
                  type="button"
                  onClick={addOutput}
                  className="rounded-xl bg-slate-700 px-4 py-2 text-white"
                >
                  Ajouter sortie
                </button>
              </div>

              <div className="space-y-4">
                <input
                  type="datetime-local"
                  className="w-full rounded-xl border p-3"
                  value={finishForm.ended_at}
                  onChange={(e) => setFinishForm((prev) => ({ ...prev, ended_at: e.target.value }))}
                />

                {finishForm.outputs.map((output, index) => (
                  <div key={index} className="rounded-xl border p-4 space-y-3">
                    <select
                      className="w-full rounded-xl border p-3"
                      value={output.product_id}
                      onChange={(e) => updateOutput(index, "product_id", e.target.value)}
                    >
                      <option value="">Produit fini</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>

                    <select
                      className="w-full rounded-xl border p-3"
                      value={output.output_type}
                      onChange={(e) => updateOutput(index, "output_type", e.target.value)}
                    >
                      <option value="principal">Principal</option>
                      <option value="co_product">Co-produit</option>
                    </select>

                    <input
                      type="number"
                      className="w-full rounded-xl border p-3"
                      placeholder="Quantité produite"
                      value={output.produced_quantity}
                      onChange={(e) => updateOutput(index, "produced_quantity", e.target.value)}
                    />

                    <select
                      className="w-full rounded-xl border p-3"
                      value={output.storage_warehouse_id}
                      onChange={(e) => updateOutput(index, "storage_warehouse_id", e.target.value)}
                    >
                      <option value="">Dépôt destination</option>
                      {warehouses.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="date"
                      className="w-full rounded-xl border p-3"
                      value={output.expiry_date}
                      onChange={(e) => updateOutput(index, "expiry_date", e.target.value)}
                    />

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={output.is_ready_for_stock}
                        onChange={(e) => updateOutput(index, "is_ready_for_stock", e.target.checked)}
                      />
                      Prêt à stocker
                    </label>
                  </div>
                ))}

                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">Pertes</h3>
                  <button
                    type="button"
                    onClick={addLoss}
                    className="rounded-xl bg-amber-600 px-4 py-2 text-white"
                  >
                    Ajouter perte
                  </button>
                </div>

                {finishForm.losses.map((loss, index) => (
                  <div key={index} className="rounded-xl border p-4 space-y-3">
                    <select
                      className="w-full rounded-xl border p-3"
                      value={loss.product_id}
                      onChange={(e) => updateLoss(index, "product_id", e.target.value)}
                    >
                      <option value="">Produit</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      className="w-full rounded-xl border p-3"
                      placeholder="Qté perdue"
                      value={loss.lost_quantity}
                      onChange={(e) => updateLoss(index, "lost_quantity", e.target.value)}
                    />

                    <input
                      type="text"
                      className="w-full rounded-xl border p-3"
                      placeholder="Motif"
                      value={loss.reason}
                      onChange={(e) => updateLoss(index, "reason", e.target.value)}
                    />

                    <input
                      type="text"
                      className="w-full rounded-xl border p-3"
                      placeholder="Notes"
                      value={loss.notes}
                      onChange={(e) => updateLoss(index, "notes", e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={finishProduction}
                className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-3 text-white"
              >
                Terminer la fabrication
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <h2 className="mb-4 text-xl font-semibold text-slate-800">Historique OF</h2>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div>
                <h3 className="mb-2 font-semibold text-slate-700">Consommations</h3>
                <div className="space-y-2">
                  {(selectedOrder.consumptions ?? []).map((item) => (
                    <div key={item.id} className="rounded-xl bg-slate-50 p-3">
                      <div className="font-semibold">{item.product?.name ?? "-"}</div>
                      <div className="text-sm text-slate-600">
                        Qté : {formatQty(item.actual_quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-slate-700">Produits finis</h3>
                <div className="space-y-2">
                  {(selectedOrder.outputs ?? []).map((item) => (
                    <div key={item.id} className="rounded-xl bg-emerald-50 p-3">
                      <div className="font-semibold">{item.product?.name ?? "-"}</div>
                      <div className="text-sm text-slate-600">
                        Qté : {formatQty(item.produced_quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-slate-700">Pertes</h3>
                <div className="space-y-2">
                  {(selectedOrder.losses ?? []).map((item) => (
                    <div key={item.id} className="rounded-xl bg-amber-50 p-3">
                      <div className="font-semibold">{item.product?.name ?? "-"}</div>
                      <div className="text-sm text-slate-600">
                        Qté : {formatQty(item.lost_quantity)} / {item.reason}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}