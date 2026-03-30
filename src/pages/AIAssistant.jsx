import { useEffect, useState } from "react";
import api from "../services/api";

export default function AIAssistant() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/ai/global")
      .then((res) => setData(res.data))
      .catch((err) => {
        console.error(err);
        setError("Impossible de charger l'IA");
      });
  }, []);

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!data) {
    return <div className="p-6">Chargement IA...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <h1 className="mb-6 text-3xl font-bold text-slate-800">Assistant IA</h1>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold">Réassorts suggérés</h2>
          <div className="space-y-3">
            {(data.reorders ?? []).map((item, index) => (
              <div key={index} className="rounded-xl bg-blue-50 p-3 text-blue-700">
                Produit #{item.product_id} — Quantité suggérée : {item.quantity}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold">Transferts suggérés</h2>
          <div className="space-y-3">
            {(data.transfers ?? []).map((item, index) => (
              <div key={index} className="rounded-xl bg-amber-50 p-3 text-amber-700">
                Produit #{item.product_id} — Site {item.from_site} → Site {item.to_site} — Qté : {item.quantity}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold">Anomalies</h2>
          <div className="space-y-3">
            {(data.anomalies ?? []).map((item, index) => (
              <div key={index} className="rounded-xl bg-red-50 p-3 text-red-700">
                {item.message}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold">Risque trésorerie</h2>
          <div className="rounded-xl bg-slate-50 p-4">
            {data.cash?.risk ? (
              <span className="text-red-700 font-semibold">{data.cash.message}</span>
            ) : (
              <span className="text-emerald-700 font-semibold">Pas de risque détecté</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}