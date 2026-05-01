import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function money(v) {
  return Number(v || 0).toLocaleString("fr-FR");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function mondayOfCurrentWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

function alertClass(level) {
  switch (String(level || "").toLowerCase()) {
    case "danger":
      return "bg-red-100 text-red-700 border-red-200";
    case "warning":
      return "bg-amber-100 text-amber-700 border-amber-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export default function ExecutiveWeeklyReport() {
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState([]);


  const [emailForm, setEmailForm] = useState({
    to: "",
    cc: "",
    });

    const [sendingEmail, setSendingEmail] = useState(false);
    const [whatsappSummary, setWhatsappSummary] = useState("");


  const buildQueryString = () => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, value);
    }
  });

  return params.toString();
};

const downloadWithAuth = async (url, filename) => {
  try {
    const res = await api.get(url, {
      responseType: "blob",
    });

    const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error(err);
    toast.error("Impossible de télécharger le fichier");
  }
};

const exportCsv = () => {
  const qs = buildQueryString();
  const url = `/executive-reports/weekly/export-csv${qs ? `?${qs}` : ""}`;

  downloadWithAuth(url, `rapport_pdg_${filters.date_from}_${filters.date_to}.csv`);
};

const openPrintVersion = async () => {
  const qs = buildQueryString();
  const url = `/executive-reports/weekly/print${qs ? `?${qs}` : ""}`;

  try {
    const res = await api.get(url, {
      responseType: "text",
    });

    const printWindow = window.open("", "_blank");
    printWindow.document.open();
    printWindow.document.write(res.data);
    printWindow.document.close();
  } catch (err) {
    console.error(err);
    toast.error("Impossible d'ouvrir la version imprimable");
  }
};


const sendEmailReport = async () => {
  if (!emailForm.to) {
    toast.error("Veuillez saisir au moins un destinataire");
    return;
  }

  try {
    setSendingEmail(true);

    const payload = {
      to: emailForm.to,
      cc: emailForm.cc || null,
      site_id: filters.site_id || null,
      date_from: filters.date_from,
      date_to: filters.date_to,
    };

    const res = await api.post("/executive-reports/weekly/send-email", payload);

    toast.success(res.data?.message || "Rapport envoyé par email");
  } catch (err) {
    console.error(err);
    toast.error(err?.response?.data?.message || "Erreur envoi email");
  } finally {
    setSendingEmail(false);
  }
};

const loadWhatsappSummary = async () => {
  try {
    const params = {};

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "") params[key] = value;
    });

    const res = await api.get("/executive-reports/weekly/whatsapp-summary", {
      params,
    });

    const message = res.data?.message || "";
    const encodedMessage = encodeURIComponent(message);

    setWhatsappSummary(message);

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(message);
      toast.success("Résumé WhatsApp copié");
    } else {
      toast.success("Résumé WhatsApp généré");
    }

    window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
  } catch (err) {
    console.error(err);
    toast.error("Impossible de générer le résumé WhatsApp");
  }
};


  const [filters, setFilters] = useState({
    site_id: "",
    date_from: mondayOfCurrentWeek(),
    date_to: today(),
  });

  const [report, setReport] = useState({
    period: {},
    summary: {},
    sales_by_date: [],
    stock_by_warehouse: [],
    top_kitchen_loss_products: [],
    alerts: [],
  });

  const loadReferences = async () => {
    try {
      const sitesRes = await api.get("/sites");
      setSites(asArray(sitesRes.data));
    } catch (err) {
      console.error(err);
    }
  };

  const loadReport = async (customFilters = filters) => {
    try {
      setLoading(true);

      const params = {};
      Object.entries(customFilters).forEach(([key, value]) => {
        if (value !== "") params[key] = value;
      });

      const res = await api.get("/executive-reports/weekly", { params });

      setReport({
        period: res.data?.period || {},
        summary: res.data?.summary || {},
        sales_by_date: res.data?.sales_by_date || [],
        stock_by_warehouse: res.data?.stock_by_warehouse || [],
        top_kitchen_loss_products: res.data?.top_kitchen_loss_products || [],
        alerts: res.data?.alerts || [],
      });
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger le rapport PDG");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReferences();
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = report.summary || {};

  const paymentsByMethod = useMemo(() => {
    return Object.entries(s.payments_by_method || {}).map(([method, amount]) => ({
      method,
      amount,
    }));
  }, [s.payments_by_method]);

  const printReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:bg-white">
      <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-700 p-5 text-white shadow-xl print:bg-slate-900">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-3xl font-black">Rapport PDG hebdomadaire</h1>
            <p className="mt-1 text-sm text-slate-200">
              Résumé exécutif des ventes, caisses, pertes cuisine et stock.
            </p>
          </div>

            <div className="flex flex-wrap gap-2 print:hidden">
            <button
                onClick={exportCsv}
                className="rounded-xl bg-white px-4 py-3 font-bold text-slate-900"
            >
                Export Excel
            </button>

            <button
                onClick={openPrintVersion}
                className="rounded-xl bg-emerald-500 px-4 py-3 font-bold text-white"
            >
                PDF / Impression
            </button>

            <button
                onClick={printReport}
                className="rounded-xl bg-slate-100 px-4 py-3 font-bold text-slate-900"
            >
                Imprimer cette page
            </button>
            </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow print:hidden">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <select
            className="rounded-xl border p-3"
            value={filters.site_id}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, site_id: e.target.value }))
            }
          >
            <option value="">Tous les sites</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            className="rounded-xl border p-3"
            value={filters.date_from}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, date_from: e.target.value }))
            }
          />

          <input
            type="date"
            className="rounded-xl border p-3"
            value={filters.date_to}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, date_to: e.target.value }))
            }
          />

          <button
            onClick={() => loadReport(filters)}
            className="rounded-xl bg-slate-900 px-4 py-3 font-bold text-white"
          >
            Générer rapport
          </button>
        </div>
      </div>
<div className="rounded-2xl bg-white p-5 shadow print:hidden">
  <h2 className="mb-4 text-xl font-black text-slate-800">
    Envoi du rapport
  </h2>

  <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
    <input
      className="rounded-xl border p-3"
      placeholder="Email destinataire"
      value={emailForm.to}
      onChange={(e) =>
        setEmailForm((prev) => ({ ...prev, to: e.target.value }))
      }
    />

    <input
      className="rounded-xl border p-3"
      placeholder="CC optionnel"
      value={emailForm.cc}
      onChange={(e) =>
        setEmailForm((prev) => ({ ...prev, cc: e.target.value }))
      }
    />

    <button
      onClick={sendEmailReport}
      disabled={sendingEmail}
      className="rounded-xl bg-blue-700 px-4 py-3 font-bold text-white disabled:opacity-60"
    >
      {sendingEmail ? "Envoi..." : "Envoyer email"}
    </button>

    <button
      onClick={loadWhatsappSummary}
      className="rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white"
    >
      Copier résumé WhatsApp
    </button>
  </div>

  {whatsappSummary && (
    <textarea
      className="mt-4 w-full rounded-xl border p-3 text-sm"
      rows={10}
      value={whatsappSummary}
      readOnly
    />
  )}
</div>
      {loading && (
        <div className="rounded-2xl bg-white p-5 text-slate-500 shadow">
          Chargement du rapport...
        </div>
      )}

      {!loading && (
        <>
          <div className="rounded-2xl bg-white p-5 shadow">
            <h2 className="text-xl font-black text-slate-900">
              Période du {report.period?.date_from} au {report.period?.date_to}
            </h2>
          </div>

          {report.alerts.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {report.alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`rounded-2xl border p-4 ${alertClass(alert.level)}`}
                >
                  <div className="font-black">{alert.title}</div>
                  <div className="text-sm">{alert.message}</div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-white p-4 shadow">
              <div className="text-sm text-slate-500">CA ventes</div>
              <div className="text-2xl font-black text-slate-900">
                {money(s.total_sales)} Ar
              </div>
              <div className="text-xs text-slate-500">
                {s.sales_count || 0} tickets validés
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow">
              <div className="text-sm text-slate-500">Paiements encaissés</div>
              <div className="text-2xl font-black text-emerald-700">
                {money(s.payments_total)} Ar
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow">
              <div className="text-sm text-slate-500">Écart caisse</div>
              <div
                className={`text-2xl font-black ${
                  Number(s.cash_difference_total || 0) < 0
                    ? "text-red-700"
                    : "text-emerald-700"
                }`}
              >
                {money(s.cash_difference_total)} Ar
              </div>
              <div className="text-xs text-slate-500">
                {s.closed_cash_sessions_count || 0} caisses clôturées
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow">
              <div className="text-sm text-slate-500">Pertes cuisine</div>
              <div className="text-2xl font-black text-red-700">
                {money(s.kitchen_loss_value)} Ar
              </div>
              <div className="text-xs text-slate-500">
                Surplus : {money(s.kitchen_surplus_value)} Ar
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow">
              <div className="text-sm text-slate-500">Tickets annulés</div>
              <div className="text-2xl font-black text-amber-700">
                {s.cancelled_sales_count || 0}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow">
              <div className="text-sm text-slate-500">Coût stock sorti</div>
              <div className="text-2xl font-black text-slate-900">
                {money(s.stock_cost_total)} Ar
              </div>
              <div className="text-xs text-slate-500">
                {s.stock_movements_count || 0} mouvements vente
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow">
              <div className="text-sm text-slate-500">Contrôles cuisine</div>
              <div className="text-2xl font-black text-slate-900">
                {s.kitchen_checks_count || 0}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow">
              <div className="text-sm text-slate-500">Alertes</div>
              <div className="text-2xl font-black text-red-700">
                {s.alert_count || 0}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="xl:col-span-6">
              <div className="rounded-2xl bg-white p-5 shadow">
                <h2 className="mb-4 text-xl font-black text-slate-800">
                  Encaissements par mode
                </h2>

                <div className="space-y-3">
                  {paymentsByMethod.length === 0 && (
                    <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                      Aucun paiement.
                    </div>
                  )}

                  {paymentsByMethod.map((row) => (
                    <div
                      key={row.method}
                      className="flex items-center justify-between rounded-xl border p-4"
                    >
                      <div className="font-bold uppercase">{row.method}</div>
                      <div className="font-black">{money(row.amount)} Ar</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="xl:col-span-6">
              <div className="rounded-2xl bg-white p-5 shadow">
                <h2 className="mb-4 text-xl font-black text-slate-800">
                  Stock sorti par dépôt
                </h2>

                <div className="space-y-3">
                  {report.stock_by_warehouse.length === 0 && (
                    <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                      Aucun mouvement.
                    </div>
                  )}

                  {report.stock_by_warehouse.map((row) => (
                    <div
                      key={row.warehouse_id || row.warehouse_name}
                      className="rounded-xl border p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-bold">{row.warehouse_name}</div>
                          <div className="text-sm text-slate-500">
                            {row.movement_count} mouvements
                          </div>
                        </div>
                        <div className="font-black">
                          {money(row.total_cost)} Ar
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="xl:col-span-5">
              <div className="rounded-2xl bg-white p-5 shadow">
                <h2 className="mb-4 text-xl font-black text-slate-800">
                  CA par jour
                </h2>

                <div className="space-y-3">
                  {report.sales_by_date.length === 0 && (
                    <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                      Aucune vente.
                    </div>
                  )}

                  {report.sales_by_date.map((row) => (
                    <div
                      key={row.date}
                      className="flex items-center justify-between rounded-xl border p-4"
                    >
                      <div>
                        <div className="font-bold">{row.date}</div>
                        <div className="text-sm text-slate-500">
                          {row.sales_count} tickets
                        </div>
                      </div>
                      <div className="font-black">
                        {money(row.total_sales)} Ar
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="xl:col-span-7">
              <div className="rounded-2xl bg-white p-5 shadow">
                <h2 className="mb-4 text-xl font-black text-slate-800">
                  Top pertes cuisine
                </h2>

                <div className="space-y-3">
                  {report.top_kitchen_loss_products.length === 0 && (
                    <div className="rounded-xl bg-slate-50 p-4 text-slate-500">
                      Aucune perte cuisine.
                    </div>
                  )}

                  {report.top_kitchen_loss_products.map((row) => (
                    <div
                      key={row.product_id || row.product_name}
                      className="rounded-xl border p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-slate-900">
                            {row.product_name}
                          </div>
                          <div className="text-sm text-slate-500">
                            Quantité perdue : {row.loss_quantity}{" "}
                            {row.unit_name || ""}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-black text-red-700">
                            {money(row.loss_value)} Ar
                          </div>
                          <div className="text-xs text-slate-500">
                            {row.alert_count} alertes
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}