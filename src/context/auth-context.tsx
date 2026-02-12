import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authApi, loginApi } from "../lib/api/auth";

type AuthState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "authed"; user: any };

type AuthContextValue = {
  state: AuthState;
  revalidate: () => Promise<void>;
  login: (payload: any) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  const revalidate = async () => {
    try {
      const res = await authApi();

      if (res?.data.statusCode === 200) {
        setState({ status: "authed", user: res.data.data });
      } else {
        setState({ status: "guest" });
      }
    } catch {
      setState({ status: "guest" });
    }
  };

  // ✅ add login method
  const login = async (payload: any) => {
    await loginApi(payload);
    await revalidate();
  };

  useEffect(() => {
    revalidate();
  }, []);

  return (
    <AuthContext.Provider value={{ state, revalidate, login }}>
      {children}
    </AuthContext.Provider>
  );
};

export const getUser = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("getUser must be used within a AuthProvider");
  return ctx;
};
