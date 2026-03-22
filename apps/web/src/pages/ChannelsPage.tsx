import { FormEvent, useState } from "react";
import { Drawer } from "../components/Drawer";
import { StatusTag } from "../components/StatusTag";
import { useAppState } from "../state/AppStateContext";
import { formatUtcDateTime } from "../lib/format";
import { labelChannelStatus, labelLastMessageResult } from "../lib/labels";

interface ChannelFormState {
  channelName: string;
  sourceType: string;
  sourceRef: string;
}

const defaultForm: ChannelFormState = {
  channelName: "",
  sourceType: "电报网页源",
  sourceRef: ""
};

export function ChannelsPage(): JSX.Element {
  const { channels, createChannel, updateChannel, toggleChannelStatus } = useAppState();
  const [detailChannelId, setDetailChannelId] = useState<string | null>(null);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [form, setForm] = useState<ChannelFormState>(defaultForm);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingChannelId, setPendingChannelId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedDetail = channels.find((channel) => channel.channelId === detailChannelId) ?? null;
  const isEditing = editingChannelId !== null;

  const visibleChannels = channels.filter((channel) => {
    const key = `${channel.channelName} ${channel.sourceRef}`.toLowerCase();
    return key.includes(search.toLowerCase());
  });

  const openCreateDrawer = () => {
    setErrorMessage(null);
    setDetailChannelId(null);
    setEditingChannelId("new");
    setForm(defaultForm);
  };

  const openEditDrawer = (channelId: string) => {
    const channel = channels.find((item) => item.channelId === channelId);
    if (!channel) {
      return;
    }
    setErrorMessage(null);
    setDetailChannelId(null);
    setEditingChannelId(channelId);
    setForm({
      channelName: channel.channelName,
      sourceType: channel.sourceType,
      sourceRef: channel.sourceRef
    });
  };

  const closeAllDrawers = () => {
    setErrorMessage(null);
    setDetailChannelId(null);
    setEditingChannelId(null);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.channelName.trim() || !form.sourceRef.trim()) {
      return;
    }
    setErrorMessage(null);
    setSubmitting(true);
    let result: { ok: boolean; error?: string } = { ok: true };
    if (editingChannelId === "new") {
      result = await createChannel({
        channelName: form.channelName.trim(),
        sourceRef: form.sourceRef.trim(),
        sourceType: form.sourceType.trim()
      });
    } else if (editingChannelId) {
      result = await updateChannel(editingChannelId, {
        channelName: form.channelName.trim(),
        sourceRef: form.sourceRef.trim(),
        sourceType: form.sourceType.trim()
      });
    }
    setSubmitting(false);
    if (!result.ok) {
      setErrorMessage(result.error ?? "操作失败，请稍后重试。");
      return;
    }
    closeAllDrawers();
  };

  const handleToggleStatus = async (channelId: string) => {
    setPendingChannelId(channelId);
    setErrorMessage(null);
    const result = await toggleChannelStatus(channelId);
    setPendingChannelId(null);
    if (!result.ok) {
      setErrorMessage(result.error ?? "状态切换失败，请稍后重试。");
    }
  };

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>频道管理</h1>
          <p>管理监听来源并检查每个频道的最新抓取状态。</p>
        </div>
        <div className="header-actions">
          <input
            className="input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索频道..."
          />
          <button className="btn btn-info" onClick={openCreateDrawer}>
            新增频道
          </button>
        </div>
      </header>

      <div className="surface-section">
        {errorMessage ? <div className="inline-alert inline-alert-warning">{errorMessage}</div> : null}
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>频道名称</th>
                <th>来源地址</th>
                <th>状态</th>
                <th>最近抓取</th>
                <th>最近成功</th>
                <th>错误摘要</th>
                <th>消息处理结果</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {visibleChannels.map((channel) => (
                <tr key={channel.channelId}>
                  <td>{channel.channelName}</td>
                  <td>{channel.sourceRef}</td>
                  <td>
                    <StatusTag
                      tone={channel.status === "enabled" ? "success" : "neutral"}
                      label={labelChannelStatus(channel.status)}
                    />
                  </td>
                  <td>{formatUtcDateTime(channel.lastFetchAt)}</td>
                  <td>{channel.lastSuccessAt ? formatUtcDateTime(channel.lastSuccessAt) : "-"}</td>
                  <td>
                    {channel.lastErrorSummary ? (
                      <StatusTag tone="warning" label={channel.lastErrorSummary} />
                    ) : (
                      <StatusTag tone="neutral" label="无错误" />
                    )}
                  </td>
                  <td>{labelLastMessageResult(channel.lastMessageResult)}</td>
                  <td className="table-actions">
                    <button className="btn btn-ghost" onClick={() => setDetailChannelId(channel.channelId)}>
                      详情
                    </button>
                    <button className="btn btn-ghost" onClick={() => openEditDrawer(channel.channelId)}>
                      编辑
                    </button>
                    <button
                      className="btn btn-secondary"
                      disabled={pendingChannelId === channel.channelId}
                      onClick={() => void handleToggleStatus(channel.channelId)}
                    >
                      {pendingChannelId === channel.channelId
                        ? "处理中..."
                        : channel.status === "enabled"
                          ? "停用"
                          : "启用"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer
        open={detailChannelId !== null}
        title={selectedDetail ? `${selectedDetail.channelName} 详情` : "频道详情"}
        onClose={closeAllDrawers}
      >
        {selectedDetail ? (
          <div className="detail-stack">
            <div className="detail-group">
              <h4>来源</h4>
              <p>{selectedDetail.sourceRef}</p>
            </div>
            <div className="detail-group">
              <h4>状态</h4>
              <StatusTag
                tone={selectedDetail.status === "enabled" ? "success" : "neutral"}
                label={labelChannelStatus(selectedDetail.status)}
              />
            </div>
            <div className="detail-group">
              <h4>最近抓取信息</h4>
              <p>最近抓取：{formatUtcDateTime(selectedDetail.lastFetchAt)}</p>
              <p>最近成功：{selectedDetail.lastSuccessAt ? formatUtcDateTime(selectedDetail.lastSuccessAt) : "-"}</p>
              <p>最近结果：{labelLastMessageResult(selectedDetail.lastMessageResult)}</p>
            </div>
            <div className="detail-group">
              <h4>错误上下文</h4>
              <p>{selectedDetail.lastErrorSummary ?? "暂无错误"}</p>
            </div>
          </div>
        ) : null}
      </Drawer>

      <Drawer open={isEditing} title={editingChannelId === "new" ? "新建频道" : "编辑频道"} onClose={closeAllDrawers}>
        <form className="form-stack" onSubmit={onSubmit}>
          <label>
            频道名称
            <input
              className="input"
              value={form.channelName}
              onChange={(event) => setForm((value) => ({ ...value, channelName: event.target.value }))}
              required
            />
          </label>
          <label>
            来源类型
            <input
              className="input"
              value={form.sourceType}
              onChange={(event) => setForm((value) => ({ ...value, sourceType: event.target.value }))}
              required
            />
          </label>
          <label>
            来源地址
            <input
              className="input"
              value={form.sourceRef}
              onChange={(event) => setForm((value) => ({ ...value, sourceRef: event.target.value }))}
              required
            />
          </label>
          <div className="form-actions">
            <button className="btn btn-ghost" type="button" onClick={closeAllDrawers}>
              取消
            </button>
            <button className="btn btn-info" type="submit" disabled={submitting}>
              {submitting ? "提交中..." : editingChannelId === "new" ? "创建" : "保存"}
            </button>
          </div>
        </form>
      </Drawer>
    </section>
  );
}
