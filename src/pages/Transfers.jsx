import { useEffect, useState } from "react";
import api from "../services/api";

export default function Transfers() {
  const [transfers, setTransfers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/transfers")
      .then((res) => setTransfers(res.data.data ?? res.data))
      .catch((err) => {
        console.error(err);
        setError("Impossible de charger les transferts");
      });
  }, []);

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <h1 className="mb-6 text-3xl font-bold text-slate-800">Transferts inter-sites</h1>

      <div className="overflow-x-auto rounded-2xl bg-white p-4 shadow">
        <table className="min-w-full text-left">
          <thead className="border-b border-slate-200">
            <tr className="text-slate-600">
              <th className="px-4 py-3">N° transfert</th>
              <th className="px-4 py-3">Site source</th>
              <th className="px-4 py-3">Site destination</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((item, index) => (
              <tr key={index} className="border-b border-slate-100">
                <td className="px-4 py-3">{item.transfer_number}</td>
                <td className="px-4 py-3">{item.from_site?.name ?? item.from_site_id}</td>
                <td className="px-4 py-3">{item.to_site?.name ?? item.to_site_id}</td>
                <td className="px-4 py-3">{item.status}</td>
                <td className="px-4 py-3">{item.requested_at ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}