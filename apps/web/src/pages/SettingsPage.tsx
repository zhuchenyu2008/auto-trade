import { FormEvent, useEffect, useState } from "react";
import { ConfirmModal } from "../components/ConfirmModal";
import { StatusTag } from "../components/StatusTag";
import { useAppState } from "../state/AppStateContext";
import { labelEnvironment } from "../lib/labels";

type DangerIntent = "switch_environment" | "toggle_trading" | null;

export function SettingsPage(): JSX.Element {
  const { runtimeSettings, updateRuntimeSettings, setEnvironment, setGlobalTradingEnabled } = useAppState();
  const [draft, setDraft] = useState(runtimeSettings);
  const [saved, setSaved] = useState(false);
  const [dangerIntent, setDangerIntent] = useState<DangerIntent>(null);

  useEffect(() => {
    setDraft(runtimeSettings);
  }, [runtimeSettings]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // High-risk switches are changed only inside Danger Zone with explicit confirmation.
    updateRuntimeSettings({
      ...draft,
      environment: runtimeSettings.environment,
      globalTradingEnabled: runtimeSettings.globalTradingEnabled
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  const nextEnvironment = runtimeSettings.environment === "paper" ? "live" : "paper";
  const nextGlobalTrading = !runtimeSettings.globalTradingEnabled;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>系统设置</h1>
          <p>管理运行参数、模型行为与风控边界。</p>
        </div>
        {saved ? <StatusTag tone="success" label="已保存并生效" /> : null}
      </header>

      <form className="settings-grid" onSubmit={onSubmit}>
        <section className="surface-section">
          <header className="section-header">
            <h2>运行环境</h2>
          </header>
          <div className="detail-stack">
            <div className="detail-group">
              <h4>当前环境</h4>
              <StatusTag
                tone={runtimeSettings.environment === "paper" ? "info" : "danger"}
                label={labelEnvironment(runtimeSettings.environment)}
              />
            </div>
            <div className="detail-group">
              <h4>全局交易状态</h4>
              <StatusTag
                tone={runtimeSettings.globalTradingEnabled ? "success" : "warning"}
                label={runtimeSettings.globalTradingEnabled ? "已开启" : "已关闭"}
              />
            </div>
            <p className="muted-text">环境切换与全局交易开关属于高风险动作，请在“危险操作区”执行。</p>
          </div>
        </section>

        <section className="surface-section">
          <header className="section-header">
            <h2>模型与推理</h2>
          </header>
          <label>
            模型
            <input
              className="input"
              value={draft.model}
              onChange={(event) => setDraft((previous) => ({ ...previous, model: event.target.value }))}
            />
          </label>
          <p className="muted-text">
            AI API Key 与 Base URL 属于机密/部署级配置，不在此页明文填写；此页仅维护模型与推理策略。
          </p>
          <label>
            思考等级
            <select
              value={draft.reasoningLevel}
              onChange={(event) =>
                setDraft((previous) => ({
                  ...previous,
                  reasoningLevel: event.target.value as typeof previous.reasoningLevel
                }))
              }
            >
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </label>
          <label>
            上下文窗口长度
            <input
              className="input"
              type="number"
              min={5}
              max={120}
              value={draft.contextWindowSize}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, contextWindowSize: Number(event.target.value) }))
              }
            />
          </label>
        </section>

        <section className="surface-section">
          <header className="section-header">
            <h2>交易默认参数</h2>
          </header>
          <label>
            默认杠杆
            <input
              className="input"
              value={draft.defaultLeverage}
              onChange={(event) => setDraft((previous) => ({ ...previous, defaultLeverage: event.target.value }))}
            />
          </label>
          <label>
            人工确认阈值
            <input
              className="input"
              value={draft.manualConfirmationThreshold}
              onChange={(event) =>
                setDraft((previous) => ({
                  ...previous,
                  manualConfirmationThreshold: event.target.value
                }))
              }
            />
          </label>
          <div className="inline-split">
            <label>
              新开仓资金比例最小值
              <input
                className="input"
                value={draft.newPositionCapitalRange.min}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    newPositionCapitalRange: {
                      ...previous.newPositionCapitalRange,
                      min: event.target.value
                    }
                  }))
                }
              />
            </label>
            <label>
              新开仓资金比例最大值
              <input
                className="input"
                value={draft.newPositionCapitalRange.max}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    newPositionCapitalRange: {
                      ...previous.newPositionCapitalRange,
                      max: event.target.value
                    }
                  }))
                }
              />
            </label>
          </div>
        </section>

        <section className="surface-section danger-zone">
          <header className="section-header">
            <h2>危险操作区</h2>
          </header>
          <p>高影响动作必须经过二次确认。</p>
          <div className="danger-actions">
            <button className="btn btn-danger" type="button" onClick={() => setDangerIntent("switch_environment")}>
              切换到{labelEnvironment(nextEnvironment)}
            </button>
            <button className="btn btn-warning" type="button" onClick={() => setDangerIntent("toggle_trading")}>
              {nextGlobalTrading ? "开启交易" : "关闭交易"}
            </button>
          </div>
        </section>

        <footer className="form-actions">
          <button className="btn btn-info" type="submit">
            保存运行设置
          </button>
        </footer>
      </form>

      <ConfirmModal
        open={dangerIntent === "switch_environment"}
        title={nextEnvironment === "live" ? "确认切换到实盘模式？" : "确认切换到模拟盘模式？"}
        description={
          nextEnvironment === "live"
            ? "该动作可能产生真实交易后果，请先确认风控边界。"
            : "该动作会将执行切回模拟盘。"
        }
        confirmLabel={nextEnvironment === "live" ? "确认切到实盘" : "确认切到模拟盘"}
        tone={nextEnvironment === "live" ? "danger" : "warning"}
        onCancel={() => setDangerIntent(null)}
        onConfirm={() => {
          setEnvironment(nextEnvironment);
          setDangerIntent(null);
        }}
      />

      <ConfirmModal
        open={dangerIntent === "toggle_trading"}
        title={nextGlobalTrading ? "确认开启全局交易？" : "确认关闭全局交易？"}
        description={
          nextGlobalTrading
            ? "开启后，系统满足条件时会下发执行动作。"
            : "关闭后，系统会拦截新的执行动作。"
        }
        confirmLabel={nextGlobalTrading ? "确认开启" : "确认关闭"}
        tone={nextGlobalTrading ? "danger" : "warning"}
        onCancel={() => setDangerIntent(null)}
        onConfirm={() => {
          setGlobalTradingEnabled(nextGlobalTrading);
          setDangerIntent(null);
        }}
      />
    </section>
  );
}
