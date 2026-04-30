import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const APP_BASE_URL =
  (import.meta.env.VITE_BACKEND_WEB_URL || "https://stock.dragonroyalmg.com").replace(
    /\/index\.php$/,
    ""
  );

function buildAssetUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  let clean = path.startsWith("/") ? path : `/${path}`;

  if (clean.startsWith("/storage/")) {
    clean = clean.replace("/storage/", "/uploads/");
  }

  if (clean.startsWith("/uploads/")) {
    return `${APP_BASE_URL}${clean}`;
  }

  return `${APP_BASE_URL}/uploads${clean}`;
}

function getInitials(name = "") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "DR"
  );
}

const MENU_GROUPS = [
  {
    key: "dashboard",
    label: "Dashboard",
    title: "Dashboard",
    description:
      "Vue d’ensemble des indicateurs du site et du pilotage global du stock.",
    items: [
      {
        key: "stockDashboardSite",
        label: "Dashboard Site",
        roles: ["pdg", "admin", "stock", "controle"],
      },
      {
        key: "stockDashboardGlobal",
        label: "Dashboard PDG Stock",
        roles: ["pdg"],
      },
    ],
  },

  {
  key: "vente",
  label: "Vente",
  title: "POS Vente",
  description:
    "Caisse tactile moderne, ticket rapide, préparation des futures liaisons stock, cuisine et encaissement.",
items: [
  {
  key: "cashDashboard",
  label: "Dashboard caisse",
  roles: ["pdg", "admin"],
  },
  {
    key: "salesPOS",
    label: "POS Vente",
    roles: ["pdg", "admin"],
  },
  {
    key: "posMenuItems",
    label: "Carte POS",
    roles: ["pdg", "admin"],
  },
  {
    key: "salesHistory",
    label: "Historique ventes",
    roles: ["pdg", "admin", "controle"],
  },
  {
  key: "salesStockMovements",
  label: "Mouvements stock vente",
  roles: ["pdg", "admin", "controle", "stock"],
  },
  {
    key: "cashSessions",
    label: "Ouverture / Clôture caisse",
    roles: ["pdg", "admin", "controle", "stock"],
  },
],
},
  {
    key: "stock",
    label: "Stock",
    title: "Gestion du stock",
    description:
      "Suivi du stock, pertes, inventaires et contrôle des niveaux par dépôt.",
    items: [
      {
        key: "stock",
        label: "Stock",
        roles: ["pdg", "admin", "stock", "cuisine"],
      },
      {
        key: "stockLosses",
        label: "Pertes",
        roles: ["pdg", "admin", "stock", "controle"],
      },
      {
        key: "stockInventories",
        label: "Inventaires",
        roles: ["pdg", "admin", "stock", "controle"],
      },
    ],
  },
  {
    key: "fabrication",
    label: "Fabrication",
    title: "Fabrication",
    description:
      "Création, exécution, suivi en temps réel, bons de sortie cuisine et contrôle des consommations.",
    items: [
      {
        key: "newProduction",
        label: "Fabrication",
        roles: ["pdg", "admin", "cuisine"],
      },
      {
        key: "productionActions",
        label: "Actions fabrication",
        roles: ["pdg", "admin", "cuisine"],
      },
      {
        key: "ProductionLive",
        label: "Fabrication en live",
        roles: ["pdg", "admin", "stock", "controle"],
      },
      {
        key: "recipes",
        label: "Fiches techniques",
        roles: ["pdg", "admin", "stock", "cuisine"],
      },
      {
        key: "kitchenIssues",
        label: "Bon de Sortie Cuisine",
        roles: ["pdg", "admin", "cuisine", "stock"],
      },
      {
        key: "kitchenIssueScanMobile",
        label: "Scan BSC",
        roles: ["pdg", "admin", "cuisine", "stock"],
      },
      {
        key: "kitchenConsumptionScanMobile",
        label: "Scan Cuisine",
        roles: ["pdg", "admin", "stock"],
      },
    ],
  },
  {
    key: "achats",
    label: "Achats",
    title: "Achats",
    description:
      "Saisie des achats, gestion des fournisseurs, documents d’achats et scans de validation.",
    items: [
      {
        key: "purchasePOS",
        label: "Achat POS",
        roles: ["pdg", "admin", "achat", "stock"],
      },
      {
        key: "purchaseDocuments",
        label: "Docs achats",
        roles: ["pdg", "admin", "achat", "stock"],
      },
      {
        key: "suppliers",
        label: "Fournisseurs",
        roles: ["pdg", "admin", "achat", "stock"],
      },
      {
        key: "purchaseDocumentScanMobile",
        label: "Scan Docs Achats",
        roles: ["pdg", "admin", "stock", "achat"],
      },
    ],
  },
  {
    key: "inter-sites",
    label: "Inter-sites",
    title: "Flux inter-sites",
    description:
      "Demandes inter-sites, scans logistiques, suivi transport et contrôle des transferts.",
    items: [
      {
        key: "interSiteRequests",
        label: "Inter-sites",
        roles: ["pdg", "admin", "stock", "controle"],
      },
      {
        key: "transferScanMobile",
        label: "Scan Transfert",
        roles: ["pdg", "admin", "stock", "controle", "chauffeur", "securite"],
      },
      {
        key: "transferTrackingDashboard",
        label: "Suivi Transfert",
        roles: ["pdg", "admin", "stock", "controle", "logistique"],
      },
    ],
  },
  {
    key: "referentiels",
    label: "Référentiels",
    title: "Référentiels",
    description:
      "Configuration des produits, sites, dépôts, zones de stockage et unités.",
    items: [
      {
        key: "productsCatalog",
        label: "Gestion Produits",
        roles: ["pdg", "admin", "stock", "achat"],
      },
      {
        key: "sites",
        label: "Sites",
        roles: ["pdg"],
      },
      {
        key: "warehouses",
        label: "Dépôts",
        roles: ["pdg", "admin"],
      },
      {
        key: "terminals",
        label: "Postes",
        roles: ["pdg", "admin"],
      },
      {
        key: "storageZones",
        label: "Zones stockage",
        roles: ["pdg", "admin", "stock"],
      },
      {
        key: "units",
        label: "Unités",
        roles: ["pdg", "admin"],
      },
    ],
  },
  {
    key: "pilotage",
    label: "Pilotage",
    title: "Pilotage & analyse",
    description:
      "Outils d’analyse, intelligence métier, audit et supervision décisionnelle.",
    items: [
      {
        key: "financeAI",
        label: "IA Trésorerie",
        roles: ["pdg"],
      },
      {
        key: "analytics",
        label: "Analytics",
        roles: ["pdg"],
      },
      {
        key: "auditLogs",
        label: "Journal audit",
        roles: ["pdg", "admin", "controle"],
      },
    ],
  },
  {
    key: "compte",
    label: "Compte",
    title: "Compte & administration",
    description:
      "Gestion des utilisateurs, profil et paramètres d’accès de la plateforme.",
    items: [
      {
        key: "users",
        label: "Utilisateurs",
        roles: ["pdg"],
      },
      {
        key: "profile",
        label: "Profile",
        roles: ["pdg", "admin", "stock", "achat"],
      },
    ],
  },
];

export default function AppLayout({
  user,
  logout,
  activeTerminal,
  page,
  setPage,
  children,
}) {
  const [stockAlertCount, setStockAlertCount] = useState(0);
  const [pendingTransferCount, setPendingTransferCount] = useState(0);
  const [siteName, setSiteName] = useState("Chargement...");
  const [mainSite, setMainSite] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const loadMainData = async () => {
      try {
        const [sitesRes, pendingRes, stockRes] = await Promise.allSettled([
          api.get("/sites"),
          api.get("/inter-site-requests/pending-count"),
          api.get("/dashboard/stock/alert-count"),
        ]);

        const allSites =
          sitesRes.status === "fulfilled"
            ? sitesRes.value.data?.data ?? sitesRes.value.data ?? []
            : [];

        const defaultSite = allSites.find((s) => s.is_default) || allSites[0] || null;
        const userSite = user?.site_id
          ? allSites.find((s) => Number(s.id) === Number(user.site_id))
          : null;

        const displaySite = userSite || defaultSite || null;

        setMainSite(displaySite);

        if (userSite) {
          setSiteName(userSite.name || "Site inconnu");
        } else {
          setSiteName(
            defaultSite?.name ? `Tous les sites · ${defaultSite.name}` : "Tous les sites"
          );
        }

        if (pendingRes.status === "fulfilled") {
          setPendingTransferCount(pendingRes.value.data?.count ?? 0);
        }

        if (stockRes.status === "fulfilled") {
          setStockAlertCount(stockRes.value.data?.count ?? 0);
        }
      } catch (err) {
        console.error("Erreur AppLayout:", err);
        setSiteName("Erreur site");
      }
    };

    loadMainData();
  }, [user]);

  const groupedNav = useMemo(() => {
    return MENU_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(user?.role)),
    })).filter((group) => group.items.length > 0);
  }, [user]);

  const currentGroup = useMemo(() => {
    return (
      groupedNav.find((group) => group.items.some((item) => item.key === page)) ||
      groupedNav[0] ||
      null
    );
  }, [groupedNav, page]);

  const currentItem = useMemo(() => {
    if (!currentGroup) return null;
    return currentGroup.items.find((item) => item.key === page) || currentGroup.items[0] || null;
  }, [currentGroup, page]);

  useEffect(() => {
    if (!groupedNav.length) return;

    const pageExists = groupedNav.some((group) =>
      group.items.some((item) => item.key === page)
    );

    if (!pageExists) {
      setPage(groupedNav[0].items[0].key);
    }
  }, [groupedNav, page, setPage]);

  const handleGroupClick = (group) => {
    if (!group?.items?.length) return;
    setPage(group.items[0].key);
    setMobileMenuOpen(false);
  };

  const handleSubmenuClick = (itemKey) => {
    setPage(itemKey);
    setMobileMenuOpen(false);
  };

  const getGroupBadge = (groupKey) => {
    if (groupKey === "inter-sites" && pendingTransferCount > 0) {
      return pendingTransferCount;
    }

    if ((groupKey === "dashboard" || groupKey === "stock") && stockAlertCount > 0) {
      return stockAlertCount;
    }

    return 0;
  };

  const avatarUrl = buildAssetUrl(user?.avatar_url || user?.avatar_path || "");
  const logoUrl = buildAssetUrl(
    mainSite?.logo_url || mainSite?.logo_path || mainSite?.logo || ""
  );

  const sidebar = (
    <aside className="flex h-full w-[290px] flex-col bg-slate-950 text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={mainSite?.name || "Site"}
              className="h-12 w-12 rounded-2xl border border-white/10 bg-white object-cover"
              onError={(e) => {
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  mainSite?.name || "DR"
                )}&background=0f172a&color=ffffff`;
              }}
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-sm font-bold">
              {getInitials(mainSite?.name || "Dragon")}
            </div>
          )}

          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-white">
              {mainSite?.name || "Dragon ERP"}
            </h1>
            <p className="truncate text-xs text-slate-300">
              {mainSite?.type_site || "Gestion stock & opérations"}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Navigation
        </div>

        <nav className="space-y-2">
          {groupedNav.map((group) => {
            const active = currentGroup?.key === group.key;
            const badge = getGroupBadge(group.key);

            return (
              <button
                key={group.key}
                onClick={() => handleGroupClick(group)}
                className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                  active
                    ? "bg-white text-slate-950 shadow-lg"
                    : "bg-white/5 text-slate-100 hover:bg-white/10"
                }`}
              >
                <span>{group.label}</span>

                {badge > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      group.key === "inter-sites"
                        ? "bg-red-600 text-white"
                        : "bg-amber-500 text-white"
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-white/10 px-5 py-4">
        <div className="rounded-2xl bg-white/5 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Connecté</div>
          <div className="mt-2 text-sm font-semibold text-white">
            {user?.name || user?.email || "Utilisateur"}
          </div>
          <div className="mt-1 text-xs text-slate-300">{user?.role || "-"}</div>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <div className="hidden xl:block xl:sticky xl:top-0 xl:h-screen xl:shrink-0 xl:shadow-2xl">
          {sidebar}
        </div>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 xl:hidden">
            <div
              className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full shadow-2xl">{sidebar}</div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
<header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
  <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        {/* Bouton Mobile optimisé */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 xl:hidden"
          aria-label="Ouvrir le menu"
        >
          ☰
        </button>

        <div className="min-w-0">
          {/* Ligne des Badges - Plus compacte */}
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              {currentGroup?.label || "Menu"}
            </span>
            {currentItem?.label && (
              <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
                {currentItem.label}
              </span>
            )}
          </div>

          {/* Titre - Un peu plus fin pour gagner de la place */}
          <h2 className="truncate text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
            {currentGroup?.title || mainSite?.name || "Tableau de bord"}
          </h2>

          {/* Description - Réduite en marge */}
          <p className="mt-0.5 max-w-2xl truncate text-xs leading-relaxed text-slate-500">
            {currentGroup?.description || "Plateforme centralisée de gestion opérationnelle."}
          </p>

          {/* Infos secondaires - Plus discrètes */}
<div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
  <div className="flex items-center gap-1">
    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
    <span className="font-medium text-slate-600">
      Site : {activeTerminal?.site_name || siteName}
    </span>
  </div>

  {(user?.warehouse?.name || activeTerminal?.warehouse_name) && (
    <>
      <span className="hidden sm:inline opacity-30">|</span>
      <span className="truncate">
        Dépôt : {user?.warehouse?.name || activeTerminal?.warehouse_name}
      </span>
    </>
  )}

  {activeTerminal?.name && (
    <>
      <span className="hidden sm:inline opacity-30">|</span>
      <span className="truncate">
        Poste : {activeTerminal.name}
        {activeTerminal.code ? ` (${activeTerminal.code})` : ""}
      </span>
    </>
  )}

  <span className="hidden sm:inline opacity-30">|</span>
  <span className="truncate">
    {user?.name || user?.email} • <span className="italic">{user?.role}</span>
  </span>
</div>
        </div>
      </div>

      {/* Bloc Utilisateur Droite (Desktop) */}
      <div className="hidden shrink-0 items-center gap-3 sm:flex">
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-1.5 pr-3 shadow-sm">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={user?.name || "Avatar"}
              className="h-9 w-9 rounded-lg object-cover shadow-sm"
              onError={(e) => {
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || "User")}&background=e2e8f0&color=0f172a`;
              }}
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-200 text-xs font-bold text-slate-700">
              {getInitials(user?.name || user?.email || "U")}
            </div>
          )}

<div className="text-right">
  <div className="max-w-[150px] truncate text-xs font-bold text-slate-800">
    {user?.name || user?.email}
  </div>
  <div className="text-[10px] font-medium uppercase tracking-tighter text-slate-400">
    {user?.role}
  </div>
  {activeTerminal?.name && (
    <div className="max-w-[170px] truncate text-[10px] text-emerald-600">
      {activeTerminal.name}
      {activeTerminal.code ? ` • ${activeTerminal.code}` : ""}
    </div>
  )}
</div>
        </div>

        <button
          onClick={logout}
          className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-red-700 active:scale-95"
        >
          Déconnexion
        </button>
      </div>
    </div>

    {/* Menu Horizontal (Submenu) - Plus élégant */}
    {currentGroup?.items?.length > 0 && (
      <div className="mt-1 overflow-x-auto pb-1">
        <div className="flex min-w-max gap-1.5 rounded-xl bg-slate-100/50 p-1">
          {currentGroup.items.map((item) => {
            const isActive = page === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleSubmenuClick(item.key)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-black/5"
                    : "text-slate-500 hover:bg-white/60 hover:text-slate-800"
                }`}
              >
                <span>{item.label}</span>
                {(item.key === "interSiteRequests" && pendingTransferCount > 0) && (
                  <span className="animate-pulse rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] text-white">
                    {pendingTransferCount}
                  </span>
                )}
                {((item.key === "stockDashboardSite" || item.key === "stockDashboardGlobal") && stockAlertCount > 0) && (
                  <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] text-white">
                    {stockAlertCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    )}

    {/* Profil Mobile (visible uniquement sur mobile) - Épuré */}
<div className="flex items-center justify-between border-t border-slate-100 pt-2 sm:hidden">
  <div className="flex min-w-0 flex-col gap-0.5">
    <div className="flex items-center gap-2">
      <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
      <span className="truncate text-[10px] font-bold uppercase text-slate-600">
        {activeTerminal?.site_name || siteName}
      </span>
    </div>

    {activeTerminal?.name && (
      <div className="truncate text-[10px] text-emerald-600">
        Poste : {activeTerminal.name}
        {activeTerminal.code ? ` (${activeTerminal.code})` : ""}
      </div>
    )}
  </div>

  <button
    onClick={logout}
    className="text-[10px] font-black uppercase text-red-600"
  >
    Déconnexion
  </button>
</div>
  </div>
</header>
          <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1800px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}