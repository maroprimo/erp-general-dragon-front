import { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Stock from "./pages/Stock";
import ProductionLive from "./pages/ProductionLive";
import AIAssistant from "./pages/AIAssistant";
import Purchases from "./pages/Purchases";
import Transfers from "./pages/Transfers";
import NewPurchase from "./pages/NewPurchase";
import NewTransfer from "./pages/NewTransfer";
import NewProductionOrder from "./pages/NewProductionOrder";
import ProductionActions from "./pages/ProductionActions";
import AIActions from "./pages/AIActions";
import Users from "./pages/Users";
import AuditLogs from "./pages/AuditLogs";
import AppLayout from "./components/AppLayout";
import Analytics from "./pages/Analytics";
import StockLosses from "./pages/StockLosses";
import StockInventories from "./pages/StockInventories";
import FinanceDashboard from "./pages/FinanceDashboard";
import FinanceAI from "./pages/FinanceAI";
import ReceivePurchase from "./pages/ReceivePurchase";
import ProductionFinish from "./pages/ProductionFinish";
import TransferValidation from "./pages/TransferValidation";
import Suppliers from "./pages/Suppliers";
import Sites from "./pages/Sites";
import Recipes from "./pages/Recipes";
import PurchasePOS from "./pages/PurchasePOS";
import InterSiteRequests from "./pages/InterSiteRequests";
import PurchaseDocuments from "./pages/PurchaseDocuments";
import StockDashboardSite from "./pages/StockDashboardSite";
import StockDashboardGlobal from "./pages/StockDashboardGlobal";
import ProductsCatalog from "./pages/ProductsCatalog";
import Profile from "./pages/Profile";
import TransferScanMobile from "./pages/TransferScanMobile";
import TransferTrackingDashboard from "./pages/TransferTrackingDashboard";
import Warehouses from "./pages/Warehouses";
import StorageZones from "./pages/StorageZones";
import Units from "./pages/Units";
import PurchaseDocumentScanMobile from "./pages/PurchaseDocumentScanMobile";
import KitchenConsumptionScanMobile from "./pages/KitchenConsumptionScanMobile";
import KitchenIssues from "./pages/KitchenIssues";
import KitchenIssueScanMobile from "./pages/KitchenIssueScanMobile";
import Terminals from "./pages/Terminals";
import SalesPOS from "./pages/SalesPOS";
import PosMenuItems from "./pages/PosMenuItems";
import SalesHistory from "./pages/SalesHistory";
import CashSessions from "./pages/CashSessions";
import CashDashboard from "./pages/CashDashboard";

const PAGE_ACCESS = {
  dashboard: ["pdg", "admin"],
  stockDashboardSite: ["pdg", "admin", "stock", "controle"],
  stockDashboardGlobal: ["pdg"],
  terminals: ["pdg", "admin"],
  salesPOS: ["pdg", "admin"],
  posMenuItems: ["pdg", "admin"],
  salesHistory: ["pdg", "admin", "controle"],
  cashSessions: ["pdg", "admin", "controle", "stock"],

  stock: ["pdg", "admin", "stock", "cuisine"],
  stockLosses: ["pdg", "admin", "stock", "controle"],
  stockInventories: ["pdg", "admin", "stock", "controle"],

  ProductionLive: ["pdg", "admin", "stock", "controle", "cuisine"],
  newProduction: ["pdg", "admin", "cuisine", "stock"],
  productionActions: ["pdg", "admin", "cuisine"],
  productionFinish: ["pdg", "admin", "cuisine"],
  recipes: ["pdg", "admin", "stock"],
  kitchenIssues: ["pdg", "admin", "cuisine", "stock"],
  kitchenIssueScanMobile: ["pdg", "admin", "cuisine", "stock"],
  kitchenConsumptionScanMobile: ["pdg", "admin", "stock"],

  purchasePOS: ["pdg", "admin", "achat", "stock"],
  purchaseDocuments: ["pdg", "admin", "achat", "stock"],
  purchaseDocumentScanMobile: ["pdg", "admin", "stock", "achat"],
  purchases: ["pdg", "admin", "achat", "stock"],
  newPurchase: ["pdg", "admin", "achat", "stock"],
  receivePurchase: ["pdg", "admin", "achat", "stock"],
  suppliers: ["pdg", "admin", "achat", "stock"],

  transfers: ["pdg", "admin", "stock"],
  newTransfer: ["pdg", "admin", "stock"],
  transferValidation: ["pdg", "admin", "stock", "controle"],
  interSiteRequests: ["pdg", "admin", "stock", "controle"],
  transferScanMobile: ["pdg", "admin", "stock", "controle", "chauffeur", "securite"],
  transferTrackingDashboard: ["pdg", "admin", "stock", "controle", "logistique"],

  productsCatalog: ["pdg", "admin", "stock", "achat"],
  sites: ["pdg"],
  warehouses: ["pdg", "admin", "stock"],
  storageZones: ["pdg", "admin", "stock"],
  units: ["pdg", "admin", "stock"],

  users: ["pdg"],
  profile: ["pdg", "admin", "stock", "achat"],
  auditLogs: ["pdg"],

  finance: ["pdg"],
  financeAI: ["pdg"],
  analytics: ["pdg"],

  ia: ["pdg", "admin"],
  aiActions: ["pdg", "admin"],
};

const SCAN_PAGES = new Set([
  "transferScanMobile",
  "purchaseDocumentScanMobile",
  "kitchenConsumptionScanMobile",
  "kitchenIssueScanMobile",
]);

const DEFAULT_PAGE_BY_ROLE = {
  pdg: "stockDashboardGlobal",
  admin: "stockDashboardSite",
  stock: "stockDashboardSite",
  controle: "stockDashboardSite",
  cuisine: "kitchenIssues",
  achat: "purchasePOS",
  securite: "transferScanMobile",
  chauffeur: "transferScanMobile",
  logistique: "transferTrackingDashboard",
};

function getDefaultPageForRole(role) {
  return DEFAULT_PAGE_BY_ROLE[role] || "profile";
}

function isPageAllowedForRole(page, role) {
  const allowedRoles = PAGE_ACCESS[page];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
}

function getRequestedPageFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("page") || params.get("open_page") || null;
}

export default function App() {
const { isAuthenticated, loading, logout, user, activeTerminal } = useAuth();
  const [page, setPage] = useState(null);

  useEffect(() => {
    const handler = (event) => {
      const detail = event.detail;
      if (!detail) return;

      if (typeof detail === "string") {
        if (user?.role && isPageAllowedForRole(detail, user.role)) {
          setPage(detail);
        } else if (user?.role) {
          setPage(getDefaultPageForRole(user.role));
        }
        return;
      }

      if (typeof detail === "object" && detail.page) {
        const targetPage =
          user?.role && isPageAllowedForRole(detail.page, user.role)
            ? detail.page
            : getDefaultPageForRole(user?.role);

        const params = new URLSearchParams(window.location.search);
        params.set("page", targetPage);
        params.delete("open_page");

        if (detail.scan_token) {
          params.set("scan_token", detail.scan_token);
        } else if (!SCAN_PAGES.has(targetPage)) {
          params.delete("scan_token");
        }

        const nextUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, "", nextUrl);
        setPage(targetPage);
      }
    };

    window.addEventListener("open-page", handler);
    return () => window.removeEventListener("open-page", handler);
  }, [user]);

  useEffect(() => {
    if (!user?.role) return;

    const requestedPage = getRequestedPageFromUrl();
    const safePage =
      requestedPage && isPageAllowedForRole(requestedPage, user.role)
        ? requestedPage
        : getDefaultPageForRole(user.role);

    setPage(safePage);
  }, [user]);

  useEffect(() => {
    if (!page) return;

    const params = new URLSearchParams(window.location.search);
    params.set("page", page);
    params.delete("open_page");

    if (!SCAN_PAGES.has(page)) {
      params.delete("scan_token");
    }

    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (currentUrl !== nextUrl) {
      window.history.replaceState({}, "", nextUrl);
    }
  }, [page]);

  useEffect(() => {
    const syncFromUrl = () => {
      if (!user?.role) return;

      const requestedPage = getRequestedPageFromUrl();
      const safePage =
        requestedPage && isPageAllowedForRole(requestedPage, user.role)
          ? requestedPage
          : getDefaultPageForRole(user.role);

      setPage(safePage);
    };

    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [user]);

  function renderPage() {
    if (page === "dashboard") return <Dashboard />;
    if (page === "salesPOS") return <SalesPOS />;
    if (page === "posMenuItems") return <PosMenuItems />;
    if (page === "salesHistory") return <SalesHistory />;
    if (page === "cashSessions") return <CashSessions />;
    if (page === "stockDashboardSite") return <StockDashboardSite />;
    if (page === "stockDashboardGlobal") return <StockDashboardGlobal />;
    if (page === "cashDashboard") return <CashDashboard />;

    if (page === "stock") return <Stock />;
    if (page === "stockLosses") return <StockLosses />;
    if (page === "stockInventories") return <StockInventories />;

    if (page === "ProductionLive") return <ProductionLive />;
    if (page === "newProduction") return <NewProductionOrder />;
    if (page === "productionActions") return <ProductionActions />;
    if (page === "productionFinish") return <ProductionFinish />;
    if (page === "recipes") return <Recipes />;
    if (page === "kitchenIssues") return <KitchenIssues />;
    if (page === "kitchenIssueScanMobile") return <KitchenIssueScanMobile />;
    if (page === "kitchenConsumptionScanMobile") return <KitchenConsumptionScanMobile />;

    if (page === "purchasePOS") return <PurchasePOS />;
    if (page === "purchaseDocuments") return <PurchaseDocuments />;
    if (page === "purchaseDocumentScanMobile") return <PurchaseDocumentScanMobile />;
    if (page === "purchases") return <Purchases />;
    if (page === "newPurchase") return <NewPurchase />;
    if (page === "receivePurchase") return <ReceivePurchase />;
    if (page === "suppliers") return <Suppliers />;

    if (page === "transfers") return <Transfers />;
    if (page === "newTransfer") return <NewTransfer />;
    if (page === "transferValidation") return <TransferValidation />;
    if (page === "interSiteRequests") return <InterSiteRequests />;
    if (page === "transferScanMobile") return <TransferScanMobile />;
    if (page === "transferTrackingDashboard") return <TransferTrackingDashboard />;

    if (page === "productsCatalog") return <ProductsCatalog />;
    if (page === "sites") return <Sites />;
    if (page === "warehouses") return <Warehouses />;
    if (page === "terminals") return <Terminals />;
    if (page === "storageZones") return <StorageZones />;
    if (page === "units") return <Units />;

    if (page === "users") return <Users />;
    if (page === "profile") return <Profile />;
    if (page === "auditLogs") return <AuditLogs />;

    if (page === "finance") return <FinanceDashboard />;
    if (page === "financeAI") return <FinanceAI />;
    if (page === "analytics") return <Analytics />;

    if (page === "ia") return <AIAssistant />;
    if (page === "aiActions") return <AIActions />;

    return <Profile />;
  }

  if (loading || (isAuthenticated && !page)) {
    return <div className="p-6">Chargement...</div>;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
<AppLayout
  user={user}
  logout={logout}
  activeTerminal={activeTerminal}
  page={page}
  setPage={setPage}
>
  {renderPage()}
</AppLayout>
  );
}
