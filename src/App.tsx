import { Routes, Route } from "react-router-dom";
import CompaniesPage from "./pages/companies/CompaniesPage";

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
    </Routes>
  );
}

export default App;