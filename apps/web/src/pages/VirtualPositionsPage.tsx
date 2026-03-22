import { useState } from "react";
import { Drawer } from "../components/Drawer";
import { StatusTag } from "../components/StatusTag";
import { useAppState } from "../state/AppStateContext";
import { formatSigned } from "../lib/format";
import { labelOrderStatus, labelSide } from "../lib/labels";

export function VirtualPositionsPage(): JSX.Element {
  const { virtualPositions, orders } = useAppState();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = virtualPositions.find((item) => item.virtualPositionId === selectedId) ?? null;
  const totalRealized = virtualPositions.reduce((acc, item) => acc + Number(item.realizedPnl), 0);
  const totalUnrealized = virtualPositions.reduce((acc, item) => acc + Number(item.unrealizedPnl), 0);

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>虚拟持仓</h1>
          <p>本页为解释层“虚拟”状态，不等同于交易所真实持仓。</p>
        </div>
      </header>

      <div className="split-layout">
        <section className="surface-section">
          <header className="section-header">
            <h2>频道级虚拟盈亏</h2>
          </header>
          <div className="stat-grid stat-grid-2">
            <article className="stat-item">
              <h3>总已实现盈亏</h3>
              <p className={totalRealized >= 0 ? "text-success" : "text-danger"}>{formatSigned(totalRealized.toString())}</p>
            </article>
            <article className="stat-item">
              <h3>总未实现盈亏</h3>
              <p className={totalUnrealized >= 0 ? "text-success" : "text-danger"}>
                {formatSigned(totalUnrealized.toString())}
              </p>
            </article>
          </div>
        </section>

        <section className="surface-section">
          <header className="section-header">
            <h2>映射说明</h2>
          </header>
          <p className="muted-text">每个虚拟持仓会通过关联编号映射到一个或多个真实订单。</p>
        </section>
      </div>

      <div className="surface-section">
        <header className="section-header">
          <h2>虚拟持仓列表</h2>
        </header>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>频道</th>
                <th>标的</th>
                <th>方向</th>
                <th>状态</th>
                <th>虚拟数量</th>
                <th>虚拟均价</th>
                <th>已实现盈亏</th>
                <th>未实现盈亏</th>
                <th>关联编号</th>
              </tr>
            </thead>
            <tbody>
              {virtualPositions.map((position) => (
                <tr key={position.virtualPositionId} onClick={() => setSelectedId(position.virtualPositionId)}>
                  <td>{position.channelName}</td>
                  <td>{position.symbol}</td>
                  <td>{labelSide(position.side)}</td>
                  <td>
                    <StatusTag
                      tone={position.status === "open" ? "warning" : "neutral"}
                      label={position.status === "open" ? "虚拟-持仓中" : "虚拟-已平仓"}
                    />
                  </td>
                  <td>{position.virtualQuantity}</td>
                  <td>{position.virtualAvgPrice}</td>
                  <td className={Number(position.realizedPnl) >= 0 ? "text-success" : "text-danger"}>
                    {formatSigned(position.realizedPnl)}
                  </td>
                  <td className={Number(position.unrealizedPnl) >= 0 ? "text-success" : "text-danger"}>
                    {formatSigned(position.unrealizedPnl)}
                  </td>
                  <td>{position.correlationId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer open={selected !== null} title="虚拟持仓生命周期" onClose={() => setSelectedId(null)} width="wide">
        {selected ? (
          <div className="detail-stack">
            <div className="detail-group">
              <h4>虚拟状态</h4>
              <p>频道：{selected.channelName}</p>
              <p>标的：{selected.symbol}</p>
              <p>方向：{labelSide(selected.side)}</p>
              <p>状态：{selected.status === "open" ? "持仓中" : "已平仓"}</p>
            </div>
            <div className="detail-group">
              <h4>盈亏快照</h4>
              <p>已实现：{formatSigned(selected.realizedPnl)}</p>
              <p>未实现：{formatSigned(selected.unrealizedPnl)}</p>
            </div>
            <div className="detail-group">
              <h4>映射真实订单</h4>
              <ul className="simple-list">
                {orders
                  .filter((order) => order.correlationId === selected.correlationId)
                  .map((order) => (
                    <li key={order.orderId}>
                      {order.orderId} · {labelOrderStatus(order.status)} · {order.quantity} @ {order.price}
                    </li>
                  ))}
              </ul>
            </div>
            <div className="detail-group">
              <h4>链路追踪</h4>
              <p>关联编号：{selected.correlationId}</p>
            </div>
          </div>
        ) : null}
      </Drawer>
    </section>
  );
}
