import { Routes, Route } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
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
import IntegrationsPage from "./pages/integrations/IntegrationsPage";
import EmployeeLogin from "./pages/employee/EmployeeLogin";
import EmployeeHome from "./pages/employee/EmployeeHome";
import EmployeeRequests from "./pages/employee/EmployeeRequests";
import EmployeeDocuments from "./pages/employee/EmployeeDocuments";
import EmployeeProfile from "./pages/employee/EmployeeProfile";
import OnboardingWizard from "./components/OnboardingWizard";
import PatientsPage from "./pages/patients/PatientsPage";
import SolutionsCenter from "./pages/solutions/SolutionsCenter";

import LoginPage from "./pages/Login/LoginPage";
import ExecutivePage from "./pages/executive/ExecutivePage";
import CorteCajaLite from "./pages/lite/CorteCajaLite";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import DashboardLite from "./pages/Dashboard/DashboardLite";
import LoginConfigPage from "./pages/settings/LoginConfigPage";
import AppearancePage from "./pages/settings/AppearancePage";
import CorteFieldsConfig from "./pages/settings/CorteFieldsConfig";
import ProtectedRoute from "./core/router/ProtectedRoute";
import ModuloRoute from "./core/router/ModuloRoute";
import { useAuthStore } from "./core/store/useAuthStore";
import { useBrandingStore } from "./core/store/useBrandingStore";
import { SplashScreen } from "./components/SplashScreen";
import { OutroSplash } from "./components/OutroSplash";
import { NoContextBanner } from "./core/components/NoContextBanner";
import TopBar from "./core/layout/TopBar";
import { api } from "./core/api/api";

// Páginas de SOPORTE
import SoporteDashboard from "./pages/soporte/SoporteDashboard";
import GestionClientes from "./pages/soporte/GestionClientes";
import PlanesModulos from "./pages/soporte/PlanesModulos";
import Monitoreo from "./pages/soporte/Monitoreo";
import ConfiguracionGlobal from "./pages/soporte/ConfiguracionGlobal";

function DashboardRouter() {
  const modulosActivos = useAuthStore(s => s.modulosActivos);
  const isLite = modulosActivos.includes('corte-caja-lite') || modulosActivos.includes('pos-sin-inventario');
  return isLite ? <DashboardLite /> : <DashboardPage />;
}

function App() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showWizard, setShowWizard] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [showOutroSplash, setShowOutroSplash] = useState(false);
  const user = useAuthStore((state) => state.user);
  const tenantId = useAuthStore((state) => state.tenantId);
  const logoutTrigger = useAuthStore((state) => state.logoutTrigger);
  const loadBranding = useBrandingStore((state) => state.load);
  const fontFamily = useBrandingStore((state) => state.fontFamily);
  const prevUserRef = useRef(user);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (user) loadBranding();
  }, [user, loadBranding]);

  // Mostrar splash solo en login fresco (no en refresco de página)
  useEffect(() => {
    if (!prevUserRef.current && user) {
      setShowSplash(true);
    }
    prevUserRef.current = user;
  }, [user]);

  useEffect(() => {
    if (logoutTrigger) {
      setShowOutroSplash(true);
      useAuthStore.getState().clearLogoutTrigger();
    }
  }, [logoutTrigger]);

  // Cargar Google Font dinámicamente cuando cambie fontFamily
  useEffect(() => {
    if (fontFamily && fontFamily !== 'Inter') {
      const id = `gfont-${fontFamily.replace(/ /g, '-')}`;
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@300;400;500;600&display=swap`;
        document.head.appendChild(link);
      }
      document.body.style.fontFamily = `'${fontFamily}', sans-serif`;
    } else {
      document.body.style.fontFamily = '';
    }
  }, [fontFamily]);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user || !tenantId) return;
      if (user.roleCode === 'SOPORTE') return;
      try {
        const res = await api.get(`/tenants/${tenantId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
        });
        if (res.data && res.data.isOnboarded === false) {
          const companiesRes = await api.get(`/companies`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
          });
          const companies = companiesRes.data ?? [];
          if (companies.length === 0) {
            setShowWizard(true);
          }
        }
      } catch {
        // silently skip
      }
    };
    checkOnboarding();
  }, [user, tenantId]);

  useEffect(() => {
    const applyTheme = async () => {
      if (tenantId) {
        try {
          const res = await api.get(`/tenant-settings/${tenantId}`, { timeout: 5000 });
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
    <>
    {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
    {showOutroSplash && (
      <OutroSplash onDone={() => {
        setShowOutroSplash(false);
        useAuthStore.getState().logout();
      }} />
    )}
    {showWizard && (
      <OnboardingWizard onComplete={() => setShowWizard(false)} />
    )}
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/executive" element={<ExecutivePage />} />
      <Route path="/corte" element={<CorteCajaLite />} />
      <Route path="/" element={
        <ProtectedRoute>
          <TopBar />
          <NoContextBanner />
        </ProtectedRoute>
      } />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardRouter />
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
        path="/settings/appearance"
        element={
          <ProtectedRoute>
            <ModuloRoute modulo="configuracion">
              <AppearancePage />
            </ModuloRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings/corte-fields"
        element={
          <ProtectedRoute>
            <CorteFieldsConfig />
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

      <Route
        path="/integrations"
        element={
          <ProtectedRoute>
            <ModuloRoute modulo="integraciones">
              <IntegrationsPage />
            </ModuloRoute>
          </ProtectedRoute>
        }
      />

      {/* Portal del Empleado — rutas sin ProtectedRoute */}
      <Route path="/employee" element={<EmployeeLogin />} />
      <Route path="/employee/home" element={<EmployeeHome />} />
      <Route path="/employee/requests" element={<EmployeeRequests />} />
      <Route path="/employee/documents" element={<EmployeeDocuments />} />
      <Route path="/employee/profile" element={<EmployeeProfile />} />

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

      <Route
        path="/patients"
        element={
          <ProtectedRoute>
            <PatientsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/solutions"
        element={
          <ProtectedRoute>
            <SolutionsCenter />
          </ProtectedRoute>
        }
      />
    </Routes>
    </>
  );
}

export default App;