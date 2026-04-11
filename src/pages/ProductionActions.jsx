import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import useReferences from "../hooks/useReferences";
import toast from "react-hot-toast";
import { formatDateTime, formatQty } from "../utils/formatters";

function extractOrderPayload(payload) {
  if (!payload) return null;
  if (payload.data && !payload.id) return payload.data;
  return payload;
}

export default function ProductionActions() {
  const { products, warehouses, loading } = useReferences();

  const [orders, setOrders] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [qrImageError, setQrImageError] = useState(false);
  const [busyQr, setBusyQr] = useState(false);

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

  const backendWeb = import.meta.env.VITE_BACKEND_WEB_URL || "";
  const backendWebWithIndex = backendWeb.includes("/index.php")
    ? backendWeb
    : `${backendWeb}/index.php`;

  const kitchenQrImageUrl = useMemo(() => {
    if (!selectedOrder?.consumption_qr_token) return "";
    return `${backendWebWithIndex}/kitchen-consumption-qr/${selectedOrder.consumption_qr_token}.svg`;
  }, [backendWebWithIndex, selectedOrder]);

  const loadOrders = async () => {
    try {
      const res = await api.get("/production/orders");
      const rows =
        res.data?.data?.data ??
        res.data?.data ??
        res.data ??
        [];
      setOrders(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les fabrications");
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const ensureKitchenQr = async (orderId, silent = false) => {
    try {
      setBusyQr(true);
      const res = await api.post(`/production/orders/${orderId}/ensure-kitchen-qr`);
      const order = extractOrderPayload(res.data);
      if (!silent) {
        toast.success(res.data?.message || "QR cuisine généré");
      }
      return order;
    } catch (err) {
      console.error(err);
      if (!silent) {
        toast.error(err?.response?.data?.message || "Impossible de générer le QR cuisine");
      }
      return null;
    } finally {
      setBusyQr(false);
    }
  };

  const resetFormsFromOrder = (order) => {
    const recipeLines = order?.recipe?.lines ?? [];

    const factor =
      Number(order?.planned_quantity || 0) /
      Math.max(Number(order?.recipe?.yield_quantity || 1), 0.0001);

    setConsumptionForm({
      consumptions:
        recipeLines.length > 0
          ? recipeLines.map((line) => ({
              product_id: line.ingredient_product_id,
              warehouse_id: order?.warehouse_id ?? "",
              storage_location_id: "",
              actual_quantity:
                Number(line.quantity_in_stock_unit || line.quantity || 0) * factor,
              unit_cost: "",
              notes: "Théorique fiche technique",
            }))
          : [
              {
                product_id: "",
                warehouse_id: order?.warehouse_id ?? "",
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
          product_id: order?.recipe?.product?.id ?? "",
          output_type: "principal",
          produced_quantity: "",
          storage_warehouse_id: order?.warehouse_id ?? "",
          storage_location_id: "",
          expiry_date: "",
          is_ready_for_stock: true,
        },
      ],
      losses: [],
    });
  };

  const openOrder = async (id) => {
    try {
      if (!id) {
        setSelectedId("");
        setSelectedOrder(null);
        setQrImageError(false);
        return;
      }

      setSelectedId(id);
      setQrImageError(false);

      const res = await api.get(`/production/orders/${id}`);
      let order = extractOrderPayload(res.data);

      if (!order?.consumption_qr_token) {
        const ensured = await ensureKitchenQr(id, true);
        if (ensured?.id) {
          const retry = await api.get(`/production/orders/${id}`);
          order = extractOrderPayload(retry.data);
        }
      }

      setSelectedOrder(order);
      resetFormsFromOrder(order);
    } catch (err) {
      console.error(err);
      toast.error("Impossible d’ouvrir l’ordre de fabrication");
    }
  };

  const startProduction = async () => {
    if (!selectedOrder?.id) return;

    try {
      const res = await api.post(`/production/orders/${selectedOrder.id}/start`);
      toast.success(res.data.message || "Fabrication démarrée");

      await ensureKitchenQr(selectedOrder.id, true);
      await openOrder(selectedOrder.id);
      await loadOrders();
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
          warehouse_id: selectedOrder?.warehouse_id ?? "",
          storage_location_id: "",
          actual_quantity: "",
          unit_cost: "",
          notes: "",
        },
      ],
    }));
  };

  const removeConsumptionLine = (index) => {
    setConsumptionForm((prev) => {
      const next = prev.consumptions.filter((_, i) => i !== index);
      return {
        consumptions:
          next.length > 0
            ? next
            : [
                {
                  product_id: "",
                  warehouse_id: selectedOrder?.warehouse_id ?? "",
                  storage_location_id: "",
                  actual_quantity: "",
                  unit_cost: "",
                  notes: "",
                },
              ],
      };
    });
  };

  const updateConsumptionLine = (index, field, value) => {
    const consumptions = [...consumptionForm.consumptions];
    consumptions[index][field] = value;
    setConsumptionForm({ consumptions });
  };

  const saveConsumptions = async () => {
    if (!selectedOrder?.id) return;

    try {
      const payload = {
        consumptions: consumptionForm.consumptions.map((line) => ({
          product_id: Number(line.product_id),
          warehouse_id: line.warehouse_id ? Number(line.warehouse_id) : null,
          storage_location_id: line.storage_location_id
            ? Number(line.storage_location_id)
            : null,
          actual_quantity: Number(line.actual_quantity),
          unit_cost: line.unit_cost ? Number(line.unit_cost) : null,
          notes: line.notes || "",
        })),
      };

      const res = await api.post(`/production/orders/${selectedOrder.id}/consumptions`, payload);
      toast.success(res.data.message || "Consommations enregistrées");

      await ensureKitchenQr(selectedOrder.id, true);
      await openOrder(selectedOrder.id);
      await loadOrders();

      window.open(
        `${backendWebWithIndex}/print/production-consumption-ticket/${selectedOrder.id}`,
        "_blank"
      );
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
          storage_warehouse_id: selectedOrder?.warehouse_id ?? "",
          storage_location_id: "",
          expiry_date: "",
          is_ready_for_stock: true,
        },
      ],
    }));
  };

  const removeOutput = (index) => {
    setFinishForm((prev) => {
      const next = prev.outputs.filter((_, i) => i !== index);
      return {
        ...prev,
        outputs:
          next.length > 0
            ? next
            : [
                {
                  product_id: selectedOrder?.recipe?.product?.id ?? "",
                  output_type: "principal",
                  produced_quantity: "",
                  storage_warehouse_id: selectedOrder?.warehouse_id ?? "",
                  storage_location_id: "",
                  expiry_date: "",
                  is_ready_for_stock: true,
                },
              ],
      };
    });
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

  const removeLoss = (index) => {
    setFinishForm((prev) => ({
      ...prev,
      losses: prev.losses.filter((_, i) => i !== index),
    }));
  };

  const updateLoss = (index, field, value) => {
    const losses = [...finishForm.losses];
    losses[index][field] = value;
    setFinishForm((prev) => ({ ...prev, losses }));
  };

  const finishProduction = async () => {
    if (!selectedOrder?.id) return;

    try {
      const payload = {
        ended_at: finishForm.ended_at || null,
        outputs: finishForm.outputs.map((output) => ({
          product_id: Number(output.product_id),
          output_type: output.output_type,
          produced_quantity: Number(output.produced_quantity),
          storage_warehouse_id: output.storage_warehouse_id
            ? Number(output.storage_warehouse_id)
            : null,
          storage_location_id: output.storage_location_id
            ? Number(output.storage_location_id)
            : null,
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

      await openOrder(selectedOrder.id);
      await loadOrders();
    } catch (err) {
      console.error(err);
      toast.error("Erreur fin de fabrication");
    }
  };

  const regenerateKitchenQr = async () => {
    if (!selectedOrder?.id) return;

    const order = await ensureKitchenQr(selectedOrder.id, false);
    if (order?.id) {
      await openOrder(selectedOrder.id);
    }
  };

  const printConsumptionTicket = () => {
    if (!selectedOrder?.id) return;
    window.open(
      `${backendWebWithIndex}/print/production-consumption-ticket/${selectedOrder.id}`,
      "_blank"
    );
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4 xl:grid-cols-8">
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
                <div className="text-sm text-slate-500">Statut OF</div>
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

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Workflow cuisine</div>
                <div className="font-semibold text-slate-800">
                  {selectedOrder.kitchen_workflow_status || "-"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Vérification cuisine</div>
                <div className="font-semibold text-slate-800">
                  {formatDateTime(selectedOrder.kitchen_verified_at)}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Validation finale</div>
                <div className="font-semibold text-slate-800">
                  {formatDateTime(selectedOrder.kitchen_validated_at)}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Token QR</div>
                <div className="font-semibold break-all text-slate-800">
                  {selectedOrder.consumption_qr_token || "-"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow">
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">
                  QR Bon de sortie cuisine
                </h2>
                <p className="text-slate-500">
                  Suivi du bon de sortie ingrédients en cuisine.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={regenerateKitchenQr}
                  disabled={busyQr}
                  className="rounded-xl bg-slate-700 px-4 py-2 text-white disabled:opacity-60"
                >
                  {busyQr ? "Génération..." : "Générer / Régénérer QR cuisine"}
                </button>

                <button
                  onClick={printConsumptionTicket}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-white"
                >
                  Imprimer le bon de sortie
                </button>

                {selectedOrder.consumption_qr_scan_url && (
                  <a
                    href={selectedOrder.consumption_qr_scan_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-blue-700 px-4 py-2 text-white"
                  >
                    Ouvrir scan cuisine
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
              <div className="rounded-2xl bg-slate-50 p-4">
                {selectedOrder.consumption_qr_token ? (
                  <>
                    <img
                      src={kitchenQrImageUrl}
                      alt="QR cuisine"
                      className="h-44 w-44 rounded-xl border bg-white p-2"
                      onError={() => setQrImageError(true)}
                      onLoad={() => setQrImageError(false)}
                    />

                    <div className="mt-3 break-all text-xs text-slate-500">
                      {selectedOrder.consumption_qr_scan_url || "-"}
                    </div>

                    {qrImageError && (
                      <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">
                        Le token existe mais l’image QR ne se charge pas.
                        Vérifie la route :
                        <br />
                        <span className="break-all">{kitchenQrImageUrl}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
                    Aucun token QR reçu depuis l’API pour cet OF.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">Vérifié par cuisine</div>
                  <div className="font-semibold text-slate-800">
                    {formatDateTime(selectedOrder.kitchen_verified_at)}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {selectedOrder.kitchen_verified_by?.name ||
                      selectedOrder.kitchen_verified_by?.email ||
                      "-"}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">Validation finale cuisine</div>
                  <div className="font-semibold text-slate-800">
                    {formatDateTime(selectedOrder.kitchen_validated_at)}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {selectedOrder.kitchen_validated_by?.name ||
                      selectedOrder.kitchen_validated_by?.email ||
                      "-"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-2xl bg-white p-5 shadow">
              <h2 className="mb-4 text-xl font-semibold text-slate-800">1. Top départ</h2>

              <div className="space-y-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">OF</div>
                  <div className="font-semibold text-slate-800">{selectedOrder.order_number}</div>
                </div>

                <button
                  onClick={startProduction}
                  disabled={selectedOrder.status !== "draft" && selectedOrder.status !== "planned"}
                  className="w-full rounded-xl bg-slate-900 px-4 py-3 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selectedOrder.status === "in_progress"
                    ? "Fabrication en cours..."
                    : "Démarrer la fabrication"}
                </button>

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">Rappel workflow</div>
                  <div className="mt-2 text-sm text-slate-700">
                    1. Démarrer
                    <br />
                    2. Déclarer les sorties d’ingrédients
                    <br />
                    3. Imprimer / scanner le bon cuisine
                    <br />
                    4. Déclarer le produit fini
                  </div>
                </div>
              </div>
            </div>

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

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeConsumptionLine(index)}
                        className="rounded-xl bg-red-600 px-4 py-2 text-white"
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={saveConsumptions}
                  className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-white"
                >
                  Enregistrer consommations
                </button>

                <button
                  type="button"
                  onClick={printConsumptionTicket}
                  className="rounded-xl bg-blue-700 px-4 py-3 text-white"
                >
                  Imprimer ticket
                </button>
              </div>
            </div>

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
                  onChange={(e) =>
                    setFinishForm((prev) => ({ ...prev, ended_at: e.target.value }))
                  }
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

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeOutput(index)}
                        className="rounded-xl bg-red-600 px-4 py-2 text-white"
                      >
                        Retirer
                      </button>
                    </div>
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

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeLoss(index)}
                        className="rounded-xl bg-red-600 px-4 py-2 text-white"
                      >
                        Retirer
                      </button>
                    </div>
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