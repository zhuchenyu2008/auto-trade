import { Link } from "react-router-dom";
import { StatusTag } from "../components/StatusTag";
import { useAppState } from "../state/AppStateContext";
import { formatDeltaMinutes, formatUtcDateTime } from "../lib/format";
import {
  labelChannelStatus,
  labelEnvironment,
  labelHealthStatus,
  labelLastMessageResult,
  labelLogLevel
} from "../lib/labels";

export function OverviewPage(): JSX.Element {
  const { session, channels, manualConfirmations, alerts, logs } = useAppState();
  const pendingItems = manualConfirmations.filter((item) => item.status === "pending");
  const recentLogs = logs.slice(0, 6);

  return (
    <section className="page page-overview">
      <div className="risk-banner">
        <div>
          <strong>
            {session.environment === "live" ? "当前为实盘环境。" : "当前为模拟盘环境。"}
          </strong>
          <p>{session.globalTradingEnabled ? "全局交易已开启。" : "全局交易已关闭，需人工重新开启。"}</p>
        </div>
        <div className="risk-banner-tags">
          <StatusTag
            tone={session.healthStatus === "healthy" ? "success" : session.healthStatus === "degraded" ? "warning" : "danger"}
            label={`系统${labelHealthStatus(session.healthStatus)}`}
          />
          <StatusTag
            tone={pendingItems.length > 0 ? "warning" : "success"}
            label={`待确认 ${pendingItems.length} 项`}
          />
        </div>
      </div>

      <div className="stat-grid">
        <article className="stat-item">
          <h3>当前环境</h3>
          <p>{labelEnvironment(session.environment)}</p>
        </article>
        <article className="stat-item">
          <h3>系统健康</h3>
          <p>{labelHealthStatus(session.healthStatus)}</p>
        </article>
        <article className="stat-item">
          <h3>交易开关</h3>
          <p>{session.globalTradingEnabled ? "已开启" : "已关闭"}</p>
        </article>
        <article className="stat-item">
          <h3>待确认队列</h3>
          <p>{pendingItems.length}</p>
        </article>
      </div>

      <div className="split-layout">
        <section className="surface-section">
          <header className="section-header">
            <h2>频道健康摘要</h2>
            <Link to="/channels">进入频道页</Link>
          </header>
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>频道</th>
                  <th>状态</th>
                  <th>最近抓取</th>
                  <th>最近成功</th>
                  <th>最新处理结果</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((channel) => (
                  <tr key={channel.channelId}>
                    <td>{channel.channelName}</td>
                    <td>
                      <StatusTag
                        tone={channel.status === "enabled" ? "success" : "neutral"}
                        label={labelChannelStatus(channel.status)}
                      />
                    </td>
                    <td>{formatDeltaMinutes(channel.lastFetchAt)}</td>
                    <td>{channel.lastSuccessAt ? formatDeltaMinutes(channel.lastSuccessAt) : "-"}</td>
                    <td>{labelLastMessageResult(channel.lastMessageResult)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="surface-section">
          <header className="section-header">
            <h2>待确认摘要</h2>
            <Link to="/manual-confirmations">处理确认队列</Link>
          </header>
          {pendingItems.length === 0 ? (
            <p className="muted-text">当前没有待确认项。</p>
          ) : (
            <ul className="queue-list">
              {pendingItems.map((item) => (
                <li key={item.confirmationId}>
                  <div>
                    <strong>{item.symbol}</strong>
                    <p>
                      {item.channelName} · 置信度 {item.confidence}
                    </p>
                  </div>
                  <span>{formatDeltaMinutes(item.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="split-layout">
        <section className="surface-section">
          <header className="section-header">
            <h2>最近异常</h2>
            <Link to="/logs">按关联编号追踪</Link>
          </header>
          {alerts.length === 0 ? (
            <p className="muted-text">当前无异常告警。</p>
          ) : (
            <ul className="timeline-list">
              {alerts.map((item) => (
                <li key={item.id}>
                  <StatusTag tone={item.level === "error" ? "danger" : "warning"} label={labelLogLevel(item.level)} />
                  <div>
                    <strong>{item.message}</strong>
                    <p>
                      {formatUtcDateTime(item.occurredAt)} · {item.correlationId}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface-section">
          <header className="section-header">
            <h2>最近动作</h2>
            <Link to="/logs">打开日志页</Link>
          </header>
          <ul className="timeline-list">
            {recentLogs.map((log) => (
              <li key={log.logId}>
                <StatusTag
                  tone={log.level === "error" ? "danger" : log.level === "warning" ? "warning" : "neutral"}
                  label={labelLogLevel(log.level)}
                />
                <div>
                  <strong>{log.message}</strong>
                  <p>
                    {formatUtcDateTime(log.timestamp)} · {log.channelName} · {log.correlationId}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}
