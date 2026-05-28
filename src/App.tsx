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

import LoginPage from "./pages/Login/LoginPage";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import ProtectedRoute from "./core/router/ProtectedRoute";
import ModuloRoute from "./core/router/ModuloRoute";

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
    </Routes>
  );
}

export default App;