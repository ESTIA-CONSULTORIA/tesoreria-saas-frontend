import { Routes, Route } from "react-router-dom";
import CompaniesPage from "./pages/companies/CompaniesPage";
import BranchesPage from "./pages/branches/BranchesPage";
import UsersPage from "./pages/users/UsersPage";
import RolesPage from "./pages/roles/RolesPage";
import BanksPage from "./pages/banks/BanksPage";
import MovementsPage from "./pages/movements/MovementsPage";

import LoginPage from "./pages/Login/LoginPage";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import ProtectedRoute from "./core/router/ProtectedRoute";

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
            <CompaniesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/branches"
        element={
          <ProtectedRoute>
            <BranchesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <UsersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/roles"
        element={
          <ProtectedRoute>
            <RolesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/banks"
        element={
          <ProtectedRoute>
            <BanksPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/movements"
        element={
          <ProtectedRoute>
            <MovementsPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;