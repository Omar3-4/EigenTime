import React, { createContext, useContext, ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { sessionsInRange } from "@/lib/repo";
import type { Session } from "@/lib/db";

interface SessionsContextValue {
  sessions90: Session[];
}

const SessionsContext = createContext<SessionsContextValue | null>(null);

export function SessionsProvider({ children }: { readonly children: ReactNode }) {
  const sessions90 = useLiveQuery(() => sessionsInRange(90), [], []);

  const value = React.useMemo(() => ({ sessions90: sessions90 || [] }), [sessions90]);

  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>;
}

export function useSessions() {
  const ctx = useContext(SessionsContext);
  if (!ctx) {
    throw new Error("useSessions must be used within a SessionsProvider");
  }
  return ctx;
}
