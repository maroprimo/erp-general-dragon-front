export default function KpiCard({ title, value, color = "bg-white" }) {
  return (
    <div className={`${color} rounded-2xl p-5 shadow`}>
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-bold text-slate-800">{value}</div>
    </div>
  );
}