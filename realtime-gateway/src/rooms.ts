import type WebSocket from "ws";

const contestRooms = new Map<number, Set<WebSocket>>();

export function joinRoom(contestId: number, ws: WebSocket): void {
  const room = contestRooms.get(contestId) ?? new Set<WebSocket>();
  room.add(ws);
  contestRooms.set(contestId, room);
}

export function leaveRoom(contestId: number, ws: WebSocket): void {
  const room = contestRooms.get(contestId);
  if (!room) {
    return;
  }

  room.delete(ws);
  if (room.size === 0) {
    contestRooms.delete(contestId);
  }
}

export function getRoomClients(contestId: number): Set<WebSocket> {
  return contestRooms.get(contestId) ?? new Set<WebSocket>();
}
