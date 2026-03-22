import { useEffect, useState } from "react";
import { ConfirmModal } from "../components/ConfirmModal";
import { StatusTag } from "../components/StatusTag";
import { useAppState } from "../state/AppStateContext";
import { formatUtcDateTime } from "../lib/format";
import { labelActionType, labelEnvironment, labelManualStatus } from "../lib/labels";

type Intent = "approve" | "reject" | null;

export function ManualConfirmationsPage(): JSX.Element {
  const { session, manualConfirmations, manualConfirmationDetails, approveConfirmation, rejectConfirmation } =
    useAppState();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [intent, setIntent] = useState<Intent>(null);
  const [statusFilter, setStatusFilter] = useState("pending");

  const queue = manualConfirmations.filter((item) =>
    statusFilter === "all" ? true : item.status === statusFilter
  );

  useEffect(() => {
    if (queue.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !queue.some((item) => item.confirmationId === selectedId)) {
      setSelectedId(queue[0].confirmationId);
    }
  }, [queue, selectedId]);

  const selected = queue.find((item) => item.confirmationId === selectedId) ?? null;
  const selectedDetail = selected ? manualConfirmationDetails[selected.confirmationId] : null;
  const executable = selected?.status === "pending" && selectedDetail?.executable;
  const environmentMismatch = selected && selected.environment !== session.environment;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>人工确认队列</h1>
          <p>对低置信度新开仓动作进行可审计确认，避免误执行。</p>
        </div>
        <div className="header-actions">
          <label>
            队列筛选
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="pending">待确认</option>
              <option value="approved">已通过</option>
              <option value="rejected">已拒绝</option>
              <option value="expired">已过期</option>
              <option value="invalidated">已失效</option>
              <option value="all">全部</option>
            </select>
          </label>
        </div>
      </header>

      <div className="confirm-layout">
        <aside className="confirm-queue surface-section">
          <header className="section-header">
            <h2>待处理队列</h2>
            <span>{queue.length} 项</span>
          </header>
          <ul>
            {queue.map((item) => (
              <li
                key={item.confirmationId}
                className={`confirm-item ${item.confirmationId === selectedId ? "confirm-item-active" : ""}`}
                onClick={() => setSelectedId(item.confirmationId)}
              >
                <div className="confirm-item-main">
                  <strong>{item.symbol}</strong>
                  <p>
                    {item.channelName} · {labelActionType(item.actionType)}
                  </p>
                </div>
                <div className="confirm-item-side">
                  <StatusTag
                    tone={
                      item.status === "approved"
                        ? "success"
                        : item.status === "pending"
                          ? "warning"
                          : item.status === "rejected"
                            ? "danger"
                            : "neutral"
                    }
                    label={labelManualStatus(item.status)}
                  />
                  <span>{item.confidence}</span>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <section className="confirm-detail surface-section">
          {selected && selectedDetail ? (
            <>
              <header className="section-header">
                <h2>{selected.symbol}</h2>
                <StatusTag
                  tone={
                    selected.status === "approved"
                      ? "success"
                      : selected.status === "pending"
                        ? "warning"
                        : selected.status === "rejected"
                          ? "danger"
                          : "neutral"
                  }
                  label={labelManualStatus(selected.status)}
                />
              </header>

              <div className="detail-stack">
                <div className="detail-group">
                  <h4>上下文摘要</h4>
                  <p>{selectedDetail.contextSummary}</p>
                </div>
                <div className="detail-group">
                  <h4>原始消息</h4>
                  <p>{selectedDetail.rawMessage}</p>
                </div>
                <div className="detail-group">
                  <h4>模型决策</h4>
                  <p>{selectedDetail.aiDecision}</p>
                </div>
                <div className="detail-group">
                  <h4>关键价格参数</h4>
                  <p>入场价：{selectedDetail.keyPriceParams.entry}</p>
                  <p>止损价：{selectedDetail.keyPriceParams.stopLoss}</p>
                  <p>止盈价：{selectedDetail.keyPriceParams.takeProfit}</p>
                </div>
                <div className="detail-group">
                  <h4>链路信息</h4>
                  <p>创建时间：{formatUtcDateTime(selected.createdAt)}</p>
                  <p>关联编号：{selected.correlationId}</p>
                  <p>环境：{labelEnvironment(selected.environment)}</p>
                  {selectedDetail.invalidReason ? <p>失效原因：{selectedDetail.invalidReason}</p> : null}
                </div>
                {environmentMismatch ? (
                  <div className="inline-alert inline-alert-warning">当前会话环境与此确认项环境不一致。</div>
                ) : null}
              </div>

              <footer className="confirm-actions">
                <button
                  className="btn btn-danger"
                  type="button"
                  disabled={!executable || Boolean(environmentMismatch)}
                  onClick={() => setIntent("reject")}
                >
                  拒绝
                </button>
                <button
                  className="btn btn-info"
                  type="button"
                  disabled={!executable || Boolean(environmentMismatch)}
                  onClick={() => setIntent("approve")}
                >
                  通过
                </button>
              </footer>
            </>
          ) : (
            <p className="muted-text">请先从左侧队列选择一条确认项。</p>
          )}
        </section>
      </div>

      <ConfirmModal
        open={intent !== null && selected !== null}
        title={intent === "approve" ? "确认通过该确认项？" : "确认拒绝该确认项？"}
        description={
          intent === "approve"
            ? "通过后，对应动作可在当前环境继续执行。"
            : "拒绝后，本次待确认新开仓动作将被取消。"
        }
        confirmLabel={intent === "approve" ? "确认通过" : "确认拒绝"}
        tone={intent === "approve" ? "info" : "danger"}
        onCancel={() => setIntent(null)}
        onConfirm={() => {
          if (!selected) {
            return;
          }
          if (intent === "approve") {
            approveConfirmation(selected.confirmationId);
          } else if (intent === "reject") {
            rejectConfirmation(selected.confirmationId);
          }
          setIntent(null);
        }}
      />
    </section>
  );
}
