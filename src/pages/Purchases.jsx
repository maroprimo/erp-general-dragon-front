import { useEffect, useState } from "react";
import api from "../services/api";

export default function Purchases() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/purchases")
      .then((res) => setOrders(res.data.data ?? res.data))
      .catch((err) => {
        console.error(err);
        setError("Impossible de charger les achats");
      });
  }, []);

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <h1 className="mb-6 text-3xl font-bold text-slate-800">Achats fournisseurs</h1>

      <div className="overflow-x-auto rounded-2xl bg-white p-4 shadow">
        <table className="min-w-full text-left">
          <thead className="border-b border-slate-200">
            <tr className="text-slate-600">
              <th className="px-4 py-3">N° BC</th>
              <th className="px-4 py-3">Fournisseur</th>
              <th className="px-4 py-3">Site</th>
              <th className="px-4 py-3">Montant</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((item, index) => (
              <tr key={index} className="border-b border-slate-100">
                <td className="px-4 py-3">{item.order_number}</td>
                <td className="px-4 py-3">{item.supplier?.company_name ?? item.supplier_id}</td>
                <td className="px-4 py-3">{item.site?.name ?? item.site_id}</td>
                <td className="px-4 py-3">{item.total_amount} Ar</td>
                <td className="px-4 py-3">{item.status}</td>
                <td className="px-4 py-3">{item.ordered_at ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}