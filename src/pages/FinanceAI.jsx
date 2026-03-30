import { useEffect, useState } from "react";
import api from "../services/api";

function Card({ title, value, color = "text-slate-800" }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow">
      <div className="text-sm text-slate-500">{title}</div>
      {/* Correction ici : Ajout des { } et des ` ` */}
      <div className={`mt-2 text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

export default function FinanceAI() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      const res = await api.get("/finance/ai");
      setData(res.data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Impossible de charger l’IA financière");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  if (!data) {
    return <div>Chargement de l’IA financière...</div>;
  }

  const balanceColor = (value) =>
    Number(value) < 0 ? "text-red-600" : "text-emerald-600";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">IA Trésorerie</h1>
        <p className="text-slate-500">
          Prévisions, alertes et recommandations automatiques de trésorerie.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card
          title="Prévision à 3 jours"
         value={`${data.forecast_3_days?.predicted_balance ?? 0} Ar`}
          color={balanceColor(data.forecast_3_days?.predicted_balance)}
        />
        <Card
          title="Prévision à 7 jours"
          value={`${data.forecast_7_days?.predicted_balance ?? 0} Ar`}
          color={balanceColor(data.forecast_7_days?.predicted_balance)}
        />
        <Card
          title="Prévision à 30 jours"
          value={`${data.forecast_30_days?.predicted_balance ?? 0} Ar`}
          color={balanceColor(data.forecast_30_days?.predicted_balance)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">Alertes</h2>
          <div className="space-y-3">
            {(data.alerts ?? []).map((alert, index) => (
              <div
                key={index}
                className={`rounded-xl p-3 ${
                  alert.level === "critical"
                    ? "bg-red-50 text-red-700"
                    : alert.level === "high"
                    ? "bg-orange-50 text-orange-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                <div className="font-semibold">{alert.title}</div>
                <div>{alert.message}</div>
              </div>
            ))}
            {(!data.alerts || data.alerts.length === 0) && (
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                Aucune alerte majeure.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">Recommandations</h2>
          <div className="space-y-3">
            {(data.recommendations ?? []).map((rec, index) => (
              <div key={index} className="rounded-xl bg-blue-50 p-3 text-blue-700">
                <div className="font-semibold">{rec.title}</div>
                <div>{rec.message}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow">
        <h2 className="mb-4 text-xl font-semibold text-slate-800">Paiements à venir (7 jours)</h2>
        <div className="space-y-3">
          {(data.upcoming_payments ?? []).map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 p-4"
            >
              <div>
                <div className="font-semibold text-slate-800">{payment.supplier_name}</div>
                <div className="text-sm text-slate-500">
                 Échéance : {payment.due_date} {payment.site_id ? `/ Site ${payment.site_id}` : ""}
                </div>
              </div>
              <div className="text-lg font-bold text-slate-800">
                {payment.amount} Ar
              </div>
            </div>
          ))}
          {(!data.upcoming_payments || data.upcoming_payments.length === 0) && (
            <div className="text-slate-500">Aucun paiement prévu dans les 7 jours.</div>
          )}
        </div>
      </div>
    </div>
  );
}