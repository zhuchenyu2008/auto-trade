import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";

import { AuthProvider, useAuth } from "./auth";
import { AppShell } from "./components/AppShell";
import { ChannelsPage } from "./pages/ChannelsPage";
import { LoginPage } from "./pages/LoginPage";
import { LogsPage } from "./pages/LogsPage";
import { ManualConfirmationsPage } from "./pages/ManualConfirmationsPage";
import { OrdersPage } from "./pages/OrdersPage";
import { OverviewPage } from "./pages/OverviewPage";
import { SettingsPage } from "./pages/SettingsPage";
import { VirtualPositionsPage } from "./pages/VirtualPositionsPage";

function ProtectedLayout() {
  const { authenticated } = useAuth();

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function LoginRoute() {
  const { authenticated } = useAuth();

  if (authenticated) {
    return <Navigate to="/overview" replace />;
  }

  return <LoginPage />;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route element={<ProtectedLayout />}>
            <Route index element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/channels" element={<ChannelsPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route
              path="/manual-confirmations"
              element={<ManualConfirmationsPage />}
            />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/virtual-positions" element={<VirtualPositionsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

