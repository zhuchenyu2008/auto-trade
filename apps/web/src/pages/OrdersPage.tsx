import { useState } from "react";
import { Drawer } from "../components/Drawer";
import { StatusTag } from "../components/StatusTag";
import { useAppState } from "../state/AppStateContext";
import { formatSigned, formatUtcDateTime } from "../lib/format";
import { labelEnvironment, labelOrderStatus, labelSide } from "../lib/labels";

export function OrdersPage(): JSX.Element {
  const { orders, fills, realPositions } = useAppState();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = orders.find((item) => item.orderId === selectedOrderId) ?? null;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>真实订单与成交</h1>
          <p>此页面展示交易所真实事实，不是解释层推断数据。</p>
        </div>
      </header>

      <div className="surface-section">
        <header className="section-header">
          <h2>订单列表</h2>
        </header>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>订单编号</th>
                <th>标的</th>
                <th>方向</th>
                <th>状态</th>
                <th>委托价</th>
                <th>数量</th>
                <th>环境</th>
                <th>关联编号</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.orderId} onClick={() => setSelectedOrderId(order.orderId)}>
                  <td>{order.orderId}</td>
                  <td>{order.symbol}</td>
                  <td>{labelSide(order.side)}</td>
                  <td>
                    <StatusTag
                      tone={
                        order.status === "filled"
                          ? "success"
                          : order.status === "pending" || order.status === "partially_filled"
                            ? "warning"
                            : "danger"
                      }
                      label={labelOrderStatus(order.status)}
                    />
                  </td>
                  <td>{order.price}</td>
                  <td>{order.quantity}</td>
                  <td>{labelEnvironment(order.environment)}</td>
                  <td>{order.correlationId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="split-layout">
        <section className="surface-section">
          <header className="section-header">
            <h2>成交列表</h2>
          </header>
          <div className="table-shell">
            <table>
              <thead>
              <tr>
                  <th>成交编号</th>
                  <th>订单编号</th>
                  <th>标的</th>
                  <th>方向</th>
                  <th>成交价</th>
                  <th>成交量</th>
                  <th>成交时间</th>
                </tr>
              </thead>
              <tbody>
                {fills.map((fill) => (
                  <tr key={fill.fillId}>
                    <td>{fill.fillId}</td>
                    <td>{fill.orderId}</td>
                    <td>{fill.symbol}</td>
                    <td>{labelSide(fill.side)}</td>
                    <td>{fill.fillPrice}</td>
                    <td>{fill.fillQuantity}</td>
                    <td>{formatUtcDateTime(fill.filledAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="surface-section">
          <header className="section-header">
            <h2>真实持仓</h2>
          </header>
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>标的</th>
                  <th>方向</th>
                  <th>数量</th>
                  <th>均价</th>
                  <th>标记价</th>
                  <th>未实现盈亏</th>
                </tr>
              </thead>
              <tbody>
                {realPositions.map((position) => (
                  <tr key={position.positionId}>
                    <td>{position.symbol}</td>
                    <td>{labelSide(position.side)}</td>
                    <td>{position.quantity}</td>
                    <td>{position.avgPrice}</td>
                    <td>{position.markPrice}</td>
                    <td className={Number(position.unrealizedPnl) >= 0 ? "text-success" : "text-danger"}>
                      {formatSigned(position.unrealizedPnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <Drawer open={selectedOrder !== null} title="订单详情" onClose={() => setSelectedOrderId(null)}>
        {selectedOrder ? (
          <div className="detail-stack">
            <div className="detail-group">
              <h4>订单事实</h4>
              <p>订单编号：{selectedOrder.orderId}</p>
              <p>决策编号：{selectedOrder.decisionId}</p>
              <p>状态：{labelOrderStatus(selectedOrder.status)}</p>
            </div>
            <div className="detail-group">
              <h4>执行形态</h4>
              <p>
                {selectedOrder.symbol} · {labelSide(selectedOrder.side)} · {selectedOrder.quantity}
              </p>
              <p>价格：{selectedOrder.price}</p>
              <p>环境：{labelEnvironment(selectedOrder.environment)}</p>
            </div>
            <div className="detail-group">
              <h4>可追踪信息</h4>
              <p>关联编号：{selectedOrder.correlationId}</p>
            </div>
          </div>
        ) : null}
      </Drawer>
    </section>
  );
}
