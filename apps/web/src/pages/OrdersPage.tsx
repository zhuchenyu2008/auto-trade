import { PageFrame } from "../components/PageFrame";
import { StatusBadge } from "../components/StatusBadge";
import { fills, orders, realPositions } from "../mock-data";

function toneFromOrderStatus(status: string): "success" | "warning" | "danger" | "info" {
  switch (status) {
    case "filled":
      return "success";
    case "partially_filled":
      return "warning";
    case "canceled":
    case "rejected":
      return "danger";
    default:
      return "info";
  }
}

export function OrdersPage() {
  return (
    <PageFrame
      eyebrow="Exchange Fact Layer"
      title="真实订单"
      description="这一页只讲交易所事实：真实订单、真实成交、真实持仓。它不解释频道叙事，也不替代虚拟账本。"
    >
      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="panel-kicker">Real Positions</p>
            <h3>当前真实持仓</h3>
          </div>
        </div>
        <div className="position-ribbon">
          {realPositions.map((position) => (
            <article className="position-chip" key={position.id}>
              <span>{position.symbol}</span>
              <strong>
                {position.side} / {position.quantity}
              </strong>
              <p>
                开仓 {position.averagePrice} / 标记 {position.markPrice}
              </p>
              <StatusBadge
                tone={position.unrealizedPnl.startsWith("+") ? "success" : "danger"}
              >
                {position.unrealizedPnl}
              </StatusBadge>
            </article>
          ))}
        </div>
      </section>

      <div className="dual-column">
        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">Orders</p>
              <h3>订单状态</h3>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>标的</th>
                <th>方向 / 类型</th>
                <th>价格 / 数量</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>{order.symbol}</strong>
                    <span>{order.channelName}</span>
                  </td>
                  <td>
                    <strong>{order.side}</strong>
                    <span>{order.orderType}</span>
                  </td>
                  <td>
                    <strong>{order.price}</strong>
                    <span>{order.quantity}</span>
                  </td>
                  <td>
                    <StatusBadge tone={toneFromOrderStatus(order.status)}>
                      {order.status}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">Fills</p>
              <h3>最近成交</h3>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>标的</th>
                <th>成交价格</th>
                <th>数量 / 手续费</th>
                <th>关联 ID</th>
              </tr>
            </thead>
            <tbody>
              {fills.map((fill) => (
                <tr key={fill.id}>
                  <td>
                    <strong>{fill.symbol}</strong>
                    <span>{fill.side}</span>
                  </td>
                  <td>
                    <strong>{fill.price}</strong>
                    <span>{fill.occurredAt}</span>
                  </td>
                  <td>
                    <strong>{fill.quantity}</strong>
                    <span>fee {fill.fee}</span>
                  </td>
                  <td>
                    <code>{fill.correlationId}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </PageFrame>
  );
}

