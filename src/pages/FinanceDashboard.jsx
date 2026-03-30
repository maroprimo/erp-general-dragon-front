import { useEffect, useState } from "react";
import api from "../services/api";

export default function FinanceDashboard() {
  const [data, setData] = useState(null);

  const load = async () => {
    const res = await api.get("/finance/dashboard");
    setData(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  if (!data) return <div className="p-6">Chargement...</div>;

  return (
    <div className="space-y-6 p-6">

      <h1 className="text-3xl font-bold">💰 Dashboard Financier</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-gray-500">Cash actuel</h2>
          <p className="text-2xl font-bold text-green-600">
            {data.cash_now} Ar
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-gray-500">Dettes fournisseurs</h2>
          <p className="text-2xl font-bold text-red-600">
            {data.supplier_debt} Ar
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-gray-500">À payer (7 jours)</h2>
          <p className="text-2xl font-bold text-orange-600">
            {data.next_7_days} Ar
          </p>
        </div>

      </div>

      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-bold mb-4">⚠️ Paiements urgents</h2>

        {data.urgent_payments.map((p) => (
          <div key={p.id} className="border-b py-2">
            {p.supplier_name} — {p.amount} Ar — échéance {p.due_date}
          </div>
        ))}
      </div>

    </div>
  );
}