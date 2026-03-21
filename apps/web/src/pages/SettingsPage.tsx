import { useMemo, useState } from "react";

import { ConfirmDialog } from "../components/ConfirmDialog";
import { PageFrame } from "../components/PageFrame";
import { runtimeSettings } from "../mock-data";
import type { RuntimeSettings } from "../types";

export function SettingsPage() {
  const [settings, setSettings] = useState<RuntimeSettings>({ ...runtimeSettings });
  const [dialogMode, setDialogMode] = useState<null | "live" | "pause">(null);
  const [savedMessage, setSavedMessage] = useState("");

  const isLiveSwitch = dialogMode === "live";

  function updateSetting<K extends keyof RuntimeSettings>(
    key: K,
    value: RuntimeSettings[K]
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
    setSavedMessage("");
  }

  function saveSettings() {
    setSavedMessage("已保存本地设置快照。后续接真实 API 后，这里将切换为真实保存。");
  }

  function resetSettings() {
    setSettings({ ...runtimeSettings });
    setSavedMessage("已恢复 mock 默认值。");
  }

  function confirmRiskAction() {
    if (dialogMode === "live") {
      updateSetting("environment", "live");
      setSavedMessage("已切换为实盘预览状态。后续需接真实二次确认流程。");
    }

    if (dialogMode === "pause") {
      updateSetting("globalTradingEnabled", false);
      setSavedMessage("已将全局交易开关切换为关闭。");
    }

    setDialogMode(null);
  }

  const allocationRange = useMemo(
    () => `${settings.allocationMin}% - ${settings.allocationMax}%`,
    [settings.allocationMax, settings.allocationMin]
  );

  return (
    <PageFrame
      eyebrow="Runtime Controls"
      title="系统设置"
      description="这里先把运行参数和高风险确认入口放到稳定位置，后续直接接真实保存与审计接口。"
      actions={
        <div className="button-row">
          <button className="button button--ghost" onClick={resetSettings}>
            恢复默认
          </button>
          <button className="button" onClick={saveSettings}>
            保存设置
          </button>
        </div>
      }
    >
      {savedMessage ? <div className="note-banner">{savedMessage}</div> : null}

      <div className="settings-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">Runtime</p>
              <h3>运行参数</h3>
            </div>
          </div>

          <div className="field-grid">
            <label className="field-block">
              <span>运行环境</span>
              <select
                value={settings.environment}
                onChange={(event) =>
                  updateSetting(
                    "environment",
                    event.target.value as RuntimeSettings["environment"]
                  )
                }
              >
                <option value="paper">paper</option>
                <option value="live">live</option>
              </select>
            </label>

            <label className="field-block">
              <span>模型</span>
              <select
                value={settings.model}
                onChange={(event) => updateSetting("model", event.target.value)}
              >
                <option value="gpt-5.4">gpt-5.4</option>
                <option value="gpt-5.2">gpt-5.2</option>
                <option value="gpt-5.3-codex">gpt-5.3-codex</option>
              </select>
            </label>

            <label className="field-block">
              <span>思考等级</span>
              <select
                value={settings.reasoningEffort}
                onChange={(event) =>
                  updateSetting("reasoningEffort", event.target.value)
                }
              >
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="xhigh">xhigh</option>
              </select>
            </label>

            <label className="field-block">
              <span>默认杠杆</span>
              <input
                min={1}
                max={50}
                type="number"
                value={settings.defaultLeverage}
                onChange={(event) =>
                  updateSetting("defaultLeverage", Number(event.target.value) || 1)
                }
              />
            </label>

            <label className="field-block">
              <span>人工确认阈值</span>
              <input
                min={0}
                max={1}
                step={0.01}
                type="number"
                value={settings.confirmationThreshold}
                onChange={(event) =>
                  updateSetting(
                    "confirmationThreshold",
                    Number(event.target.value) || 0
                  )
                }
              />
            </label>

            <label className="field-block">
              <span>上下文窗口长度</span>
              <input
                min={1}
                max={20}
                type="number"
                value={settings.contextWindowLength}
                onChange={(event) =>
                  updateSetting(
                    "contextWindowLength",
                    Number(event.target.value) || 1
                  )
                }
              />
            </label>
          </div>

          <div className="metric-pair">
            <article>
              <span>新开仓资金比例范围</span>
              <strong>{allocationRange}</strong>
            </article>
            <article>
              <span>全局交易状态</span>
              <strong>
                {settings.globalTradingEnabled ? "enabled" : "disabled"}
              </strong>
            </article>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">Allocation</p>
              <h3>资金区间</h3>
            </div>
          </div>
          <div className="range-grid">
            <label className="field-block">
              <span>最小投入比例</span>
              <input
                min={1}
                max={100}
                type="number"
                value={settings.allocationMin}
                onChange={(event) =>
                  updateSetting("allocationMin", Number(event.target.value) || 1)
                }
              />
            </label>
            <label className="field-block">
              <span>最大投入比例</span>
              <input
                min={1}
                max={100}
                type="number"
                value={settings.allocationMax}
                onChange={(event) =>
                  updateSetting("allocationMax", Number(event.target.value) || 1)
                }
              />
            </label>
          </div>

          <div className="detail-block">
            <p className="panel-kicker">设计说明</p>
            <p>
              这里保留需求中已确认的默认推荐值：AI 上下文窗口推荐为 <strong>8</strong>，但允许用户自行调节。
            </p>
          </div>
        </section>
      </div>

      <section className="panel danger-zone">
        <div className="panel-head">
          <div>
            <p className="panel-kicker">Danger Zone</p>
            <h3>高风险动作</h3>
          </div>
        </div>
        <p className="muted-block">
          高风险动作必须统一走二次确认。当前只是前端预演流程，后续接真实后端时这里将写入审计并做二次校验。
        </p>
        <div className="button-row">
          <button className="button button--danger" onClick={() => setDialogMode("live")}>
            切换到实盘
          </button>
          <button className="button button--ghost" onClick={() => setDialogMode("pause")}>
            关闭全局交易
          </button>
        </div>
      </section>

      <ConfirmDialog
        confirmLabel={isLiveSwitch ? "确认切换" : "确认关闭"}
        description={
          isLiveSwitch
            ? "切换到实盘会显著改变风险边界。正式接入后，这里必须联动后端再次校验当前状态。"
            : "关闭全局交易后，系统仍继续采集与决策，但不允许继续真实下单。"
        }
        open={dialogMode !== null}
        title={isLiveSwitch ? "确认进入实盘环境" : "确认关闭全局交易"}
        tone={isLiveSwitch ? "danger" : "warning"}
        onCancel={() => setDialogMode(null)}
        onConfirm={confirmRiskAction}
      >
        <div className="dialog-note">
          <p>
            当前演示状态：
            {settings.environment} /{" "}
            {settings.globalTradingEnabled ? "global enabled" : "global disabled"}
          </p>
        </div>
      </ConfirmDialog>
    </PageFrame>
  );
}
