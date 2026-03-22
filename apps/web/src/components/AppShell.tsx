import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAppState } from "../state/AppStateContext";
import { ConfirmModal } from "./ConfirmModal";
import { StatusTag } from "./StatusTag";
import { labelEnvironment, labelHealthStatus } from "../lib/labels";

const navItems = [
  { to: "/overview", label: "总览" },
  { to: "/channels", label: "频道" },
  { to: "/logs", label: "日志" },
  { to: "/manual-confirmations", label: "人工确认" },
  { to: "/orders", label: "真实订单" },
  { to: "/virtual-positions", label: "虚拟持仓" },
  { to: "/settings", label: "系统设置" }
];

const pageTitleMap: Record<string, string> = {
  "/overview": "系统总览",
  "/channels": "频道管理",
  "/logs": "实时日志",
  "/manual-confirmations": "人工确认",
  "/orders": "交易所事实视图",
  "/virtual-positions": "解释层虚拟视图",
  "/settings": "运行参数设置"
};

export function AppShell(): JSX.Element {
  const location = useLocation();
  const { session, alerts, logout, setEnvironment, setGlobalTradingEnabled, dataSource, realtimeStatus } =
    useAppState();
  const [navOpen, setNavOpen] = useState(false);
  const [showEnvironmentModal, setShowEnvironmentModal] = useState(false);
  const [showTradingModal, setShowTradingModal] = useState(false);
  const nextEnvironment = session.environment === "paper" ? "live" : "paper";
  const latestAlert = alerts[0];
  const currentTitle = pageTitleMap[location.pathname] ?? "自动交易控制台";

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth > 1024) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [navOpen]);

  return (
    <div className="shell-root">
      <header className="topbar">
        <div className="topbar-left">
          <button
            className="btn btn-ghost nav-trigger"
            onClick={() => setNavOpen((value) => !value)}
            aria-expanded={navOpen}
            aria-controls="app-sidebar"
          >
            菜单
          </button>
          <div className="brand-block">
            <strong>自动交易</strong>
            <span>{currentTitle}</span>
          </div>
        </div>
        <div className="topbar-center">
          <div className="risk-strip">
            <StatusTag
              tone={session.environment === "paper" ? "info" : "danger"}
              label={labelEnvironment(session.environment)}
            />
            <StatusTag
              tone={session.globalTradingEnabled ? "success" : "warning"}
              label={session.globalTradingEnabled ? "交易已开启" : "交易已关闭"}
            />
            <StatusTag
              tone={
                session.healthStatus === "healthy"
                  ? "success"
                  : session.healthStatus === "degraded"
                    ? "warning"
                    : "danger"
              }
              label={`系统${labelHealthStatus(session.healthStatus)}`}
            />
            {dataSource === "api" ? (
              <StatusTag
                tone={realtimeStatus === "connected" ? "success" : "warning"}
                label={realtimeStatus === "connected" ? "实时流已连接" : "实时流降级"}
              />
            ) : null}
            <span className="pending-chip">待确认：{session.pendingManualConfirmationCount}</span>
          </div>
          {dataSource === "api" && realtimeStatus !== "connected" ? (
            <div className="top-alert">
              <strong>实时状态：</strong> 事件流暂不可用，已回退为定时刷新。
            </div>
          ) : latestAlert ? (
            <div className="top-alert">
              <strong>最新告警：</strong> {latestAlert.message}
            </div>
          ) : (
            <div className="top-alert">当前无告警。</div>
          )}
        </div>
        <div className="topbar-actions">
          <button className="btn btn-secondary" onClick={() => setShowEnvironmentModal(true)}>
            切换到{nextEnvironment === "live" ? "实盘" : "模拟盘"}
          </button>
          <button className="btn btn-warning" onClick={() => setShowTradingModal(true)}>
            {session.globalTradingEnabled ? "关闭交易" : "开启交易"}
          </button>
          <button className="btn btn-ghost" onClick={logout}>
            退出登录
          </button>
        </div>
      </header>

      <div className="shell-body">
        <button
          className={`sidebar-backdrop ${navOpen ? "sidebar-backdrop-open" : ""}`}
          type="button"
          tabIndex={navOpen ? 0 : -1}
          aria-label="关闭导航菜单"
          onClick={() => setNavOpen(false)}
        />
        <aside id="app-sidebar" className={`sidebar ${navOpen ? "sidebar-open" : ""}`}>
          <nav>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}
                onClick={() => setNavOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="workspace">
          <Outlet />
        </main>
      </div>

      <ConfirmModal
        open={showEnvironmentModal}
        title={nextEnvironment === "live" ? "确认切换到实盘环境？" : "确认切换到模拟盘环境？"}
        description={
          nextEnvironment === "live"
            ? "实盘模式会触发真实交易所动作，请再次确认风险边界。"
            : "模拟盘模式会停止真实执行，回到模拟状态。"
        }
        confirmLabel={nextEnvironment === "live" ? "确认切到实盘" : "确认切到模拟盘"}
        tone={nextEnvironment === "live" ? "danger" : "warning"}
        onCancel={() => setShowEnvironmentModal(false)}
        onConfirm={() => {
          setEnvironment(nextEnvironment);
          setShowEnvironmentModal(false);
        }}
      />

      <ConfirmModal
        open={showTradingModal}
        title={session.globalTradingEnabled ? "确认关闭全局交易？" : "确认开启全局交易？"}
        description={
          session.globalTradingEnabled
            ? "关闭后，新的执行动作会被系统拦截。"
            : "开启后，满足条件的执行动作将可以下发。"
        }
        confirmLabel={session.globalTradingEnabled ? "确认关闭交易" : "确认开启交易"}
        tone={session.globalTradingEnabled ? "warning" : "danger"}
        onCancel={() => setShowTradingModal(false)}
        onConfirm={() => {
          setGlobalTradingEnabled(!session.globalTradingEnabled);
          setShowTradingModal(false);
        }}
      />
    </div>
  );
}
