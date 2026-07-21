#!/usr/bin/env node
/**
 * Starts every Code Arena service in the current terminal, output multiplexed.
 *
 * One window with prefixed, colour-coded lines. The cost is real and worth
 * naming: ts-node-dev reprints a compile banner on every save and both Vite
 * servers draw their own status block, so interleaved output is busier than
 * three clean panes — which is why this used to open separate windows. The
 * trade is deliberate: one window means one Ctrl+C, one scrollback to search,
 * and no hunting for which console owns a stack trace. `--separate` restores
 * the old behaviour when you want isolated panes for a gnarly debugging session.
 *
 * Deliberately dependency-free — no `concurrently`. The repo root has no
 * node_modules and this exists to launch things, so requiring an install before
 * you can start anything would be backwards.
 *
 * Usage:
 *   pnpm dev              all three, one window
 *   pnpm dev api web      a subset, by key
 *   pnpm dev --separate   one terminal window per service (the old behaviour)
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
    // No `--` before the flags. pnpm forwards trailing args to the script
    // already, and the separator survives into Vite's own argv — where cac
    // treats everything after `--` as positional rather than as options, so
    // `--strictPort` was silently ignored and Vite walked to the next free
    // port. That is the exact non-determinism the pinning below exists to stop.
    command: "pnpm dev --port 5173 --strictPort",
    note: "learner app",
  },
  {
    key: "admin",
    title: "web-admin :5174",
    cwd: "web-admin",
    command: "pnpm dev --port 5174 --strictPort",
    note: "creator app",
  },
];

const args = process.argv.slice(2);
const listOnly = args.includes("--list");
const separateWindows = args.includes("--separate");
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

// ---------------------------------------------------------------------------
// Inline mode (the default): everything in this window
// ---------------------------------------------------------------------------

/**
 * Per-service colours, so a line's owner is identifiable without reading the
 * prefix. Skips red — red is for this launcher's own failure messages, and a
 * service whose normal output looked like an error would defeat the point.
 */
const COLORS = ["\x1b[36m", "\x1b[32m", "\x1b[35m", "\x1b[33m", "\x1b[34m"];
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

// Respect NO_COLOR and non-TTY output, so piping to a file or CI log doesn't
// fill it with escape codes.
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (color, text) => (useColor ? `${color}${text}${RESET}` : text);

/** Live children, so the signal handlers can stop every one of them. */
const running = [];
let shuttingDown = false;

/**
 * Writes a child's output line-by-line with its prefix.
 *
 * Buffered rather than per-chunk: a chunk boundary lands mid-line often enough
 * that prefixing chunks directly produces visibly broken output under load.
 * `\r` is stripped because Vite and ts-node-dev use carriage returns to redraw
 * their status lines in place — passed through a prefixed stream, that
 * overwrites the prefix and leaves fragments behind.
 */
function pipePrefixed(stream, prefix) {
  let buffer = "";
  stream.setEncoding("utf8");

  stream.on("data", (chunk) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    // The trailing element is an incomplete line; hold it for the next chunk.
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      process.stdout.write(`${prefix} ${line.replace(/\r/g, "")}\n`);
    }
  });

  stream.on("end", () => {
    if (buffer) process.stdout.write(`${prefix} ${buffer.replace(/\r/g, "")}\n`);
  });
}

/**
 * Stops a child and everything it spawned.
 *
 * On Windows `child.kill()` reaches only the shell this launcher started, and
 * `pnpm dev` sits under it as a grandchild — so the actual dev server survives,
 * keeps its port, and the next run fails with EADDRINUSE. `taskkill /T` walks
 * the tree, which is the only reliable way to end it there.
 */
function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    }).on("error", () => child.kill());
    return;
  }

  child.kill("SIGTERM");
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  process.stdout.write(`\n${paint(DIM, "Stopping services...")}\n`);
  for (const child of running) stopChild(child);
}

function runInline(services) {
  const labelWidth = Math.max(...services.map((service) => service.key.length));
  let remaining = services.length;
  let worstCode = 0;

  services.forEach((service, index) => {
    const color = COLORS[index % COLORS.length];
    const prefix = paint(color, `[${service.key.padEnd(labelWidth)}]`);

    // One command string with `shell: true` — the commands carry their own
    // flags (`pnpm dev -- --port 5173`), and an args array here would need the
    // same quoting dance the separate-window path documents.
    const child = spawn(service.command, {
      cwd: join(root, service.cwd),
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    running.push(child);
    pipePrefixed(child.stdout, prefix);
    // stderr shares the service's colour rather than going red: ts-node-dev and
    // Vite both write ordinary progress to stderr, so colouring by stream would
    // paint routine startup as failure.
    pipePrefixed(child.stderr, prefix);

    child.on("error", (err) => {
      process.stdout.write(`${prefix} ${paint(RED, `failed to start: ${err.message}`)}\n`);
    });

    child.on("exit", (code, signal) => {
      remaining--;

      // During shutdown every service exits by design; announcing each one is
      // noise on top of the Ctrl+C the user just pressed.
      if (!shuttingDown) {
        const how = signal ? `signal ${signal}` : `code ${code}`;
        const message = `${service.title} exited (${how})`;
        process.stdout.write(
          `${prefix} ${code ? paint(RED, message) : paint(DIM, message)}\n`,
        );
        if (code) worstCode = code;
      }

      // Deliberately does NOT stop the others. A Vite server dying shouldn't
      // take the API down with it — the remaining services stay useful, and
      // the one that died is named above so it can be restarted.
      if (remaining === 0) process.exit(worstCode);
    });
  });

  // Ctrl+C reaches this process; the children need it forwarded explicitly
  // because they were started detached from this terminal's process group.
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  process.stdout.write(
    `\n${paint(DIM, "Ctrl+C stops everything. Postgres is not managed here — `pnpm db:up` if it isn't running.")}\n\n`,
  );
}

// ---------------------------------------------------------------------------

if (separateWindows) {
  const platform = process.platform;
  if (platform === "win32") launchWindows(selected);
  else if (platform === "darwin") launchMac(selected);
  else launchLinux(selected);

  console.log(
    "\nOpened in separate terminals. Close those windows to stop the services." +
      "\nPostgres is not managed here — `docker compose up -d postgres` if it isn't running.",
  );
} else {
  runInline(selected);
}
