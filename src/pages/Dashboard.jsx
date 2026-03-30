import { useEffect, useState } from "react";
import api from "../services/api";
import KpiCard from "../components/KpiCard";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/dashboard")
      .then((res) => setData(res.data))
      .catch((err) => {
        console.error(err);
        setError("Impossible de charger le dashboard");
      });
  }, []);

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  if (!data) {
    return <div>Chargement du dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Dashboard PDG</h1>
        <p className="text-slate-500">
          Vue globale stock, dépenses, pertes et intelligence métier.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Valeur stock" value={`${data.kpis?.stock?.total_value ?? 0} Ar`} />
        <KpiCard title="Quantité stock" value={`${data.kpis?.stock?.total_quantity ?? 0}`} />
        <KpiCard title="Dépenses du jour" value={`${data.kpis?.expenses ?? 0} Ar`} />
        <KpiCard title="Pertes du jour" value={`${data.kpis?.losses ?? 0} Ar`} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">Alertes</h2>
          <div className="space-y-3">
            {(data.alerts ?? []).map((alert, index) => (
              <div key={index} className="rounded-xl bg-red-50 p-3 text-red-700">
                {alert.message}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">Recommandations IA</h2>
          <div className="space-y-3">
            {(data.recommendations ?? []).map((rec, index) => (
              <div key={index} className="rounded-xl bg-blue-50 p-3 text-blue-700">
                {rec}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}