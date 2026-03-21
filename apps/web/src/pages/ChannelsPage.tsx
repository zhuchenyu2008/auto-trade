import { useMemo, useState } from "react";

import { PageFrame } from "../components/PageFrame";
import { StatusBadge } from "../components/StatusBadge";
import { channels } from "../mock-data";

function toneFromHealth(status: string): "success" | "warning" | "danger" {
  if (status === "healthy") {
    return "success";
  }

  if (status === "degraded") {
    return "warning";
  }

  return "danger";
}

export function ChannelsPage() {
  const [selectedId, setSelectedId] = useState(channels[0]?.id ?? "");
  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === selectedId) ?? channels[0],
    [selectedId]
  );

  if (!selectedChannel) {
    return null;
  }

  return (
    <PageFrame
      eyebrow="Source Control"
      title="频道"
      description="这里先把监听对象、抓取健康和最近处理语义固定下来，后续再接真实配置接口。"
      actions={
        <div className="button-row">
          <button className="button">新增频道</button>
          <button className="button button--ghost">导出摘要</button>
        </div>
      }
    >
      <div className="split-layout">
        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">Registry</p>
              <h3>监听列表</h3>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>频道</th>
                <th>状态</th>
                <th>抓取</th>
                <th>最近结果</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((channel) => (
                <tr
                  key={channel.id}
                  className={channel.id === selectedChannel.id ? "is-selected" : ""}
                  onClick={() => setSelectedId(channel.id)}
                >
                  <td>
                    <strong>{channel.name}</strong>
                    <span>{channel.sourceRef}</span>
                  </td>
                  <td>
                    <StatusBadge tone={toneFromHealth(channel.healthStatus)}>
                      {channel.status === "enabled" ? "enabled" : "paused"}
                    </StatusBadge>
                  </td>
                  <td>
                    <strong>{channel.lastFetchAt}</strong>
                    <span>{channel.lastSuccessAt}</span>
                  </td>
                  <td>
                    <strong>{channel.lastMessageResult}</strong>
                    <span>{channel.lastErrorSummary ?? "无错误"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <aside className="panel panel--aside">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">Detail</p>
              <h3>{selectedChannel.name}</h3>
            </div>
            <StatusBadge tone={toneFromHealth(selectedChannel.healthStatus)}>
              {selectedChannel.healthStatus}
            </StatusBadge>
          </div>

          <div className="key-grid">
            <div>
              <span>来源地址</span>
              <strong>{selectedChannel.sourceRef}</strong>
            </div>
            <div>
              <span>活跃信号</span>
              <strong>{selectedChannel.openSignals}</strong>
            </div>
            <div>
              <span>最后抓取</span>
              <strong>{selectedChannel.lastFetchAt}</strong>
            </div>
            <div>
              <span>最后成功</span>
              <strong>{selectedChannel.lastSuccessAt}</strong>
            </div>
          </div>

          <div className="detail-block">
            <p className="panel-kicker">Narrative</p>
            <p>{selectedChannel.activeNarrative}</p>
          </div>

          <div className="detail-block">
            <p className="panel-kicker">Operator Note</p>
            <p>{selectedChannel.operatorNote}</p>
          </div>

          <div className="detail-block">
            <p className="panel-kicker">Recent Trace</p>
            <ul className="detail-list">
              {selectedChannel.recentTrace.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </PageFrame>
  );
}

