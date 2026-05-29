import { Routes, Route } from "react-router-dom";
import CompaniesPage from "./pages/companies/CompaniesPage";
import BranchesPage from "./pages/branches/BranchesPage";
import UsersPage from "./pages/users/UsersPage";
import RolesPage from "./pages/roles/RolesPage";
import BanksPage from "./pages/banks/BanksPage";
import MovementsPage from "./pages/movements/MovementsPage";
import TransfersPage from "./pages/transfers/TransfersPage";
import ReportsPage from "./pages/reports/ReportsPage";
import TreasuryPage from "./pages/treasury/TreasuryPage";
import ReconciliationPage from "./pages/reconciliation/ReconciliationPage";
import AdministrationPage from "./pages/administration/AdministrationPage";
import SettingsPage from "./pages/settings/SettingsPage";
import PosConfigPage from "./pages/pos-config/PosConfigPage";
import SuppliersPage from "./pages/suppliers/SuppliersPage";
import PurchasesPage from "./pages/purchases/PurchasesPage";
import CostsPage from "./pages/costs/CostsPage";

import LoginPage from "./pages/Login/LoginPage";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import ProtectedRoute from "./core/router/ProtectedRoute";
import ModuloRoute from "./core/router/ModuloRoute";

// Páginas de SOPORTE
import SoporteDashboard from "./pages/soporte/SoporteDashboard";
import GestionClientes from "./pages/soporte/GestionClientes";
import PlanesModulos from "./pages/soporte/PlanesModulos";
import Monitoreo from "./pages/soporte/Monitoreo";
import ConfiguracionGlobal from "./pages/soporte/ConfiguracionGlobal";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/companies"
        element={
          <ProtectedRoute>
            <ModuloRoute modulo="empresas">
              <CompaniesPage />
            </ModuloRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/branches"
        element={
          <ProtectedRoute>
            <ModuloRoute modulo="sucursales">
              <BranchesPage />
            </ModuloRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <ModuloRoute modulo="usuarios">
              <UsersPage />
            </ModuloRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/roles"
        element={
          <ProtectedRoute>
            <ModuloRoute modulo="usuarios">
              <RolesPage />
            </ModuloRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/banks"
        element={
          <ProtectedRoute>
            <ModuloRoute modulo="bancos">
              <BanksPage />
            </ModuloRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/movements"
        element={
          <ProtectedRoute>
            <ModuloRoute modulo="movimientos">
              <MovementsPage />
            </ModuloRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/transfers"
        element={
          <ProtectedRoute>
            <ModuloRoute modulo="transferencias">
              <TransfersPage />
            </ModuloRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ModuloRoute modulo="reportes">
              <ReportsPage />
            </ModuloRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/treasury"
        element={
          <ProtectedRoute>
            <ModuloRoute modulo="tesoreria">
              <TreasuryPage />
            </ModuloRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/reconciliation"
        element={
          <ProtectedRoute>
            <ModuloRoute modulo="conciliacion">
              <ReconciliationPage />
            </ModuloRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/administration"
        element={
          <ProtectedRoute>
            <ModuloRoute modulo="administracion">
              <AdministrationPage />
            </ModuloRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <ModuloRoute modulo="configuracion">
              <SettingsPage />
            </ModuloRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/pos-config"
        element={
          <ProtectedRoute>
            <ModuloRoute modulo="configuracion-pos">
              <PosConfigPage />
            </ModuloRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/suppliers"
        element={
          <ProtectedRoute>
            <ModuloRoute modulo="proveedores">
              <SuppliersPage />
            </ModuloRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/purchases"
        element={
          <ProtectedRoute>
            <ModuloRoute modulo="compras">
              <PurchasesPage />
            </ModuloRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/costs"
        element={
          <ProtectedRoute>
            <ModuloRoute modulo="costos">
              <CostsPage />
            </ModuloRoute>
          </ProtectedRoute>
        }
      />

      {/* Rutas de SOPORTE - Solo accesibles para rol SOPORTE */}
      <Route
        path="/soporte/dashboard"
        element={
          <ProtectedRoute>
            <SoporteDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/soporte/clientes"
        element={
          <ProtectedRoute>
            <GestionClientes />
          </ProtectedRoute>
        }
      />

      <Route
        path="/soporte/planes"
        element={
          <ProtectedRoute>
            <PlanesModulos />
          </ProtectedRoute>
        }
      />

      <Route
        path="/soporte/monitoreo"
        element={
          <ProtectedRoute>
            <Monitoreo />
          </ProtectedRoute>
        }
      />

      <Route
        path="/soporte/config"
        element={
          <ProtectedRoute>
            <ConfiguracionGlobal />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;