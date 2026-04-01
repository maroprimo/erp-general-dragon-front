import { useEffect, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import KpiCard from "../components/KpiCard";

export default function StockDashboardSite() {
  const [data, setData] = useState(null);

  const loadData = async () => {
    try {
      const res = await api.get("/dashboard/stock/site");
      setData(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger le dashboard site");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (!data) return <div>Chargement du dashboard site...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Dashboard Stock Site</h1>
        <p className="text-slate-500">Vue opérationnelle du site connecté.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Valeur stock" value={`${data.kpis.total_stock_value} Ar`} />
        <KpiCard title="Stocks critiques" value={data.kpis.critical_count} />
        <KpiCard title="Ruptures" value={data.kpis.out_of_stock_count} />
        <KpiCard title="Pertes 30j" value={`${data.kpis.loss_value_30_days} Ar`} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold">Alertes stock critique</h2>
          <div className="space-y-2">
            {(data.alerts.critical_stock ?? []).map((item) => (
              <div key={item.id} className="rounded-xl bg-orange-50 p-3">
                <div className="font-semibold">{item.product?.name}</div>
                <div className="text-sm text-slate-600">
                  Stock: {item.quantity_on_hand} / Min: {item.product?.min_stock ?? 0}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold">Suggestions de commande</h2>
          <div className="space-y-2">
            {(data.recommendations.reorder ?? []).map((item) => (
              <div key={item.product_id} className="rounded-xl bg-blue-50 p-3">
                <div className="font-semibold">{item.product_name}</div>
                <div className="text-sm text-slate-600">
                  Stock actuel: {item.current_stock} / Qté suggérée: {item.suggested_qty}
                </div>
                <button className="mt-2 rounded-lg bg-slate-900 px-3 py-2 text-white">
                  Commander
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold">Transferts en transit</h2>
          <div className="space-y-2">
            {(data.operational.transfers_in_transit ?? []).map((item) => (
              <div key={item.id} className="rounded-xl bg-amber-50 p-3">
                <div className="font-semibold">{item.request_number}</div>
                <div className="text-sm text-slate-600">
                  {item.from_site?.name} → {item.to_site?.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold">Productions en cours</h2>
          <div className="space-y-2">
            {(data.operational.productions_in_progress ?? []).map((item) => (
              <div key={item.id} className="rounded-xl bg-emerald-50 p-3">
                <div className="font-semibold">{item.order_number}</div>
                <div className="text-sm text-slate-600">
                  {item.recipe?.product?.name ?? "-"} / {item.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}