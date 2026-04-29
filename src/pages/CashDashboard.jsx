import { useEffect, useState } from "react";
import api from "../services/api";

function formatMoney(v) {
  return Number(v || 0).toLocaleString("fr-FR");
}

export default function CashDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/cash-sessions/dashboard");
      setData(res.data?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black">Dashboard Caisse</h1>

      {loading && <div>Chargement...</div>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {data.map((row) => {
          const diff = Number(row.cash_diff || 0);

          return (
            <div
              key={row.id}
              className="rounded-2xl bg-white p-5 shadow"
            >
              <div className="flex justify-between">
                <div>
                  <div className="font-bold">{row.session_number}</div>
                  <div className="text-sm text-slate-500">
                    {row.site} — {row.terminal}
                  </div>
                </div>

                <div
                  className={`px-3 py-1 rounded-xl text-sm font-bold ${
                    row.status === "open"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100"
                  }`}
                >
                  {row.status}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-slate-500">CA</div>
                  <div className="font-bold">
                    {formatMoney(row.total_sales)} Ar
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Paiements</div>
                  <div className="font-bold">
                    {formatMoney(row.total_payments)} Ar
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Cash attendu</div>
                  <div className="font-bold">
                    {formatMoney(row.cash_expected)} Ar
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Cash réel</div>
                  <div className="font-bold">
                    {formatMoney(row.cash_actual)} Ar
                  </div>
                </div>
              </div>

              <div
                className={`mt-4 p-3 rounded-xl text-center font-bold ${
                  diff === 0
                    ? "bg-emerald-100 text-emerald-700"
                    : diff > 0
                    ? "bg-blue-100 text-blue-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                Écart : {formatMoney(diff)} Ar
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}