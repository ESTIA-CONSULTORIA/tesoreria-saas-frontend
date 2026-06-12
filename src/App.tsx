import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
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
import SuppliersPage from "./pages/suppliers/SuppliersPage";
import PurchasesPage from "./pages/purchases/PurchasesPage";
import CostsPage from "./pages/costs/CostsPage";
import LogsPage from "./pages/administration/LogsPage";
import ESTIAExecutiveAccess from "./pages/mobile-analytics/MobileAnalyticsApp";
import POSPage from "./pages/pos/POSPage";
import OCRPage from "./pages/ocr/OCRPage";
import HRPage from "./pages/hr/HRPage";

import LoginPage from "./pages/Login/LoginPage";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import LoginConfigPage from "./pages/settings/LoginConfigPage";
import ProtectedRoute from "./core/router/ProtectedRoute";
import ModuloRoute from "./core/router/ModuloRoute";
import { useAuthStore } from "./core/store/useAuthStore";
import { api } from "./core/api/api";

// Páginas de SOPORTE
import SoporteDashboard from "./pages/soporte/SoporteDashboard";
import GestionClientes from "./pages/soporte/GestionClientes";
import PlanesModulos from "./pages/soporte/PlanesModulos";
import Monitoreo from "./pages/soporte/Monitoreo";
import ConfiguracionGlobal from "./pages/soporte/ConfiguracionGlobal";

function App() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const user = useAuthStore((state) => state.user);
  const tenantId = useAuthStore((state) => state.tenantId);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const applyTheme = async () => {
      if (tenantId) {
        try {
          const res = await api.get(`/tenant-settings/${tenantId}`);
          const config = res.data;
          if (config) {
            if (config.primaryColor) {
              document.documentElement.style.setProperty('--color-primary', config.primaryColor);
            }
            if (config.secondaryColor) {
              document.documentElement.style.setProperty('--color-secondary', config.secondaryColor);
            }
            if (config.accentColor) {
              document.documentElement.style.setProperty('--color-accent', config.accentColor);
            }
            if (config.fontFamily) {
              document.documentElement.style.setProperty('--font-family', config.fontFamily);
            }
            if (config.customCSS) {
              const style = document.createElement('style');
              style.textContent = config.customCSS;
              document.head.appendChild(style);
            }
          }
        } catch (error) {
          console.error('Error loading tenant theme:', error);
        }
      }
    };
    applyTheme();
  }, [tenantId]);

  // Si es móvil y el usuario tiene rol permitido, mostrar ESTIAExecutiveAccess
  if (isMobile && user) {
    const allowedRoles = ['ADMIN', 'SOPORTE', 'GERENTE', 'SUPER_ADMIN'];
    if (allowedRoles.includes(user.roleCode || '')) {
      return <ESTIAExecutiveAccess />;
    }
    // Si el rol no es permitido en móvil, mostrar mensaje
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white text-lg mb-2">Acceso restringido en móvil</p>
          <p className="text-slate-400">Accede desde una computadora para usar el sistema</p>
        </div>
      </div>
    );
  }

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
        path="/logs"
        element={
          <ProtectedRoute>
            <ModuloRoute modulo="administracion">
              <LogsPage />
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
        path="/settings/login-config"
        element={
          <ProtectedRoute>
            <ModuloRoute modulo="configuracion">
              <LoginConfigPage />
            </ModuloRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/pos"
        element={
          <ProtectedRoute>
            <POSPage />
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

      <Route
        path="/ocr"
        element={
          <ProtectedRoute>
            <OCRPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr"
        element={
          <ProtectedRoute>
            <HRPage />
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