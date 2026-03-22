import { useEffect, useState } from "react";
import { Drawer } from "../components/Drawer";
import { StatusTag } from "../components/StatusTag";
import { useAppState } from "../state/AppStateContext";
import type { LogItem } from "../types";
import { formatUtcDateTime } from "../lib/format";
import { labelEnvironment, labelLogLevel, labelModule } from "../lib/labels";

function buildRealtimeLog(base: LogItem | undefined, seed: number): LogItem {
  const now = new Date().toISOString();
  const isWarning = seed % 4 === 0;
  return {
    logId: `live_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: now,
    level: isWarning ? "warning" : "info",
    module: isWarning ? "telegram-intake" : "ai-decision",
    environment: base?.environment ?? "paper",
    channelId: base?.channelId ?? "ch_1",
    channelName: base?.channelName ?? "频道甲",
    message: isWarning
      ? "实时流检测到抓取抖动，已触发回退轮询。"
      : "实时流已追加新的决策链路节点。",
    correlationId: `corr_live_${Math.random().toString(36).slice(2, 7)}`
  };
}

export function LogsPage(): JSX.Element {
  const { logs, dataSource } = useAppState();
  const [channelFilter, setChannelFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [environmentFilter, setEnvironmentFilter] = useState("all");
  const [correlationSearch, setCorrelationSearch] = useState("");
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [realtimeLogs, setRealtimeLogs] = useState<LogItem[]>([]);
  const [newHighlightId, setNewHighlightId] = useState<string | null>(null);

  useEffect(() => {
    if (dataSource === "api") {
      return;
    }
    let seed = 0;
    const timer = window.setInterval(() => {
      seed += 1;
      const nextLog = buildRealtimeLog(logs[0], seed);
      setRealtimeLogs((previous) => [nextLog, ...previous].slice(0, 20));
      setNewHighlightId(nextLog.logId);
      window.setTimeout(() => {
        setNewHighlightId((current) => (current === nextLog.logId ? null : current));
      }, 2000);
    }, 9000);
    return () => window.clearInterval(timer);
  }, [dataSource, logs]);

  const allLogs = [...realtimeLogs, ...logs];
  const channelOptions = ["all", ...new Set(allLogs.map((item) => item.channelName))];
  const moduleOptions = ["all", ...new Set(allLogs.map((item) => item.module))];

  const filteredLogs = allLogs.filter((log) => {
    if (channelFilter !== "all" && log.channelName !== channelFilter) {
      return false;
    }
    if (levelFilter !== "all" && log.level !== levelFilter) {
      return false;
    }
    if (moduleFilter !== "all" && log.module !== moduleFilter) {
      return false;
    }
    if (environmentFilter !== "all" && log.environment !== environmentFilter) {
      return false;
    }
    if (correlationSearch.trim() && !log.correlationId.includes(correlationSearch.trim())) {
      return false;
    }
    return true;
  });

  const selectedLog = filteredLogs.find((item) => item.logId === selectedLogId) ?? null;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>日志追踪</h1>
          <p>用于排查“刚刚发生了什么”并按关联编号回看完整链路。</p>
        </div>
      </header>

      <div className="surface-section">
        <div className="filters-row">
          <label>
            频道
            <select value={channelFilter} onChange={(event) => setChannelFilter(event.target.value)}>
              {channelOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "全部" : option}
                </option>
              ))}
            </select>
          </label>
          <label>
            级别
            <select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)}>
              <option value="all">全部</option>
              <option value="debug">调试</option>
              <option value="info">信息</option>
              <option value="warning">警告</option>
              <option value="error">错误</option>
            </select>
          </label>
          <label>
            模块
            <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)}>
              {moduleOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "全部" : labelModule(option)}
                </option>
              ))}
            </select>
          </label>
          <label>
            环境
            <select value={environmentFilter} onChange={(event) => setEnvironmentFilter(event.target.value)}>
              <option value="all">全部</option>
              <option value="paper">模拟盘</option>
              <option value="live">实盘</option>
            </select>
          </label>
          <label>
            关联编号
            <input
              className="input"
              value={correlationSearch}
              onChange={(event) => setCorrelationSearch(event.target.value)}
              placeholder="输入关联编号"
            />
          </label>
        </div>

        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>时间</th>
                <th>级别</th>
                <th>模块</th>
                <th>事件摘要</th>
                <th>频道</th>
                <th>环境</th>
                <th>关联编号</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr
                  key={log.logId}
                  className={`${newHighlightId === log.logId ? "log-fresh" : ""}`}
                  onClick={() => setSelectedLogId(log.logId)}
                >
                  <td>{formatUtcDateTime(log.timestamp)}</td>
                  <td>
                    <StatusTag
                      tone={
                        log.level === "error"
                          ? "danger"
                          : log.level === "warning"
                            ? "warning"
                            : log.level === "info"
                              ? "info"
                              : "neutral"
                      }
                      label={labelLogLevel(log.level)}
                    />
                  </td>
                  <td>{labelModule(log.module)}</td>
                  <td>{log.message}</td>
                  <td>{log.channelName}</td>
                  <td>{labelEnvironment(log.environment)}</td>
                  <td>{log.correlationId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer open={selectedLog !== null} title="日志链路详情" onClose={() => setSelectedLogId(null)} width="wide">
        {selectedLog ? (
          <div className="detail-stack">
            <div className="detail-group">
              <h4>事件摘要</h4>
              <p>{selectedLog.message}</p>
            </div>
            <div className="detail-group">
              <h4>路由信息</h4>
              <p>模块：{labelModule(selectedLog.module)}</p>
              <p>频道：{selectedLog.channelName}</p>
              <p>环境：{labelEnvironment(selectedLog.environment)}</p>
              <p>关联编号：{selectedLog.correlationId}</p>
            </div>
            <div className="detail-group">
              <h4>事件时间</h4>
              <p>{formatUtcDateTime(selectedLog.timestamp)}</p>
            </div>
          </div>
        ) : null}
      </Drawer>
    </section>
  );
}
