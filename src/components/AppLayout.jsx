import { useEffect, useState } from "react";
import api from "../services/api";

export default function AppLayout({ user, logout, page, setPage, children }) {
  const [stockAlertCount, setStockAlertCount] = useState(0);
  const [pendingTransferCount, setPendingTransferCount] = useState(0);
  const [siteName, setSiteName] = useState("Chargement...");

  useEffect(() => {
    const loadHeaderData = async () => {
      try {
        const res = await api.get("/inter-site-requests/pending-count");
        setPendingTransferCount(res.data.count ?? 0);

        if (user?.site_id) {
          const resSite = await api.get(`/sites-admin/${user.site_id}`);
          setSiteName(resSite.data.name || "Site inconnu");
        } else {
          setSiteName("Tous les sites (Admin)");
        }
      } catch (err) {
        console.error(err);
        setSiteName("Erreur site");
      }
    };

    const loadStockAlerts = async () => {
      try {
        const res = await api.get("/dashboard/stock/alert-count");
        setStockAlertCount(res.data.count ?? 0);
      } catch (err) {
        console.error(err);
      }
    };

    loadHeaderData();
    loadStockAlerts();
  }, [user]);

  const navItems = [
    { key: "stockDashboardSite", label: "Dashboard Site", roles: ["pdg", "admin", "stock", "cuisine", "controle"] },
    { key: "stockDashboardGlobal", label: "Dashboard PDG Stock", roles: ["pdg"] },
    { key: "stock", label: "Stock", roles: ["pdg", "admin", "stock"] },
    { key: "stockLosses", label: "Pertes", roles: ["pdg", "admin", "stock", "cuisine", "controle"] },
    { key: "ProductionLive", label: "Fabrication en live", roles: ["pdg", "admin", "stock", "cuisine", "controle"] },
    { key: "stockInventories", label: "Inventaires", roles: ["pdg", "admin", "stock", "controle"] },
    { key: "newProduction", label: "Fabrication", roles: ["pdg", "admin", "cuisine"] },
    { key: "recipes", label: "Fiches techniques", roles: ["pdg", "admin", "cuisine", "stock"] },
    { key: "productionActions", label: "Actions fabrication", roles: ["pdg", "admin", "cuisine"] },
    //{ key: "productionFinish", label: "Fin fabrication", roles: ["pdg", "admin", "cuisine"] },
    { key: "ia", label: "IA", roles: ["pdg"] },
    { key: "purchasePOS", label: "Achat POS", roles: ["pdg", "admin", "achat", "stock"] },
    { key: "purchases", label: "Achats", roles: ["pdg", "admin", "achat"] },
    { key: "receivePurchase", label: "Réception fournisseur", roles: ["pdg", "admin", "achat", "stock"] },
    { key: "purchaseDocuments", label: "Docs achats", roles: ["pdg", "admin", "achat", "stock"] },
    { key: "suppliers", label: "Fournisseurs", roles: ["pdg", "admin", "achat", "stock"] },
    { key: "transfers", label: "Transferts", roles: ["pdg", "admin", "stock"] },
    { key: "transferValidation", label: "Validation transfert", roles: ["pdg", "admin", "stock", "controle"] },
    { key: "interSiteRequests", label: "Inter-sites", roles: ["pdg", "admin", "stock", "controle"] },
    { key: "sites", label: "Sites", roles: ["pdg"] },
    { key: "finance", label: "Finance", roles: ["pdg"] },
    { key: "financeAI", label: "IA Trésorerie", roles: ["pdg"] },
    { key: "analytics", label: "Analytics", roles: ["pdg"] },
    { key: "users", label: "Utilisateurs", roles: ["pdg"] },
    { key: "auditLogs", label: "Audit Logs", roles: ["pdg"] },
    { key: "productsCatalog", label: "Gestion Produits", roles: ["pdg", "admin", "stock", "achat"] },
  ];

  const filteredNav = navItems.filter((item) => item.roles.includes(user?.role));

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="w-72 bg-slate-900 text-white shadow-xl">
        <div className="border-b border-slate-800 px-6 py-6">
          <h1 className="text-2xl font-bold">General Dragon</h1>
          <p className="mt-1 text-sm text-slate-300">ERP Restaurants</p>
        </div>

        <nav className="space-y-2 p-4">
          {filteredNav.map((item) => {
            const isInterSite = item.key === "interSiteRequests";
            const isStockDashboard = item.key === "stockDashboardSite" || item.key === "stockDashboardGlobal";

            return (
              <button
                key={item.key}
                onClick={() => setPage(item.key)}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                  page === item.key
                    ? "bg-white text-slate-900"
                    : "bg-slate-800 text-slate-100 hover:bg-slate-700"
                }`}
              >
                <span>{item.label}</span>

                {/* Badge Inter-sites (Rouge) */}
                {isInterSite && pendingTransferCount > 0 && (
                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">
                    {pendingTransferCount}
                  </span>
                )}

                {/* Badge Alerte Stock (Orange/Ambre) sur les Dashboards Stock */}
                {isStockDashboard && stockAlertCount > 0 && (
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">
                    {stockAlertCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">ERP General Dragon</h2>
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-700">Site : {siteName}</span> 
              <span className="mx-2">|</span>
              Utilisateur : {user?.name || user?.email} ({user?.role})
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="avatar"
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                  ?
                </div>
              )}

              <div className="text-right">
                <div className="text-sm font-medium text-slate-800">{user?.name || user?.email}</div>
                <div className="text-xs text-slate-500">{user?.role}</div>
              </div>
            </div>

            <button
              onClick={logout}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Déconnexion
            </button>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}