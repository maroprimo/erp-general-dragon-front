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

export default function App() {
  useEffect(() => {
    const handler = (event) => {
      if (event.detail) {
        setPage(event.detail);
      }
    };

    window.addEventListener("open-page", handler);
    return () => window.removeEventListener("open-page", handler);
  }, []);

  const { isAuthenticated, loading, logout, user } = useAuth();
  const [page, setPage] = useState("dashboard");

  if (loading) {
    return <div className="p-6">Chargement...</div>;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  let content = <StockDashboardSite />;

  if (page === "stock") content = <Stock />;
  if (page === "ProductionLive") content = <ProductionLive />; //  Changé "production" en "ProductionLive"
  if (page === "ia") content = <AIAssistant />;
  if (page === "purchases") content = <Purchases />;
  if (page === "transfers") content = <Transfers />;
  if (page === "newPurchase") content = <NewPurchase />;
  if (page === "newTransfer") content = <NewTransfer />;
  if (page === "newProduction") content = <NewProductionOrder />;
  if (page === "productionActions") content = <ProductionActions />;
  if (page === "aiActions") content = <AIActions />;
  if (page === "users") content = <Users />;
  if (page === "auditLogs") content = <AuditLogs />;
  if (page === "analytics") content = <Analytics />;
  if (page === "stockLosses") content = <StockLosses />;
  if (page === "stockInventories") content = <StockInventories />;
  if (page === "finance") content = <FinanceDashboard />;
  if (page === "financeAI") content = <FinanceAI />;
  if (page === "receivePurchase") content = <ReceivePurchase />;
  if (page === "productionFinish") content = <ProductionFinish />;
  if (page === "transferValidation") content = <TransferValidation />;
  if (page === "suppliers") content = <Suppliers />;
  if (page === "sites") content = <Sites />;
  if (page === "recipes") content = <Recipes />;
  if (page === "purchasePOS") content = <PurchasePOS />;
  if (page === "interSiteRequests") content = <InterSiteRequests />;
  if (page === "purchaseDocuments") content = <PurchaseDocuments />;
  if (page === "stockDashboardSite") content = <StockDashboardSite />;
  if (page === "stockDashboardGlobal") content = <StockDashboardGlobal />;
  return (
    <AppLayout user={user} logout={logout} page={page} setPage={setPage}>
      {content}
    </AppLayout>
  );
}