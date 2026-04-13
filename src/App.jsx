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

const SCAN_PAGES = new Set([
  "transferScanMobile",
  "purchaseDocumentScanMobile",
  "kitchenConsumptionScanMobile",
  "kitchenIssueScanMobile",
]);

function getPageFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return (
    params.get("page") ||
    params.get("open_page") ||
    "stockDashboardSite"
  );
}

export default function App() {
  const { isAuthenticated, loading, logout, user } = useAuth();
  const [page, setPage] = useState(getPageFromUrl);

  useEffect(() => {
    const syncFromUrl = () => {
      const nextPage = getPageFromUrl();
      if (nextPage) {
        setPage(nextPage);
      }
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);

    return () => {
      window.removeEventListener("popstate", syncFromUrl);
    };
  }, []);

  useEffect(() => {
    const handler = (event) => {
      const detail = event.detail;

      if (!detail) return;

      if (typeof detail === "string") {
        setPage(detail);
        return;
      }

      if (typeof detail === "object" && detail.page) {
        const params = new URLSearchParams(window.location.search);
        params.set("page", detail.page);
        params.delete("open_page");

        if (detail.scan_token) {
          params.set("scan_token", detail.scan_token);
        } else if (!SCAN_PAGES.has(detail.page)) {
          params.delete("scan_token");
        }

        const nextUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, "", nextUrl);
        setPage(detail.page);
      }
    };

    window.addEventListener("open-page", handler);
    return () => window.removeEventListener("open-page", handler);
  }, []);

  useEffect(() => {
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

  function renderPage() {
    if (page === "dashboard") return <Dashboard />;
    if (page === "stockDashboardSite") return <StockDashboardSite />;
    if (page === "stockDashboardGlobal") return <StockDashboardGlobal />;

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

    return <StockDashboardSite />;
  }

  if (loading) {
    return <div className="p-6">Chargement...</div>;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <AppLayout user={user} logout={logout} page={page} setPage={setPage}>
      {renderPage()}
    </AppLayout>
  );
}