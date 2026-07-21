#!/usr/bin/env node
/**
 * Starts every Code Arena service, each in its own terminal window.
 *
 * Separate windows rather than one multiplexed stream (the `concurrently`
 * approach) because these three have very different output: ts-node-dev reprints
 * a compile banner on every save, and two Vite servers both draw their own
 * status block. Interleaved and prefixed, that is unreadable exactly when you
 * need it — which is while something is crashing.
 *
 * Deliberately dependency-free. The repo root has no node_modules and this
 * exists to launch things, so requiring an install before you can start anything
 * would be backwards.
 *
 * Usage:
 *   pnpm dev              all three
 *   pnpm dev api web      a subset, by key
 *   pnpm dev --list       show what would start, run nothing
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Ports are pinned here rather than in each vite.config.ts.
 *
 * Both UIs default to 5173 and Vite silently walks to the next free port, so
 * whichever booted first won — meaning the admin app could land on the user
 * app's port between runs. `api-http/.env` allows 5173 and 5174 for CORS, so
 * these values make that config deterministic instead of a coin flip.
 */
const SERVICES = [
  {
    key: "api",
    title: "api-http :3001",
    cwd: "api-http",
    command: "pnpm dev",
    note: "REST + WebSocket + judge pool",
  },
  {
    key: "web",
    title: "web-user :5173",
    cwd: "web-user",
    command: "pnpm dev -- --port 5173 --strictPort",
    note: "learner app",
  },
  {
    key: "admin",
    title: "web-admin :5174",
    cwd: "web-admin",
    command: "pnpm dev -- --port 5174 --strictPort",
    note: "creator app",
  },
];

const args = process.argv.slice(2);
const listOnly = args.includes("--list");
const keys = args.filter((arg) => !arg.startsWith("-"));

const selected = keys.length
  ? SERVICES.filter((service) => keys.includes(service.key))
  : SERVICES;

if (keys.length && selected.length !== keys.length) {
  const known = SERVICES.map((s) => s.key).join(", ");
  const unknown = keys.filter((k) => !SERVICES.some((s) => s.key === k));
  console.error(`Unknown service: ${unknown.join(", ")}\nAvailable: ${known}`);
  process.exit(1);
}

// A missing node_modules produces a terminal that opens, errors, and vanishes
// before it can be read. Check here, where the message survives.
const missing = selected.filter(
  (service) => !existsSync(join(root, service.cwd, "node_modules")),
);
if (missing.length) {
  console.error(
    `Dependencies not installed for: ${missing.map((s) => s.cwd).join(", ")}\n` +
      `Run \`pnpm install\` in each, then retry.`,
  );
  process.exit(1);
}

console.log("Starting:");
for (const service of selected) {
  console.log(`  ${service.title.padEnd(20)} ${service.note}`);
}

if (listOnly) process.exit(0);

/**
 * Windows Terminal if it's available (tabs in one window, which is far nicer
 * than three floating consoles), otherwise plain `start` windows.
 */
function launchWindows(services) {
  // Windows Terminal gives tabs in one window instead of three floating
  // consoles. One `wt` call per tab rather than a single `;`-chained command:
  // the chained form has to survive both cmd's parser and wt's, and the quoting
  // silently collapses — producing no window and no error.
  const useWindowsTerminal = commandExists("where wt");

  for (const [index, service] of services.entries()) {
    const dir = join(root, service.cwd);

    // `cmd /k` keeps the shell alive after the process exits, so a crash leaves
    // its stack trace on screen instead of the window vanishing.
    const inner = `cmd /k "${service.command}"`;

    const command = useWindowsTerminal
      ? // `-w 0` targets the existing window, creating one if there is none, so
        // services after the first land as tabs beside it.
        `wt -w 0 ${index === 0 ? "" : "new-tab "}--title "${service.title}" -d "${dir}" ${inner}`
      : `start "${service.title}" ${inner}`;

    // A single string through `cmd /c`. Passing an args array with `shell: true`
    // concatenates without escaping — which is both the bug above and what
    // Node's DEP0190 warns about.
    runDetached(command, useWindowsTerminal ? root : dir);

    // wt drops tabs that arrive while it is still creating its window, so the
    // first call gets a moment to settle.
    if (useWindowsTerminal && index === 0) sleep(700);
  }
}

/** Fire-and-forget a shell command; never blocks the launcher. */
function runDetached(command, cwd) {
  spawn(command, { cwd, detached: true, stdio: "ignore", shell: true }).unref();
}

/** Crude but dependency-free; only used for the wt settle delay above. */
function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function launchMac(services) {
  for (const service of services) {
    const script = `tell application "Terminal" to do script "cd '${join(root, service.cwd)}' && ${service.command}"`;
    spawn("osascript", ["-e", script], { detached: true, stdio: "ignore" }).unref();
  }
}

function launchLinux(services) {
  const terminals = ["x-terminal-emulator", "gnome-terminal", "konsole", "xterm"];
  const terminal = terminals.find((candidate) => commandExists(`which ${candidate}`));

  if (!terminal) {
    console.error(
      "No terminal emulator found. Start each service manually:\n" +
        services.map((s) => `  (cd ${s.cwd} && ${s.command})`).join("\n"),
    );
    process.exit(1);
  }

  for (const service of services) {
    spawn(
      terminal,
      ["-e", `bash -lc "cd '${join(root, service.cwd)}' && ${service.command}; exec bash"`],
      { detached: true, stdio: "ignore" },
    ).unref();
  }
}

/**
 * Whether a command exists on PATH.
 *
 * One string, no args array: passing args alongside `shell: true` concatenates
 * them unescaped, which Node warns about as DEP0190.
 */
function commandExists(command) {
  return spawnSync(command, { stdio: "ignore", shell: true }).status === 0;
}

/** Splits a command string on spaces except inside double quotes. */
function splitArgs(input) {
  return input.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
}

const platform = process.platform;
if (platform === "win32") launchWindows(selected);
else if (platform === "darwin") launchMac(selected);
else launchLinux(selected);

console.log(
  "\nOpened in separate terminals. Close those windows to stop the services." +
    "\nPostgres is not managed here — `docker compose up -d postgres` if it isn't running.",
);
