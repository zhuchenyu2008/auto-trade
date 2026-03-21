import { useMemo, useState } from "react";

import { PageFrame } from "../components/PageFrame";
import { StatusBadge } from "../components/StatusBadge";
import { logs } from "../mock-data";

function toneFromLevel(level: string): "info" | "warning" | "danger" {
  if (level === "info") {
    return "info";
  }

  if (level === "warning") {
    return "warning";
  }

  return "danger";
}

export function LogsPage() {
  const [level, setLevel] = useState<"all" | "info" | "warning" | "error">("all");
  const [keyword, setKeyword] = useState("");
  const [selectedId, setSelectedId] = useState(logs[0]?.id ?? "");

  const filteredLogs = useMemo(
    () =>
      logs.filter((item) => {
        const levelMatches = level === "all" ? true : item.level === level;
        const keywordMatches =
          keyword.length === 0
            ? true
            : `${item.channelName} ${item.module} ${item.message} ${item.correlationId}`
                .toLowerCase()
                .includes(keyword.toLowerCase());

        return levelMatches && keywordMatches;
      }),
    [keyword, level]
  );

  const selectedLog =
    filteredLogs.find((item) => item.id === selectedId) ?? filteredLogs[0] ?? logs[0];

  if (!selectedLog) {
    return null;
  }

  return (
    <PageFrame
      eyebrow="Trace Stream"
      title="日志"
      description="这页优先为链路排查服务：按模块、频道和 correlation_id 找到刚才真正发生了什么。"
      actions={
        <div className="toolbar">
          <input
            aria-label="搜索日志"
            placeholder="搜索频道 / 模块 / correlation_id"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <select
            aria-label="按级别筛选"
            value={level}
            onChange={(event) =>
              setLevel(event.target.value as "all" | "info" | "warning" | "error")
            }
          >
            <option value="all">全部级别</option>
            <option value="info">info</option>
            <option value="warning">warning</option>
            <option value="error">error</option>
          </select>
        </div>
      }
    >
      <div className="split-layout">
        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">Live Stream Preview</p>
              <h3>最近日志</h3>
            </div>
            <StatusBadge tone="success">mock stream connected</StatusBadge>
          </div>

          <div className="log-list">
            {filteredLogs.map((item) => (
              <button
                className={`log-row ${item.id === selectedLog.id ? "log-row--active" : ""}`}
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                type="button"
              >
                <div className="log-row__meta">
                  <StatusBadge tone={toneFromLevel(item.level)}>{item.level}</StatusBadge>
                  <span>{item.timestamp}</span>
                  <span>{item.channelName}</span>
                </div>
                <strong>{item.message}</strong>
                <span>{item.module}</span>
              </button>
            ))}
          </div>
        </section>

        <aside className="panel panel--aside">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">Detail</p>
              <h3>{selectedLog.message}</h3>
            </div>
            <StatusBadge tone={toneFromLevel(selectedLog.level)}>
              {selectedLog.level}
            </StatusBadge>
          </div>

          <div className="key-grid">
            <div>
              <span>模块</span>
              <strong>{selectedLog.module}</strong>
            </div>
            <div>
              <span>频道</span>
              <strong>{selectedLog.channelName}</strong>
            </div>
            <div>
              <span>环境</span>
              <strong>{selectedLog.environment}</strong>
            </div>
            <div>
              <span>时间</span>
              <strong>{selectedLog.timestamp}</strong>
            </div>
          </div>

          <div className="detail-block">
            <p className="panel-kicker">Correlation</p>
            <code>{selectedLog.correlationId}</code>
          </div>

          <div className="detail-block">
            <p className="panel-kicker">Structured Detail</p>
            <ul className="detail-list">
              {selectedLog.detail.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </PageFrame>
  );
}

