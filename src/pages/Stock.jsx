import { useEffect, useState } from "react";
import api from "../services/api";


export default function Stock() {
  const [stocks, setStocks] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/stock-levels")
      .then((res) => {
        setStocks(res.data.data ?? res.data);
      })
      .catch((err) => {
        console.error(err);
        setError("Impossible de charger le stock");
      });
  }, []);

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <h1 className="mb-6 text-3xl font-bold text-slate-800">Stock par dépôt</h1>

      <div className="overflow-x-auto rounded-2xl bg-white p-4 shadow">
        <table className="min-w-full text-left">
          <thead className="border-b border-slate-200">
            <tr className="text-slate-600">
              <th className="px-4 py-3">Produit</th>
              <th className="px-4 py-3">Site</th>
              <th className="px-4 py-3">Dépôt</th>
              <th className="px-4 py-3">Quantité</th>
              <th className="px-4 py-3">Disponible</th>
              <th className="px-4 py-3">Coût moyen</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((item, index) => (
              <tr key={index} className="border-b border-slate-100">
                <td className="px-4 py-3">{item.product?.name ?? item.product_id}</td>
                <td className="px-4 py-3">{item.site?.name ?? item.site_id}</td>
                <td className="px-4 py-3">{item.warehouse?.name ?? item.warehouse_id}</td>
                <td className="px-4 py-3">{item.quantity_on_hand}</td>
                <td className="px-4 py-3">{item.quantity_available}</td>
                <td className="px-4 py-3">{item.average_unit_cost} Ar</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}