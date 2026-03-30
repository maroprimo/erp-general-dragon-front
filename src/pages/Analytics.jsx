import { useEffect, useState } from "react";
import api from "../services/api";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function Analytics() {
  const [dashboard, setDashboard] = useState({}); // Objet vide au lieu de null
  const [error, setError] = useState("");
    const [weeklyData, setWeeklyData] = useState([]);

  useEffect(() => {
    api
      .get("/analytics/weekly")
      .then((res) => setWeeklyData(res.data))
      .catch((err) => {
        console.error(err);
        setError("Impossible de charger les statistiques");
      });
  }, []);

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  if (!dashboard) {
    return <div>Chargement des graphiques...</div>;
  }

  const kpiData = [
    { name: "Stock", value: Number(dashboard.kpis?.stock?.total_value ?? 0) },
    { name: "Dépenses", value: Number(dashboard.kpis?.expenses ?? 0) },
    { name: "Pertes", value: Number(dashboard.kpis?.losses ?? 0) },
    { name: "Sorties", value: Number(dashboard.kpis?.outflows ?? 0) },
  ];

  const trendData = [
    { day: "Lun", stock: 12000000, depenses: 2500000, pertes: 120000 },
    { day: "Mar", stock: 11800000, depenses: 2100000, pertes: 95000 },
    { day: "Mer", stock: 12300000, depenses: 3200000, pertes: 145000 },
    { day: "Jeu", stock: 12150000, depenses: 2800000, pertes: 100000 },
    { day: "Ven", stock: 11980000, depenses: 3500000, pertes: 160000 },
    { day: "Sam", stock: 12500000, depenses: 3000000, pertes: 130000 },
    { day: "Dim", stock: 12400000, depenses: 2600000, pertes: 90000 },
  ];

  const pieData = [
    { name: "Stock", value: Number(dashboard.kpis?.stock?.total_value ?? 0) },
    { name: "Dépenses", value: Number(dashboard.kpis?.expenses ?? 0) },
    { name: "Pertes", value: Number(dashboard.kpis?.losses ?? 0) },
  ];

  const COLORS = ["#0f172a", "#2563eb", "#dc2626"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Analytics</h1>
        <p className="text-slate-500">
          Vue visuelle du stock, des dépenses, des pertes et des tendances.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">
            Vue globale des KPI
          </h2>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={kpiData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">
            Répartition
          </h2>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={110}
                  label
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow">
        <h2 className="mb-4 text-xl font-semibold text-slate-800">
          Tendance hebdomadaire
        </h2>
        <div style={{ width: "100%", height: 360 }}>
          <ResponsiveContainer>
            <LineChart data={weeklyData.length ? weeklyData : trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="stock" />
              <Line type="monotone" dataKey="depenses" />
              <Line type="monotone" dataKey="pertes" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}