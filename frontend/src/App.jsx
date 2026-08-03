import { useEffect } from "react";
import AdminBatchManagementPage from "./pages/AdminBatchManagementPage.jsx";
import AdminDashboardPage from "./pages/AdminDashboardPage.jsx";
import AdminLoginPage from "./pages/AdminLoginPage.jsx";
import EvaluationPage from "./pages/EvaluationPage.jsx";
import { navigate, usePathname } from "./lib/router.jsx";

function Redirect({ to }) {
  useEffect(() => navigate(to, { replace: true }), [to]);
  return null;
}

function protectedPage(page) {
  const token = localStorage.getItem("adminToken");
  if (!token) {
    return <Redirect to="/admin/login" />;
  }
  return page;
}

export default function App() {
  const pathname = usePathname();

  if (pathname === "/") return <EvaluationPage />;
  if (pathname === "/admin/login") return <AdminLoginPage />;
  if (pathname === "/admin") return protectedPage(<AdminDashboardPage />);
  if (pathname === "/admin/batches") return protectedPage(<AdminBatchManagementPage />);

  return <Redirect to="/" />;
}
