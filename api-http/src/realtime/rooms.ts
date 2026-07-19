import type WebSocket from "ws";

/** Contest rooms: contestId → set of sockets (ported from realtime-gateway). */
const contestRooms = new Map<number, Set<WebSocket>>();

/**
 * User rooms: userId → set of that user's sockets.
 *
 * Practice submissions have no contestId, so there is no contest room to deliver
 * their verdicts to (PRACTICE_MODE_AND_NAVIGATION.md §4.2). Every authenticated
 * socket joins its user room, which also makes per-user delivery honest: contest
 * results were already meant for exactly one user — the publisher just used to
 * find them by scanning a contest room and filtering by userId.
 */
const userRooms = new Map<number, Set<WebSocket>>();

function addTo(rooms: Map<number, Set<WebSocket>>, key: number, ws: WebSocket): void {
  const room = rooms.get(key) ?? new Set<WebSocket>();
  room.add(ws);
  rooms.set(key, room);
}

function removeFrom(rooms: Map<number, Set<WebSocket>>, key: number, ws: WebSocket): void {
  const room = rooms.get(key);
  if (!room) {
    return;
  }

  room.delete(ws);
  if (room.size === 0) {
    rooms.delete(key);
  }
}

export function joinRoom(contestId: number, ws: WebSocket): void {
  addTo(contestRooms, contestId, ws);
}

export function leaveRoom(contestId: number, ws: WebSocket): void {
  removeFrom(contestRooms, contestId, ws);
}

export function getRoomClients(contestId: number): Set<WebSocket> {
  return contestRooms.get(contestId) ?? new Set<WebSocket>();
}

export function joinUserRoom(userId: number, ws: WebSocket): void {
  addTo(userRooms, userId, ws);
}

export function leaveUserRoom(userId: number, ws: WebSocket): void {
  removeFrom(userRooms, userId, ws);
}

export function getUserClients(userId: number): Set<WebSocket> {
  return userRooms.get(userId) ?? new Set<WebSocket>();
}
