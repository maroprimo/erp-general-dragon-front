import { useEffect, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import KpiCard from "../components/KpiCard";
import { formatQty, formatMoney } from "../utils/formatters";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

export default function StockDashboardGlobal() {
  const [data, setData] = useState(null);

  const loadData = async () => {
    try {
      const res = await api.get("/dashboard/stock/global");
      setData(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger le dashboard global");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (!data) return <div>Chargement du dashboard global...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Dashboard PDG Stock</h1>
        <p className="text-slate-500">Vision consolidée du réseau.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard title="Valeur stock réseau" value={`${formatMoney(data.kpis.total_stock_value)} Ar`} />
        <KpiCard title="Stocks critiques" value={data.kpis.critical_count} />
        <KpiCard title="Transferts en transit" value={data.kpis.transfers_in_transit} />
        <KpiCard title="Alertes globales" value={data.kpis.global_alert_count} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold">Valeur stock par site</h2>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={data.comparisons.stock_by_site ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="site_name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="stock_value" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold">Pertes par site</h2>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={data.comparisons.loss_by_site ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="site_name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="loss_value" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow">
        <h2 className="mb-4 text-xl font-semibold">Entrées vs sorties réseau (7 jours)</h2>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={data.charts.flow_7_days ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="entries" />
              <Line type="monotone" dataKey="exits" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow">
        <h2 className="mb-4 text-xl font-semibold">Transferts non réceptionnés</h2>
        <div className="space-y-2">
          {(data.alerts.transfers_in_transit ?? []).map((item) => (
            <div key={item.id} className="rounded-xl bg-amber-50 p-3">
              <div className="font-semibold">{item.request_number}</div>
              <div className="text-sm text-slate-600">
                {item.from_site?.name} → {item.to_site?.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}