import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      login(password);
      navigate("/overview", { replace: true });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "登录失败，请稍后重试。"
      );
    }
  }

  return (
    <div className="login-scene">
      <section className="login-poster">
        <p className="eyebrow">Single Operator Console</p>
        <h1>先看风险，再看链路，再决定要不要出手。</h1>
        <p className="login-intro">
          这是一个为个人持续使用而设计的交易工作台，不做多人协作感，也不做模板式后台。第一眼就要知道自己现在是不是安全。
        </p>

        <div className="poster-grid">
          <article>
            <span>01</span>
            <h2>风险边界固定可见</h2>
            <p>环境、全局交易开关、待确认数量和异常状态永远停留在同一视觉层。</p>
          </article>
          <article>
            <span>02</span>
            <h2>真实与虚拟永不混层</h2>
            <p>交易所事实层与频道解释层拆开呈现，避免日常判断时的语义错位。</p>
          </article>
          <article>
            <span>03</span>
            <h2>确认链路尽量短</h2>
            <p>低置信度新开仓进入单人确认流，跟进动作尽量不断链。</p>
          </article>
        </div>
      </section>

      <section className="login-card-wrap">
        <form className="login-card" onSubmit={handleSubmit}>
          <div className="login-card__head">
            <p className="eyebrow">Desk Access</p>
            <h2>进入控制台</h2>
            <p>
              原型阶段使用本地会话。当前接受任意 <code>6</code> 位数字密码，后续将替换为服务端会话认证。
            </p>
          </div>

          <label className="field-block" htmlFor="password">
            <span>操作密码</span>
            <input
              id="password"
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="输入 6 位数字"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value.replace(/\D/g, ""));
                setError("");
              }}
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button className="button button--full" type="submit">
            进入工作台
          </button>

          <div className="login-foot">
            <p>V1 范围：单用户 / Telegram 网页抓取 / OKX 合约 / 新开仓低置信度人工确认</p>
          </div>
        </form>
      </section>
    </div>
  );
}
