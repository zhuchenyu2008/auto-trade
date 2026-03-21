import { activityFeed, alerts, appSnapshot, channels } from "../mock-data";
import { PageFrame } from "../components/PageFrame";
import { StatusBadge } from "../components/StatusBadge";

function toneFromHealth(status: string): "success" | "warning" | "danger" {
  if (status === "healthy") {
    return "success";
  }

  if (status === "degraded") {
    return "warning";
  }

  return "danger";
}

function toneFromLevel(level: string): "info" | "warning" | "danger" {
  if (level === "info") {
    return "info";
  }

  if (level === "warning") {
    return "warning";
  }

  return "danger";
}

export function OverviewPage() {
  return (
    <PageFrame
      eyebrow="Daily Overview"
      title="总览"
      description="先确认今天是不是在安全边界里，再看哪些链路需要你立刻处理。"
      actions={
        <div className="button-row">
          <button className="button button--ghost">刷新摘要</button>
          <button className="button">查看待确认</button>
        </div>
      }
    >
      <section className="hero-strip">
        <div className="hero-copy">
          <p className="hero-label">当前操作面板</p>
          <h2>Personal Trading Desk</h2>
          <p>
            这版首页不做大面积卡片墙，而是把今天最重要的四件事放在同一条视线上：环境、交易开关、频道健康、待确认项。
          </p>
        </div>
        <div className="hero-stats">
          <div className="metric-plate">
            <span className="metric-plate__label">运行环境</span>
            <strong>{appSnapshot.environment === "live" ? "实盘" : "模拟盘"}</strong>
          </div>
          <div className="metric-plate">
            <span className="metric-plate__label">待人工确认</span>
            <strong>{appSnapshot.pendingManualConfirmationCount}</strong>
          </div>
          <div className="metric-plate">
            <span className="metric-plate__label">活跃频道</span>
            <strong>{channels.filter((item) => item.status === "enabled").length}</strong>
          </div>
          <div className="metric-plate">
            <span className="metric-plate__label">最近更新时间</span>
            <strong>{appSnapshot.updatedAt}</strong>
          </div>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">Boundary</p>
              <h3>全局边界</h3>
            </div>
          </div>
          <div className="boundary-strip">
            <StatusBadge
              tone={appSnapshot.environment === "live" ? "live" : "paper"}
            >
              {appSnapshot.environment === "live" ? "实盘环境" : "模拟盘环境"}
            </StatusBadge>
            <StatusBadge
              tone={appSnapshot.globalTradingEnabled ? "success" : "warning"}
            >
              {appSnapshot.globalTradingEnabled ? "全局交易开启" : "全局交易关闭"}
            </StatusBadge>
            <StatusBadge tone={toneFromHealth(appSnapshot.healthStatus)}>
              系统健康 {appSnapshot.healthStatus}
            </StatusBadge>
          </div>
          <p className="muted-block">
            这条区域在所有页面都保持固定。风险边界不应该随着页面切换而消失。
          </p>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">Channels</p>
              <h3>频道健康摘要</h3>
            </div>
          </div>
          <div className="channel-lines">
            {channels.map((channel) => (
              <article className="channel-line" key={channel.id}>
                <div>
                  <h4>{channel.name}</h4>
                  <p>{channel.lastMessageResult}</p>
                </div>
                <div className="channel-line__meta">
                  <StatusBadge tone={toneFromHealth(channel.healthStatus)}>
                    {channel.healthStatus}
                  </StatusBadge>
                  <span>抓取 {channel.lastFetchAt}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">Alerts</p>
              <h3>最近异常</h3>
            </div>
          </div>
          <div className="signal-stack">
            {alerts.map((alert) => (
              <article className="signal-item" key={alert.id}>
                <div className="signal-item__head">
                  <StatusBadge tone={toneFromLevel(alert.level)}>
                    {alert.level}
                  </StatusBadge>
                  <span>{alert.occurredAt}</span>
                </div>
                <p>{alert.message}</p>
                <code>{alert.correlationId}</code>
              </article>
            ))}
          </div>
        </section>

        <section className="panel panel--wide">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">Trace</p>
              <h3>最近链路</h3>
            </div>
          </div>
          <div className="trace-list">
            {activityFeed.map((item) => (
              <article
                className={`trace-item trace-item--${item.emphasis}`}
                key={item.id}
              >
                <div className="trace-item__meta">
                  <span>{item.time}</span>
                  <span>{item.channelName}</span>
                </div>
                <h4>{item.title}</h4>
                <p>{item.summary}</p>
                <code>{item.correlationId}</code>
              </article>
            ))}
          </div>
        </section>
      </div>
    </PageFrame>
  );
}

