import { createContext, ReactNode, useContext, useMemo } from "react";

type WebSocketState = { connected: boolean; sessionId?: string };
const WebSocketContext = createContext<WebSocketState>({ connected: false });

export function WebSocketProvider({ children, sessionId }: { children: ReactNode; sessionId?: string }) {
  const value = useMemo(() => ({ connected: false, sessionId }), [sessionId]);
  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

export function useWebSocket() {
  return useContext(WebSocketContext);
}
