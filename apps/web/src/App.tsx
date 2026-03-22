import { RouterProvider, createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ChannelsPage } from "./pages/ChannelsPage";
import { LoginPage } from "./pages/LoginPage";
import { LogsPage } from "./pages/LogsPage";
import { ManualConfirmationsPage } from "./pages/ManualConfirmationsPage";
import { OrdersPage } from "./pages/OrdersPage";
import { OverviewPage } from "./pages/OverviewPage";
import { SettingsPage } from "./pages/SettingsPage";
import { VirtualPositionsPage } from "./pages/VirtualPositionsPage";
import { useAppState } from "./state/AppStateContext";

function ProtectedLayout(): JSX.Element {
  const { session } = useAppState();
  if (!session.authenticated) {
    return <Navigate to="/login" replace />;
  }
  return <AppShell />;
}

function NotFound(): JSX.Element {
  return (
    <section className="page">
      <div className="surface-section">
        <h1>页面不存在</h1>
        <p>你访问的路由不存在，请从左侧导航重新进入。</p>
      </div>
    </section>
  );
}

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    path: "/",
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: "/overview", element: <OverviewPage /> },
      { path: "/channels", element: <ChannelsPage /> },
      { path: "/logs", element: <LogsPage /> },
      { path: "/manual-confirmations", element: <ManualConfirmationsPage /> },
      { path: "/orders", element: <OrdersPage /> },
      { path: "/virtual-positions", element: <VirtualPositionsPage /> },
      { path: "/settings", element: <SettingsPage /> },
      { path: "*", element: <NotFound /> }
    ]
  },
  {
    path: "*",
    element: <Navigate to="/login" replace />
  }
]);

export default function App(): JSX.Element {
  return <RouterProvider router={router} />;
}
