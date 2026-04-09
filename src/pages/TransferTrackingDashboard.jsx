import { useEffect, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import KpiCard from "../components/KpiCard";
import { formatDateTime } from "../utils/formatters";

export default function TransferTrackingDashboard() {
  const [data, setData] = useState(null);
  const [thresholdHours, setThresholdHours] = useState(6);

  const loadDashboard = async (hours = thresholdHours) => {
    try {
      const res = await api.get("/transfer-tracking/dashboard", {
        params: { threshold_hours: hours },
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger le dashboard transport");
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const openInterSitePage = () => {
    window.location.hash = "interSiteRequests";
    window.dispatchEvent(new CustomEvent("open-page", { detail: "interSiteRequests" }));
  };

  const openInterSiteFiltered = (requestNumber) => {
    window.location.hash = "interSiteRequests";
    window.dispatchEvent(new CustomEvent("open-page", { detail: "interSiteRequests" }));
    setTimeout(() => {
      const el = document.getElementById(`bt-${requestNumber}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 500);
  };

  if (!data) {
    return <div>Chargement du dashboard transport...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Dashboard Suivi Transfert</h1>
          <p className="text-slate-500">
            Vue d’ensemble des BT, scans QR, anomalies et transit long.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="number"
            min="1"
            className="rounded-xl border p-3"
            value={thresholdHours}
            onChange={(e) => setThresholdHours(e.target.value)}
          />
          <button
            onClick={() => loadDashboard(thresholdHours)}
            className="rounded-xl bg-slate-900 px-4 py-3 text-white"
          >
            Rafraîchir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard title="En attente" value={data.kpis.waiting_count} />
        <KpiCard title="Vérifié sécurité" value={data.kpis.security_verified_count} />
        <KpiCard title="Pris en charge" value={data.kpis.picked_up_count} />
        <KpiCard title="Réceptionné" value={data.kpis.received_count} />
        <KpiCard title="Rejeté" value={data.kpis.rejected_count} />
        <KpiCard title="Transit long" value={data.kpis.transit_long_count} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800">Alerte transit long</h2>
            <button
              onClick={openInterSitePage}
              className="rounded-xl bg-slate-900 px-3 py-2 text-white"
            >
              Voir tous les BT
            </button>
          </div>

          <div className="space-y-3">
            {(data.alerts.transit_long ?? []).length === 0 && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Aucun transit long.
              </div>
            )}

            {(data.alerts.transit_long ?? []).map((item) => (
              <div key={item.id} className="rounded-xl bg-red-50 p-4">
                <div className="font-semibold text-red-700">{item.request_number}</div>
                <div className="text-sm text-slate-600">
                  {item.from_site?.name} → {item.to_site?.name}
                </div>
                <div className="text-sm text-slate-600">
                  Sorti le : {formatDateTime(item.sent_at)}
                </div>
                <button
                  onClick={() => openInterSiteFiltered(item.request_number)}
                  className="mt-2 rounded-lg bg-red-700 px-3 py-2 text-white"
                >
                  Ouvrir
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">Rejets récents</h2>

          <div className="space-y-3">
            {(data.alerts.recent_rejected ?? []).length === 0 && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Aucun rejet récent.
              </div>
            )}

            {(data.alerts.recent_rejected ?? []).map((item) => (
              <div key={item.id} className="rounded-xl bg-red-50 p-4">
                <div className="font-semibold text-red-700">{item.request_number}</div>
                <div className="text-sm text-slate-600">
                  {item.from_site?.name} → {item.to_site?.name}
                </div>
                <div className="text-sm text-slate-600">
                  Motif : {item.reject_reason ?? "-"}
                </div>
                <div className="text-sm text-slate-600">
                  Rejeté le : {formatDateTime(item.rejected_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">Bons en transit</h2>

          <div className="space-y-3">
            {(data.lists.in_transit ?? []).length === 0 && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Aucun bon en transit.
              </div>
            )}

            {(data.lists.in_transit ?? []).map((item) => (
              <div key={item.id} className="rounded-xl bg-amber-50 p-4">
                <div className="font-semibold text-amber-700">{item.request_number}</div>
                <div className="text-sm text-slate-600">
                  {item.from_site?.name} → {item.to_site?.name}
                </div>
                <div className="text-sm text-slate-600">
                  Transport : {item.transport_status}
                </div>
                <div className="text-sm text-slate-600">
                  Sorti le : {formatDateTime(item.sent_at)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-semibold text-slate-800">Réceptions récentes</h2>

          <div className="space-y-3">
            {(data.lists.recent_received ?? []).length === 0 && (
              <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                Aucune réception récente.
              </div>
            )}

            {(data.lists.recent_received ?? []).map((item) => (
              <div key={item.id} className="rounded-xl bg-emerald-50 p-4">
                <div className="font-semibold text-emerald-700">{item.request_number}</div>
                <div className="text-sm text-slate-600">
                  {item.from_site?.name} → {item.to_site?.name}
                </div>
                <div className="text-sm text-slate-600">
                  Réceptionné le : {formatDateTime(item.destination_received_at || item.received_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow">
        <h2 className="mb-4 text-xl font-semibold text-slate-800">Bons en attente</h2>

        <div className="space-y-3">
          {(data.lists.waiting ?? []).length === 0 && (
            <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
              Aucun bon en attente.
            </div>
          )}

          {(data.lists.waiting ?? []).map((item) => (
            <div key={item.id} className="rounded-xl bg-slate-50 p-4">
              <div className="font-semibold text-slate-800">{item.request_number}</div>
              <div className="text-sm text-slate-600">
                {item.from_site?.name} → {item.to_site?.name}
              </div>
              <div className="text-sm text-slate-600">
                Créé le : {formatDateTime(item.requested_at)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}