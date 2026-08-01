import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type RoleMode = "buyer" | "reseller";

const KEY = "marginmap.role_mode";

type Ctx = { mode: RoleMode; setMode: (m: RoleMode) => void };
const RoleModeContext = createContext<Ctx>({ mode: "buyer", setMode: () => {} });

export function RoleModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<RoleMode>("buyer");

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY);
    if (stored === "buyer" || stored === "reseller") setModeState(stored);
  }, []);

  const setMode = useCallback((m: RoleMode) => {
    setModeState(m);
    window.localStorage.setItem(KEY, m);
  }, []);

  return <RoleModeContext.Provider value={{ mode, setMode }}>{children}</RoleModeContext.Provider>;
}

export const useRoleMode = () => useContext(RoleModeContext);
