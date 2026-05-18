import { Navigate, Route, Routes } from "react-router-dom";
import AdminBatchManagementPage from "./pages/AdminBatchManagementPage.jsx";
import AdminDashboardPage from "./pages/AdminDashboardPage.jsx";
import AdminLoginPage from "./pages/AdminLoginPage.jsx";
import EvaluationPage from "./pages/EvaluationPage.jsx";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("adminToken");
  return token ? children : <Navigate to="/admin/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<EvaluationPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/batches"
        element={
          <ProtectedRoute>
            <AdminBatchManagementPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
