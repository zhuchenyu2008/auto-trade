import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

import { useAuth } from "../auth";
import { appSnapshot } from "../mock-data";
import { StatusBadge } from "./StatusBadge";

const navigationItems = [
  { to: "/overview", label: "总览", note: "风险与系统状态" },
  { to: "/channels", label: "频道", note: "抓取与来源管理" },
  { to: "/logs", label: "日志", note: "链路排查" },
  { to: "/manual-confirmations", label: "人工确认", note: "新开仓低置信度" },
  { to: "/orders", label: "真实订单", note: "交易所事实层" },
  { to: "/virtual-positions", label: "虚拟持仓", note: "频道解释层" },
  { to: "/settings", label: "系统设置", note: "模型与风险边界" }
];

function healthTone(): "success" | "warning" | "danger" {
  switch (appSnapshot.healthStatus) {
    case "healthy":
      return "success";
    case "degraded":
      return "warning";
    default:
      return "danger";
  }
}

export function AppShell({ children }: { children: ReactNode }) {
  const { logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="status-ribbon">
        <div className="status-cluster">
          <StatusBadge tone={appSnapshot.environment === "live" ? "live" : "paper"}>
            {appSnapshot.environment === "live" ? "实盘" : "模拟盘"}
          </StatusBadge>
          <StatusBadge tone={appSnapshot.globalTradingEnabled ? "success" : "warning"}>
            {appSnapshot.globalTradingEnabled ? "全局交易开启" : "全局交易关闭"}
          </StatusBadge>
          <StatusBadge tone={healthTone()}>
            系统状态 {appSnapshot.healthStatus}
          </StatusBadge>
        </div>
        <div className="status-meta">
          <span>待确认 {appSnapshot.pendingManualConfirmationCount}</span>
          <span>{appSnapshot.connectedFeeds}</span>
          <span>更新于 {appSnapshot.updatedAt}</span>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <div className="brand-block">
            <p className="brand-kicker">Auto Trade / V1</p>
            <h1>Personal Trading Desk</h1>
            <p>
              为单人值守场景设计的交易操作台。先看风险边界，再看系统健康，再处理信号。
            </p>
          </div>

          <nav className="nav-stack" aria-label="主导航">
            {navigationItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `nav-link ${isActive ? "nav-link--active" : ""}`
                }
              >
                <span className="nav-link__label">{item.label}</span>
                <span className="nav-link__note">{item.note}</span>
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-foot">
            <div className="sidebar-note">
              <span className="sidebar-note__label">当前策略边界</span>
              <p>单用户 / Telegram 网页抓取 / OKX 合约 / 新开仓低置信度人工确认</p>
            </div>
            <button className="button button--ghost button--full" onClick={logout}>
              退出当前会话
            </button>
          </div>
        </aside>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
