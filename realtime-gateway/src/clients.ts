import type WebSocket from "ws";

/**
 * Per-socket state. Kept in a module-level registry (not on the ws object) so the
 * publisher can look up a socket's userId for per-user delivery (issues.md §8.1)
 * and the heartbeat/JWT-recheck loop can iterate every live client (§8.3/§8.4).
 */
export interface ClientState {
  userId: number;
  /** JWT `exp` (seconds since epoch); Infinity when the token carries no expiry. */
  tokenExp: number;
  /** Heartbeat liveness flag: set on pong, cleared each ping cycle. */
  isAlive: boolean;
  /** Contest rooms this socket has joined. */
  rooms: Set<number>;
}

const states = new Map<WebSocket, ClientState>();

export function setClientState(ws: WebSocket, state: ClientState): void {
  states.set(ws, state);
}

export function getClientState(ws: WebSocket): ClientState | undefined {
  return states.get(ws);
}

export function deleteClientState(ws: WebSocket): void {
  states.delete(ws);
}

/** All live clients keyed by socket — used by the heartbeat / JWT-recheck loop. */
export function allClients(): Map<WebSocket, ClientState> {
  return states;
}
