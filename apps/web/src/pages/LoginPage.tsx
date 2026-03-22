import { FormEvent, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAppState } from "../state/AppStateContext";

const LOCK_DURATION_SECONDS = 30;
const MAX_FAILED_ATTEMPTS = 3;

export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const { session, login } = useAppState();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [remainingLockSeconds, setRemainingLockSeconds] = useState(0);

  useEffect(() => {
    if (!lockUntil) {
      setRemainingLockSeconds(0);
      return;
    }
    const updateRemaining = () => {
      const deltaSeconds = Math.max(Math.ceil((lockUntil - Date.now()) / 1000), 0);
      setRemainingLockSeconds(deltaSeconds);
      if (deltaSeconds === 0) {
        setLockUntil(null);
        setFailedAttempts(0);
      }
    };
    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [lockUntil]);

  if (session.authenticated) {
    return <Navigate to="/overview" replace />;
  }

  const isLocked = lockUntil !== null && Date.now() < lockUntil;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLocked) {
      setError(`尝试次数过多，请在 ${remainingLockSeconds} 秒后重试。`);
      return;
    }
    setSubmitting(true);
    setError(null);
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    const result = await login(password);
    if (!result.ok) {
      const nextFailedAttempts = failedAttempts + 1;
      setFailedAttempts(nextFailedAttempts);
      const locked = nextFailedAttempts >= MAX_FAILED_ATTEMPTS;
      if (locked) {
        setLockUntil(Date.now() + LOCK_DURATION_SECONDS * 1000);
        setError(`失败次数过多，已锁定 ${LOCK_DURATION_SECONDS} 秒。`);
      } else {
        setError(result.error ?? "登录失败。");
      }
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    navigate("/overview", { replace: true });
  };

  return (
    <div className="login-page">
      <div className="login-panel">
        <div className="login-brand">
          <h1>自动交易控制台</h1>
          <p>单人受保护交易工作台</p>
        </div>
        <form className="login-form" onSubmit={onSubmit}>
          <label htmlFor="password">6位数字密码</label>
          <input
            id="password"
            inputMode="numeric"
            maxLength={6}
            pattern="\d{6}"
            autoComplete="one-time-code"
            value={password}
            onChange={(event) => setPassword(event.target.value.replace(/\D/g, ""))}
            placeholder="请输入6位数字"
            disabled={isLocked || submitting}
            required
          />
          <button className="btn btn-info login-submit" type="submit" disabled={submitting || isLocked}>
            {submitting ? "登录中..." : "登录"}
          </button>
          {error ? <p className="form-error">{error}</p> : null}
          {isLocked ? (
            <p className="form-help">当前处于临时锁定状态，剩余 {remainingLockSeconds} 秒。</p>
          ) : (
            <p className="form-help">原型阶段规则：任意6位数字密码均可登录。</p>
          )}
        </form>
        <section className="login-security">
          <h2>安全说明</h2>
          <ul>
            <li>生产环境会话失效后应回到本页并说明原因。</li>
            <li>运行时敏感凭据不会在 Web 控制台明文展示。</li>
            <li>切换到实盘模式必须经过二次确认。</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
