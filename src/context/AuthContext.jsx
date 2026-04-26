import { createContext, useContext, useEffect, useState } from "react";
import { loginRequest, logoutRequest, meRequest } from "../services/auth";

const AuthContext = createContext();

const ACTIVE_TERMINAL_STORAGE_KEY = "active_terminal";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTerminal, setActiveTerminal] = useState(() => {
    try {
      const raw = localStorage.getItem(ACTIVE_TERMINAL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error(error);
      return null;
    }
  });

  useEffect(() => {
    const init = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const userData = await meRequest(token);
        setUser(userData);
      } catch (error) {
        console.error(error);
        localStorage.removeItem("token");
        localStorage.removeItem(ACTIVE_TERMINAL_STORAGE_KEY);
        setToken("");
        setUser(null);
        setActiveTerminal(null);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [token]);

  const login = async (email, password, terminalId = "", terminalMeta = null) => {
    const data = await loginRequest(email, password, terminalId);
    const authUser = data?.user ?? data?.data ?? null;

    localStorage.setItem("token", data.token);
    setToken(data.token);
    setUser(authUser);

    if (terminalMeta) {
      localStorage.setItem(
        ACTIVE_TERMINAL_STORAGE_KEY,
        JSON.stringify(terminalMeta)
      );
      setActiveTerminal(terminalMeta);
    } else {
      localStorage.removeItem(ACTIVE_TERMINAL_STORAGE_KEY);
      setActiveTerminal(null);
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await logoutRequest(token);
      } catch (error) {
        console.error(error);
      }
    }

    localStorage.removeItem("token");
    localStorage.removeItem(ACTIVE_TERMINAL_STORAGE_KEY);
    setToken("");
    setUser(null);
    setActiveTerminal(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        setUser,
        loading,
        login,
        logout,
        activeTerminal,
        setActiveTerminal,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}