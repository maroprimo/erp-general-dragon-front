// OBSOLETE: logique fusionnée dans ProductionActions.jsx
import { useEffect, useState } from "react";
import api from "../services/api";
import useReferences from "../hooks/useReferences";
import toast from "react-hot-toast";
import ConfirmBox from "../components/ConfirmBox";

export default function ProductionFinish() {
  const { products, warehouses, loading } = useReferences();

  const [orders, setOrders] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [form, setForm] = useState({
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
      const items = res.data.data ?? res.data;
      setOrders(items);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les ordres de fabrication");
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const selectOrder = (id) => {
    setSelectedId(id);
    const order = orders.find((o) => String(o.id) === String(id));
    setSelectedOrder(order || null);
  };

  const addOutput = () => {
    setForm((prev) => ({
      ...prev,
      outputs: [
        ...prev.outputs,
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
    }));
  };

  const updateOutput = (index, field, value) => {
    const outputs = [...form.outputs];
    outputs[index][field] = value;
    setForm((prev) => ({ ...prev, outputs }));
  };

  const addLoss = () => {
    setForm((prev) => ({
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
    const losses = [...form.losses];
    losses[index][field] = value;
    setForm((prev) => ({ ...prev, losses }));
  };

  const submitFinish = async () => {
    try {
      const payload = {
        ended_at: form.ended_at || null,
        outputs: form.outputs.map((output) => ({
          product_id: Number(output.product_id),
          output_type: output.output_type,
          produced_quantity: Number(output.produced_quantity),
          storage_warehouse_id: output.storage_warehouse_id ? Number(output.storage_warehouse_id) : null,
          storage_location_id: output.storage_location_id ? Number(output.storage_location_id) : null,
          expiry_date: output.expiry_date || null,
          is_ready_for_stock: Boolean(output.is_ready_for_stock),
        })),
        losses: form.losses.map((loss) => ({
          product_id: loss.product_id ? Number(loss.product_id) : null,
          lost_quantity: Number(loss.lost_quantity),
          reason: loss.reason,
          notes: loss.notes || "",
        })),
      };
      const res = await api.post(`/production/orders/${selectedOrder.id}/finish`, payload);
      toast.success(res.data.message || "Fabrication terminée");
      setConfirmOpen(false);
      loadOrders();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la clôture de fabrication");
    }
  };

  if (loading) {
    return <div className="p-6">Chargement des références...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Fin de fabrication</h1>
        <p className="text-slate-500">
          Déclare les produits finis, les pertes et clôture l’ordre de fabrication.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Choisir un OF
        </label>
        <select
          className="w-full rounded-xl border p-3"
          value={selectedId}
          onChange={(e) => selectOrder(e.target.value)}
        >
          <option value="">Choisir un ordre de fabrication</option>
          {orders.map((order) => (
            <option key={order.id} value={order.id}>
              {order.order_number} - {order.recipe?.product?.name ?? "Produit"} - {order.status}
            </option>
          ))}
        </select>
      </div>

      {selectedOrder && (
        <div className="rounded-2xl bg-white p-6 shadow space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <input
              type="text"
              className="rounded-xl border p-3 bg-slate-50"
              value={selectedOrder.recipe?.product?.name ?? "Produit"}
              disabled
            />

            <input
              type="text"
              className="rounded-xl border p-3 bg-slate-50"
              value={`Qté prévue : ${selectedOrder.planned_quantity}`}
              disabled
            />

            <input
              type="datetime-local"
              className="rounded-xl border p-3"
              value={form.ended_at}
              onChange={(e) => setForm((prev) => ({ ...prev, ended_at: e.target.value }))}
            />
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800">Produits obtenus</h2>
              <button
                type="button"
                onClick={addOutput}
                className="rounded-xl bg-slate-700 px-4 py-2 text-white"
              >
                Ajouter sortie
              </button>
            </div>

            <div className="space-y-4">
              {form.outputs.map((output, index) => (
                <div key={index} className="grid grid-cols-1 gap-4 rounded-xl border p-4 md:grid-cols-3">
                  <select
                    className="rounded-xl border p-3"
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
                    className="rounded-xl border p-3"
                    value={output.output_type}
                    onChange={(e) => updateOutput(index, "output_type", e.target.value)}
                  >
                    <option value="principal">Principal</option>
                    <option value="co_product">Co-produit</option>
                  </select>

                  <input
                    type="number"
                    className="rounded-xl border p-3"
                    placeholder="Quantité produite"
                    value={output.produced_quantity}
                    onChange={(e) => updateOutput(index, "produced_quantity", e.target.value)}
                  />

                  <select
                    className="rounded-xl border p-3"
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
                    className="rounded-xl border p-3"
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
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800">Pertes / parures</h2>
              <button
                type="button"
                onClick={addLoss}
                className="rounded-xl bg-amber-600 px-4 py-2 text-white"
              >
                Ajouter perte
              </button>
            </div>

            <div className="space-y-4">
              {form.losses.map((loss, index) => (
                <div key={index} className="grid grid-cols-1 gap-4 rounded-xl border p-4 md:grid-cols-4">
                  <select
                    className="rounded-xl border p-3"
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
                    className="rounded-xl border p-3"
                    placeholder="Qté perdue"
                    value={loss.lost_quantity}
                    onChange={(e) => updateLoss(index, "lost_quantity", e.target.value)}
                  />

                  <input
                    type="text"
                    className="rounded-xl border p-3"
                    placeholder="Motif"
                    value={loss.reason}
                    onChange={(e) => updateLoss(index, "reason", e.target.value)}
                  />

                  <input
                    type="text"
                    className="rounded-xl border p-3"
                    placeholder="Notes"
                    value={loss.notes}
                    onChange={(e) => updateLoss(index, "notes", e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setConfirmOpen(true)}
            className="rounded-xl bg-emerald-700 px-4 py-3 text-white"
          >
            Terminer la fabrication
          </button>
        </div>
      )}

      {confirmOpen && (
        <ConfirmBox
          title="Confirmer la fin de fabrication"
          message="Voulez-vous vraiment clôturer cette fabrication et générer les mouvements de stock ?"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={submitFinish}
        />
      )}
    </div>
  );
}