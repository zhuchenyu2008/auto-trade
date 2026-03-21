import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";

const AUTH_STORAGE_KEY = "auto-trade.web.session";

interface AuthContextValue {
  authenticated: boolean;
  login: (password: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(AUTH_STORAGE_KEY) === "1";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean>(readSession);

  const value = useMemo<AuthContextValue>(
    () => ({
      authenticated,
      login: (password: string) => {
        if (!/^\d{6}$/.test(password)) {
          throw new Error("请输入 6 位数字密码。");
        }

        window.sessionStorage.setItem(AUTH_STORAGE_KEY, "1");
        setAuthenticated(true);
      },
      logout: () => {
        window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
        setAuthenticated(false);
      }
    }),
    [authenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}

