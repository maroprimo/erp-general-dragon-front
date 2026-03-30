import { useEffect, useState } from "react";
import api from "../services/api";

// Petit utilitaire pour les couleurs des statuts
const getStatusBadge = (status) => {
  const styles = {
    draft: "bg-gray-100 text-gray-600",
    planned: "bg-blue-100 text-blue-600",
    in_progress: "bg-orange-100 text-orange-600 animate-pulse",
    finished: "bg-green-100 text-green-600",
    cancelled: "bg-red-100 text-red-600",
  };
  return styles[status] || "bg-slate-100 text-slate-600";
};

export default function ProductionLive() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/production/orders")
      .then((res) => {
        setOrders(res.data.data ?? res.data);
      })
      .catch((err) => {
        console.error(err);
        setError("Impossible de charger les fabrications");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-slate-500">Chargement...</div>;
  if (error) return <div className="p-6 text-red-600 font-medium">{error}</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Suivi de Fabrication</h1>
        <span className="bg-white px-4 py-1 rounded-full text-sm font-medium shadow-sm border border-slate-200">
          {orders.length} Ordres au total
        </span>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-slate-200">
        <table className="min-w-full border-separate border-spacing-0">
          <thead className="bg-slate-50">
            <tr className="text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">N° OF</th>
              <th className="px-6 py-4 font-semibold">Produit</th>
              <th className="px-6 py-4 font-semibold text-center">Quantité Prévue</th>
              <th className="px-6 py-4 font-semibold text-center">Produite</th>
              <th className="px-6 py-4 font-semibold text-center">Rendement</th>
              <th className="px-6 py-4 font-semibold">Statut</th>
              <th className="px-6 py-4 font-semibold">Début</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-mono font-medium text-blue-600">
                  {item.order_number}
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-700">
                    {item.recipe?.product?.name ?? "Produit inconnu"}
                  </div>
                  <div className="text-xs text-slate-400">ID Recette: {item.recipe_id}</div>
                </td>
                <td className="px-6 py-4 text-center font-semibold text-slate-700">
                  {item.planned_quantity}
                </td>
                <td className="px-6 py-4 text-center">
                   <span className={item.produced_quantity > 0 ? "font-bold text-slate-800" : "text-slate-400"}>
                     {item.produced_quantity ?? "0"}
                   </span>
                </td>
                <td className="px-6 py-4 text-center">
                  {item.actual_yield ? (
                    <span className="font-medium text-emerald-600">{item.actual_yield}%</span>
                  ) : "-"}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusBadge(item.status)}`}>
                    {item.status === 'in_progress' ? '● En cours' : item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {item.started_at ? new Date(item.started_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}