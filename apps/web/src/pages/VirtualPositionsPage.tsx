import { useMemo, useState } from "react";

import { PageFrame } from "../components/PageFrame";
import { StatusBadge } from "../components/StatusBadge";
import { virtualPositions } from "../mock-data";

function toneFromPnL(value: string): "success" | "neutral" | "danger" {
  if (value.startsWith("+")) {
    return "success";
  }

  if (value === "0.00") {
    return "neutral";
  }

  return "danger";
}

export function VirtualPositionsPage() {
  const [selectedId, setSelectedId] = useState(virtualPositions[0]?.id ?? "");
  const selectedPosition = useMemo(
    () =>
      virtualPositions.find((position) => position.id === selectedId) ??
      virtualPositions[0],
    [selectedId]
  );

  if (!selectedPosition) {
    return null;
  }

  return (
    <PageFrame
      eyebrow="Channel Ledger"
      title="虚拟持仓"
      description="这一页是频道解释层，不是交易所事实层。它用来解释每个频道自己的交易叙事和 PnL。"
    >
      <div className="split-layout">
        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">Virtual Ledger</p>
              <h3>频道级持仓</h3>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>频道 / 标的</th>
                <th>方向 / 数量</th>
                <th>状态</th>
                <th>PnL</th>
              </tr>
            </thead>
            <tbody>
              {virtualPositions.map((position) => (
                <tr
                  key={position.id}
                  className={position.id === selectedPosition.id ? "is-selected" : ""}
                  onClick={() => setSelectedId(position.id)}
                >
                  <td>
                    <strong>{position.channelName}</strong>
                    <span>{position.symbol}</span>
                  </td>
                  <td>
                    <strong>{position.side}</strong>
                    <span>{position.virtualQuantity}</span>
                  </td>
                  <td>
                    <StatusBadge tone="info">{position.status}</StatusBadge>
                  </td>
                  <td>
                    <strong>{position.realizedPnl}</strong>
                    <span>{position.unrealizedPnl}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <aside className="panel panel--aside panel--deep">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">Lifecycle</p>
              <h3>
                {selectedPosition.channelName} / {selectedPosition.symbol}
              </h3>
            </div>
            <StatusBadge tone="info">virtual</StatusBadge>
          </div>

          <div className="key-grid">
            <div>
              <span>方向</span>
              <strong>{selectedPosition.side}</strong>
            </div>
            <div>
              <span>数量</span>
              <strong>{selectedPosition.virtualQuantity}</strong>
            </div>
            <div>
              <span>虚拟均价</span>
              <strong>{selectedPosition.virtualAveragePrice}</strong>
            </div>
            <div>
              <span>预留保证金</span>
              <strong>{selectedPosition.reservedMargin}</strong>
            </div>
          </div>

          <div className="metric-pair">
            <article>
              <span>已实现 PnL</span>
              <StatusBadge tone={toneFromPnL(selectedPosition.realizedPnl)}>
                {selectedPosition.realizedPnl}
              </StatusBadge>
            </article>
            <article>
              <span>未实现 PnL</span>
              <StatusBadge tone={toneFromPnL(selectedPosition.unrealizedPnl)}>
                {selectedPosition.unrealizedPnl}
              </StatusBadge>
            </article>
          </div>

          <div className="detail-block">
            <p className="panel-kicker">最新事件</p>
            <p>{selectedPosition.latestEvent}</p>
            <code>{selectedPosition.correlationId}</code>
          </div>

          <div className="detail-block">
            <p className="panel-kicker">生命周期轨迹</p>
            <ul className="detail-list">
              {selectedPosition.lifecycle.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </PageFrame>
  );
}

