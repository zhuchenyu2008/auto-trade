import { useMemo, useState } from "react";

import { PageFrame } from "../components/PageFrame";
import { StatusBadge } from "../components/StatusBadge";
import { initialManualConfirmations } from "../mock-data";
import type { ManualConfirmationRecord, ManualConfirmationStatus } from "../types";

function toneFromStatus(status: ManualConfirmationStatus): "success" | "danger" | "warning" | "info" {
  switch (status) {
    case "approved":
      return "success";
    case "rejected":
      return "danger";
    case "expired":
      return "warning";
    default:
      return "info";
  }
}

export function ManualConfirmationsPage() {
  const [queue, setQueue] =
    useState<ManualConfirmationRecord[]>(initialManualConfirmations);
  const [selectedId, setSelectedId] = useState(queue[0]?.id ?? "");

  const selectedItem = useMemo(
    () => queue.find((item) => item.id === selectedId) ?? queue[0],
    [queue, selectedId]
  );

  if (!selectedItem) {
    return null;
  }

  function resolveItem(status: "approved" | "rejected") {
    setQueue((current) =>
      current.map((item) =>
        item.id === selectedItem.id ? { ...item, status } : item
      )
    );
  }

  return (
    <PageFrame
      eyebrow="Manual Gate"
      title="人工确认"
      description="这里只处理新开仓低置信度动作，尽量让判断在一个视图里完成，不再额外跳多个页面。"
      actions={
        <div className="button-row">
          <button className="button button--ghost">按最新排序</button>
          <button className="button">只看待处理</button>
        </div>
      }
    >
      <div className="confirmation-layout">
        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">Queue</p>
              <h3>待确认列表</h3>
            </div>
          </div>
          <div className="queue-list">
            {queue.map((item) => (
              <button
                className={`queue-item ${
                  item.id === selectedItem.id ? "queue-item--active" : ""
                }`}
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                type="button"
              >
                <div className="queue-item__top">
                  <strong>{item.symbol}</strong>
                  <StatusBadge tone={toneFromStatus(item.status)}>
                    {item.status}
                  </StatusBadge>
                </div>
                <span>{item.channelName}</span>
                <p>{item.actionType}</p>
                <div className="queue-item__foot">
                  <span>confidence {item.confidence}</span>
                  <span>{item.createdAt}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <aside className="panel panel--aside panel--deep">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">Decision Detail</p>
              <h3>{selectedItem.symbol}</h3>
            </div>
            <StatusBadge tone={toneFromStatus(selectedItem.status)}>
              {selectedItem.status}
            </StatusBadge>
          </div>

          <div className="key-grid">
            <div>
              <span>频道</span>
              <strong>{selectedItem.channelName}</strong>
            </div>
            <div>
              <span>环境</span>
              <strong>{selectedItem.environment}</strong>
            </div>
            <div>
              <span>动作</span>
              <strong>{selectedItem.actionType}</strong>
            </div>
            <div>
              <span>置信度</span>
              <strong>{selectedItem.confidence}</strong>
            </div>
          </div>

          <div className="detail-block">
            <p className="panel-kicker">原始消息</p>
            <blockquote className="quote-block">{selectedItem.originalMessage}</blockquote>
          </div>

          <div className="detail-block">
            <p className="panel-kicker">上下文摘要</p>
            <ul className="detail-list">
              {selectedItem.contextSummary.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="detail-block">
            <p className="panel-kicker">AI 判断理由</p>
            <ul className="detail-list">
              {selectedItem.reasoning.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="key-grid">
            <div>
              <span>入场规划</span>
              <strong>{selectedItem.entryPlan}</strong>
            </div>
            <div>
              <span>止损</span>
              <strong>{selectedItem.stopLoss}</strong>
            </div>
            <div>
              <span>止盈</span>
              <strong>{selectedItem.takeProfit.join(" / ")}</strong>
            </div>
            <div>
              <span>关联 ID</span>
              <strong>{selectedItem.correlationId}</strong>
            </div>
          </div>

          {selectedItem.invalidReason ? (
            <div className="inline-warning">
              <p>{selectedItem.invalidReason}</p>
            </div>
          ) : null}

          <div className="button-row button-row--stack-mobile">
            <button
              className="button"
              disabled={selectedItem.status !== "pending"}
              onClick={() => resolveItem("approved")}
            >
              确认执行
            </button>
            <button
              className="button button--danger"
              disabled={selectedItem.status !== "pending"}
              onClick={() => resolveItem("rejected")}
            >
              拒绝执行
            </button>
          </div>
        </aside>
      </div>
    </PageFrame>
  );
}

