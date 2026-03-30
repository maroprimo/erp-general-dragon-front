import { useEffect, useState } from "react";
import api from "../services/api";
import useReferences from "../hooks/useReferences";
import toast from "react-hot-toast";
import ConfirmBox from "../components/ConfirmBox";

export default function TransferValidation() {
  const { warehouses, loading } = useReferences();

  const [transfers, setTransfers] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [form, setForm] = useState({
    from_warehouse_id: "",
    to_warehouse_id: "",
  });

  const loadTransfers = async () => {
    try {
      const res = await api.get("/transfers");
      const items = res.data.data ?? res.data;
      setTransfers(items);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les transferts");
    }
  };

  useEffect(() => {
    loadTransfers();
  }, []);

  const selectTransfer = (id) => {
    setSelectedId(id);
    const transfer = transfers.find((t) => String(t.id) === String(id));
    setSelectedTransfer(transfer || null);
  };

  const executeTransfer = async () => {
    try {
      const payload = {
        from_warehouse_id: Number(form.from_warehouse_id),
        to_warehouse_id: Number(form.to_warehouse_id),
      };

      const res = await api.post(`/transfers/${selectedTransfer.id}/execute`, payload);
      toast.success(res.data.message || "Transfert exécuté");
      setConfirmOpen(false);
      loadTransfers();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l’exécution du transfert");
    }
  };

  if (loading) {
    return <div className="p-6">Chargement des références...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Validation transfert</h1>
        <p className="text-slate-500">
          Confirme le départ et l’arrivée d’un transfert inter-sites.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Choisir un transfert
        </label>
        <select
          className="w-full rounded-xl border p-3"
          value={selectedId}
          onChange={(e) => selectTransfer(e.target.value)}
        >
          <option value="">Choisir un transfert</option>
          {transfers.map((transfer) => (
            <option key={transfer.id} value={transfer.id}>
              {transfer.transfer_number} - {transfer.fromSite?.name ?? "Source"} → {transfer.toSite?.name ?? "Destination"} - {transfer.status}
            </option>
          ))}
        </select>
      </div>

      {selectedTransfer && (
        <div className="rounded-2xl bg-white p-6 shadow space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              type="text"
              className="rounded-xl border p-3 bg-slate-50"
              value={selectedTransfer.fromSite?.name ?? "Site source"}
              disabled
            />
            <input
              type="text"
              className="rounded-xl border p-3 bg-slate-50"
              value={selectedTransfer.toSite?.name ?? "Site destination"}
              disabled
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <select
              className="rounded-xl border p-3"
              value={form.from_warehouse_id}
              onChange={(e) => setForm((prev) => ({ ...prev, from_warehouse_id: e.target.value }))}
            >
              <option value="">Choisir dépôt source</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border p-3"
              value={form.to_warehouse_id}
              onChange={(e) => setForm((prev) => ({ ...prev, to_warehouse_id: e.target.value }))}
            >
              <option value="">Choisir dépôt destination</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="border-b border-slate-200">
                <tr className="text-slate-600">
                  <th className="px-4 py-3">Produit</th>
                  <th className="px-4 py-3">Qté demandée</th>
                  <th className="px-4 py-3">Qté approuvée</th>
                </tr>
              </thead>
              <tbody>
                {(selectedTransfer.lines ?? []).map((line) => (
                  <tr key={line.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">{line.product?.name ?? line.product_id}</td>
                    <td className="px-4 py-3">{line.requested_quantity}</td>
                    <td className="px-4 py-3">{line.approved_quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={() => setConfirmOpen(true)}
            className="rounded-xl bg-emerald-700 px-4 py-3 text-white"
          >
            Valider le transfert
          </button>
        </div>
      )}

      {confirmOpen && (
        <ConfirmBox
          title="Confirmer le transfert"
          message="Voulez-vous vraiment exécuter ce transfert ? Le stock source sera diminué et le stock destination augmenté."
          onCancel={() => setConfirmOpen(false)}
          onConfirm={executeTransfer}
        />
      )}
    </div>
  );
}