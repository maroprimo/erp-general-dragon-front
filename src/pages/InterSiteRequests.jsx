import { useEffect, useState } from "react";
import api from "../services/api";
import useReferences from "../hooks/useReferences";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import ConfirmBox from "../components/ConfirmBox";

export default function InterSiteRequests() {
  const { sites, products, warehouses, loading } = useReferences();
  const { user } = useAuth();

  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const [createForm, setCreateForm] = useState({
    from_site_id: "",
    to_site_id: "",
    notes: "",
    lines: [{ product_id: "", requested_quantity: "", notes: "" }],
  });

  const [executionForm, setExecutionForm] = useState({
    from_warehouse_id: "",
    to_warehouse_id: "",
  });

  const loadRequests = async () => {
    try {
      const res = await api.get("/inter-site-requests");
      setRequests(res.data.data ?? res.data);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les transferts inter-sites");
    }
  };

  useEffect(() => {
    loadRequests();

    if (user?.site_id) {
      setCreateForm((prev) => ({
        ...prev,
        to_site_id: String(user.site_id),
      }));
    }
  }, [user]);

  const addLine = () => {
    setCreateForm((prev) => ({
      ...prev,
      lines: [...prev.lines, { product_id: "", requested_quantity: "", notes: "" }],
    }));
  };

  const updateLine = (index, field, value) => {
    const lines = [...createForm.lines];
    lines[index][field] = value;
    setCreateForm((prev) => ({ ...prev, lines }));
  };

  const createRequest = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        from_site_id: Number(createForm.from_site_id),
        to_site_id: Number(createForm.to_site_id),
        notes: createForm.notes,
        lines: createForm.lines.map((line) => ({
          product_id: Number(line.product_id),
          requested_quantity: Number(line.requested_quantity),
          notes: line.notes || "",
        })),
      };

      const res = await api.post("/inter-site-requests", payload);
      toast.success(res.data.message || "Bon de transfert créé");

      setCreateForm({
        from_site_id: "",
        to_site_id: user?.site_id ? String(user.site_id) : "",
        notes: "",
        lines: [{ product_id: "", requested_quantity: "", notes: "" }],
      });

      loadRequests();
    } catch (err) {
      console.error(err);
      toast.error("Erreur création bon de transfert");
    }
  };

  const openRequest = async (id) => {
    try {
      const res = await api.get(`/inter-site-requests/${id}`);
      setSelectedRequest(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Impossible d’ouvrir le bon de transfert");
    }
  };

  const updateApprovedLine = (lineId, value) => {
    setSelectedRequest((prev) => ({
      ...prev,
      lines: prev.lines.map((line) =>
        line.id === lineId ? { ...line, approved_quantity: value } : line
      ),
    }));
  };

  const approveRequest = async () => {
    try {
      const payload = {
        lines: selectedRequest.lines.map((line) => ({
          id: line.id,
          approved_quantity: Number(line.approved_quantity ?? 0),
          notes: line.notes || "",
        })),
      };

      const res = await api.put(`/inter-site-requests/${selectedRequest.id}/approve`, payload);
      toast.success(res.data.message || "Bon de transfert approuvé");
      setConfirmAction(null);
      openRequest(selectedRequest.id);
      loadRequests();
    } catch (err) {
      console.error(err);
      toast.error("Erreur approbation");
    }
  };

  const sendRequest = async () => {
    try {
      const payload = {
        from_warehouse_id: Number(executionForm.from_warehouse_id),
        to_warehouse_id: Number(executionForm.to_warehouse_id),
      };

      const res = await api.post(`/inter-site-requests/${selectedRequest.id}/send`, payload);
      toast.success(res.data.message || "Transfert expédié");
      setConfirmAction(null);
      openRequest(selectedRequest.id);
      loadRequests();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur expédition");
    }
  };

  const receiveRequest = async () => {
    try {
      const res = await api.post(`/inter-site-requests/${selectedRequest.id}/receive`);
      toast.success(res.data.message || "Réception confirmée");
      setConfirmAction(null);
      openRequest(selectedRequest.id);
      loadRequests();
    } catch (err) {
      console.error(err);
      toast.error("Erreur réception");
    }
  };

  const canApprove = selectedRequest && Number(user?.site_id) === Number(selectedRequest.from_site_id);
  const canReceive = selectedRequest && Number(user?.site_id) === Number(selectedRequest.to_site_id);

  if (loading) {
    return <div className="p-6">Chargement des références...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Bons de transfert inter-sites</h1>
        <p className="text-slate-500">
          Demande, approbation, expédition en transit, puis réception finale.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold text-slate-800">Créer un BT</h2>

        <form onSubmit={createRequest} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <select
              className="rounded-xl border p-3"
              value={createForm.from_site_id}
              onChange={(e) => setCreateForm((p) => ({ ...p, from_site_id: e.target.value }))}
            >
              <option value="">Site expéditeur</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border p-3"
              value={createForm.to_site_id}
              onChange={(e) => setCreateForm((p) => ({ ...p, to_site_id: e.target.value }))}
            >
              <option value="">Site demandeur</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>

            <input
              className="rounded-xl border p-3"
              placeholder="Notes"
              value={createForm.notes}
              onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>

          <div className="space-y-3">
            {createForm.lines.map((line, index) => (
              <div key={index} className="grid grid-cols-1 gap-4 rounded-xl border p-4 md:grid-cols-3">
                <select
                  className="rounded-xl border p-3"
                  value={line.product_id}
                  onChange={(e) => updateLine(index, "product_id", e.target.value)}
                >
                  <option value="">Produit</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>

                <input
                  className="rounded-xl border p-3"
                  type="number"
                  placeholder="Qté demandée"
                  value={line.requested_quantity}
                  onChange={(e) => updateLine(index, "requested_quantity", e.target.value)}
                />

                <input
                  className="rounded-xl border p-3"
                  placeholder="Notes"
                  value={line.notes}
                  onChange={(e) => updateLine(index, "notes", e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={addLine}
              className="rounded-xl bg-slate-700 px-4 py-2 text-white"
            >
              Ajouter ligne
            </button>

            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-white"
            >
              Créer BT
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold text-slate-800">Liste des BT</h2>

        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
              <div>
                <div className="font-semibold text-slate-800">{req.request_number}</div>
                <div className="text-sm text-slate-500">
                  {req.from_site?.name ?? "Source"} → {req.to_site?.name ?? "Destination"} / {req.status}
                </div>
              </div>

              <button
                onClick={() => openRequest(req.id)}
                className="rounded-xl bg-blue-600 px-4 py-2 text-white"
              >
                Ouvrir
              </button>
            </div>
          ))}
        </div>
      </div>

      {selectedRequest && (
        <div className="rounded-2xl bg-white p-6 shadow space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{selectedRequest.request_number}</h2>
            <p className="text-slate-500">
              {selectedRequest.from_site?.name ?? "Source"} → {selectedRequest.to_site?.name ?? "Destination"} / {selectedRequest.status}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="border-b border-slate-200">
                <tr className="text-slate-600">
                  <th className="px-4 py-3">Produit</th>
                  <th className="px-4 py-3">Demandé</th>
                  <th className="px-4 py-3">Approuvé</th>
                  <th className="px-4 py-3">Expédié</th>
                  <th className="px-4 py-3">Reçu</th>
                </tr>
              </thead>
              <tbody>
                {(selectedRequest.lines ?? []).map((line) => (
                  <tr key={line.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">{line.product?.name ?? "-"}</td>
                    <td className="px-4 py-3">{line.requested_quantity}</td>
                    <td className="px-4 py-3">
                      {selectedRequest.status === "pending" && canApprove ? (
                        <input
                          type="number"
                          className="rounded border p-2"
                          value={line.approved_quantity ?? ""}
                          onChange={(e) => updateApprovedLine(line.id, e.target.value)}
                        />
                      ) : (
                        line.approved_quantity ?? "-"
                      )}
                    </td>
                    <td className="px-4 py-3">{line.sent_quantity ?? "-"}</td>
                    <td className="px-4 py-3">{line.received_quantity ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedRequest.status === "pending" && canApprove && (
            <button
              onClick={() => setConfirmAction("approve")}
              className="rounded-xl bg-emerald-700 px-4 py-2 text-white"
            >
              Approuver
            </button>
          )}

          {selectedRequest.status === "approved" && canApprove && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <select
                className="rounded-xl border p-3"
                value={executionForm.from_warehouse_id}
                onChange={(e) => setExecutionForm((p) => ({ ...p, from_warehouse_id: e.target.value }))}
              >
                <option value="">Dépôt source</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>

              <select
                className="rounded-xl border p-3"
                value={executionForm.to_warehouse_id}
                onChange={(e) => setExecutionForm((p) => ({ ...p, to_warehouse_id: e.target.value }))}
              >
                <option value="">Dépôt destination</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setConfirmAction("send")}
                className="rounded-xl bg-slate-900 px-4 py-2 text-white md:col-span-2"
              >
                Expédier (en transit)
              </button>
            </div>
          )}

          {selectedRequest.status === "in_transit" && canReceive && (
            <button
              onClick={() => setConfirmAction("receive")}
              className="rounded-xl bg-emerald-700 px-4 py-2 text-white"
            >
              Confirmer réception
            </button>
          )}
        </div>
      )}

      {confirmAction === "approve" && (
        <ConfirmBox
          title="Confirmer l’approbation"
          message="Voulez-vous vraiment approuver ce bon de transfert ?"
          onCancel={() => setConfirmAction(null)}
          onConfirm={approveRequest}
        />
      )}

      {confirmAction === "send" && (
        <ConfirmBox
          title="Confirmer l’expédition"
          message="Le stock sera sorti du site expéditeur et le transfert passera en transit."
          onCancel={() => setConfirmAction(null)}
          onConfirm={sendRequest}
        />
      )}

      {confirmAction === "receive" && (
        <ConfirmBox
          title="Confirmer la réception"
          message="Le stock va être ajouté au site destinataire et le transfert terminé."
          onCancel={() => setConfirmAction(null)}
          onConfirm={receiveRequest}
        />
      )}
    </div>
  );
}