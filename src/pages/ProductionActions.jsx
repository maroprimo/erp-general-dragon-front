import { useEffect, useState } from "react";
import api from "../services/api";
import useReferences from "../hooks/useReferences";
import toast from "react-hot-toast";

export default function ProductionActions() {
  const { products, warehouses, loading } = useReferences();
  const [orders, setOrders] = useState([]);

  const [startForm, setStartForm] = useState({
    order_id: "",
    started_at: "",
    responsible_user_id: "",
  });

  const [consumptionForm, setConsumptionForm] = useState({
    order_id: "",
    lines: [
      {
        product_id: "",
        issued_from_warehouse_id: "",
        issued_from_location_id: "",
        theoretical_quantity: "",
        actual_quantity: "",
        unit_cost: "",
        issued_at: "",
      },
    ],
  });

  const [finishForm, setFinishForm] = useState({
    order_id: "",
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

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/production/orders")
      .then((res) => setOrders(res.data.data ?? res.data))
      .catch((err) => console.error(err));
  }, []);

  const addConsumptionLine = () => {
    setConsumptionForm((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          product_id: "",
          issued_from_warehouse_id: "",
          issued_from_location_id: "",
          theoretical_quantity: "",
          actual_quantity: "",
          unit_cost: "",
          issued_at: "",
        },
      ],
    }));
  };

  const updateConsumptionLine = (index, field, value) => {
    const lines = [...consumptionForm.lines];
    lines[index][field] = value;
    setConsumptionForm((prev) => ({ ...prev, lines }));
  };

  const addOutputLine = () => {
    setFinishForm((prev) => ({
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

  const updateOutputLine = (index, field, value) => {
    const outputs = [...finishForm.outputs];
    outputs[index][field] = value;
    setFinishForm((prev) => ({ ...prev, outputs }));
  };

  const startProduction = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const payload = {
        started_at: startForm.started_at || null,
        responsible_user_id: startForm.responsible_user_id
          ? Number(startForm.responsible_user_id)
          : null,
      };

        const resStart = await api.post(
        `/production/orders/${startForm.order_id}/start`,
        payload
        );
      toast.success(resStart.data?.message || "Fabrication démarrée");
    } catch (err) {
      console.error(err);
      toast.error("Erreur au démarrage de fabrication");
    }
  };

  const declareConsumption = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const payload = {
        lines: consumptionForm.lines.map((line) => ({
          product_id: Number(line.product_id),
          issued_from_warehouse_id: line.issued_from_warehouse_id
            ? Number(line.issued_from_warehouse_id)
            : null,
          issued_from_location_id: line.issued_from_location_id
            ? Number(line.issued_from_location_id)
            : null,
          theoretical_quantity: line.theoretical_quantity
            ? Number(line.theoretical_quantity)
            : null,
          actual_quantity: Number(line.actual_quantity),
          unit_cost: line.unit_cost ? Number(line.unit_cost) : null,
          issued_at: line.issued_at || null,
        })),
      };

        const resConsumption = await api.post(
        `/production/orders/${consumptionForm.order_id}/consumptions`,
        payload
        );

      toast.success(res.data.message || "Consommation enregistrée");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l’enregistrement des consommations");
    }
  };

  const finishProduction = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

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
        losses: [],
      };

        const resFinish = await api.post(
        `/production/orders/${finishForm.order_id}/finish`,
        payload
        );

      setMessage(res.data.message || "Fabrication terminée");
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la clôture de fabrication");
    }
  };

  if (loading) {
    return <div className="p-6">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6 space-y-8">
      <h1 className="text-3xl font-bold text-slate-800">
        Actions de fabrication
      </h1>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        {/* Démarrage */}
        <form onSubmit={startProduction} className="rounded-2xl bg-white p-6 shadow space-y-4">
          <h2 className="text-xl font-semibold">Démarrer fabrication</h2>

          <select
            className="w-full rounded-xl border p-3"
            value={startForm.order_id}
            onChange={(e) => setStartForm((prev) => ({ ...prev, order_id: e.target.value }))}
          >
            <option value="">Choisir un OF</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.order_number}
              </option>
            ))}
          </select>

          <input
            type="datetime-local"
            className="w-full rounded-xl border p-3"
            value={startForm.started_at}
            onChange={(e) => setStartForm((prev) => ({ ...prev, started_at: e.target.value }))}
          />

          <input
            type="number"
            placeholder="responsible_user_id"
            className="w-full rounded-xl border p-3"
            value={startForm.responsible_user_id}
            onChange={(e) =>
              setStartForm((prev) => ({ ...prev, responsible_user_id: e.target.value }))
            }
          />

          <button className="rounded-xl bg-slate-900 px-4 py-2 text-white">
            Démarrer
          </button>
        </form>

        {/* Consommation */}
        <form onSubmit={declareConsumption} className="rounded-2xl bg-white p-6 shadow space-y-4">
          <h2 className="text-xl font-semibold">Déclarer consommation</h2>

          <select
            className="w-full rounded-xl border p-3"
            value={consumptionForm.order_id}
            onChange={(e) =>
              setConsumptionForm((prev) => ({ ...prev, order_id: e.target.value }))
            }
          >
            <option value="">Choisir un OF</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.order_number}
              </option>
            ))}
          </select>

          {consumptionForm.lines.map((line, index) => (
            <div key={index} className="space-y-2 rounded-xl border p-3">
              <select
                className="w-full rounded-xl border p-3"
                value={line.product_id}
                onChange={(e) => updateConsumptionLine(index, "product_id", e.target.value)}
              >
                <option value="">Produit</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>

              <select
                className="w-full rounded-xl border p-3"
                value={line.issued_from_warehouse_id}
                onChange={(e) =>
                  updateConsumptionLine(index, "issued_from_warehouse_id", e.target.value)
                }
              >
                <option value="">Dépôt source</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>

              <input
                type="number"
                placeholder="Qté théorique"
                className="w-full rounded-xl border p-3"
                value={line.theoretical_quantity}
                onChange={(e) =>
                  updateConsumptionLine(index, "theoretical_quantity", e.target.value)
                }
              />

              <input
                type="number"
                placeholder="Qté réelle"
                className="w-full rounded-xl border p-3"
                value={line.actual_quantity}
                onChange={(e) =>
                  updateConsumptionLine(index, "actual_quantity", e.target.value)
                }
              />

              <input
                type="number"
                placeholder="Coût unitaire"
                className="w-full rounded-xl border p-3"
                value={line.unit_cost}
                onChange={(e) => updateConsumptionLine(index, "unit_cost", e.target.value)}
              />

              <input
                type="datetime-local"
                className="w-full rounded-xl border p-3"
                value={line.issued_at}
                onChange={(e) => updateConsumptionLine(index, "issued_at", e.target.value)}
              />
            </div>
          ))}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={addConsumptionLine}
              className="rounded-xl bg-slate-700 px-4 py-2 text-white"
            >
              Ajouter ligne
            </button>

            <button className="rounded-xl bg-slate-900 px-4 py-2 text-white">
              Enregistrer
            </button>
          </div>
        </form>

        {/* Fin */}
        <form onSubmit={finishProduction} className="rounded-2xl bg-white p-6 shadow space-y-4">
          <h2 className="text-xl font-semibold">Terminer fabrication</h2>

          <select
            className="w-full rounded-xl border p-3"
            value={finishForm.order_id}
            onChange={(e) =>
              setFinishForm((prev) => ({ ...prev, order_id: e.target.value }))
            }
          >
            <option value="">Choisir un OF</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.order_number}
              </option>
            ))}
          </select>

          <input
            type="datetime-local"
            className="w-full rounded-xl border p-3"
            value={finishForm.ended_at}
            onChange={(e) => setFinishForm((prev) => ({ ...prev, ended_at: e.target.value }))}
          />

          {finishForm.outputs.map((output, index) => (
            <div key={index} className="space-y-2 rounded-xl border p-3">
              <select
                className="w-full rounded-xl border p-3"
                value={output.product_id}
                onChange={(e) => updateOutputLine(index, "product_id", e.target.value)}
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
                onChange={(e) => updateOutputLine(index, "output_type", e.target.value)}
              >
                <option value="principal">Principal</option>
                <option value="co_product">Co-produit</option>
              </select>

              <input
                type="number"
                placeholder="Quantité produite"
                className="w-full rounded-xl border p-3"
                value={output.produced_quantity}
                onChange={(e) => updateOutputLine(index, "produced_quantity", e.target.value)}
              />

              <select
                className="w-full rounded-xl border p-3"
                value={output.storage_warehouse_id}
                onChange={(e) =>
                  updateOutputLine(index, "storage_warehouse_id", e.target.value)
                }
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
                onChange={(e) => updateOutputLine(index, "expiry_date", e.target.value)}
              />
            </div>
          ))}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={addOutputLine}
              className="rounded-xl bg-slate-700 px-4 py-2 text-white"
            >
              Ajouter sortie
            </button>

            <button className="rounded-xl bg-emerald-700 px-4 py-2 text-white">
              Terminer
            </button>
          </div>
        </form>
      </div>

      {message && <div className="text-emerald-700 font-medium">{message}</div>}
      {error && <div className="text-red-600 font-medium">{error}</div>}
    </div>
  );
}