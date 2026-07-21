import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

import { buildDockerArgs, LOCAL_EXIT, type StepTimeouts } from "./command";
import { DockerUnavailableError } from "../errors";
import {
  LOCAL_COMPILE_TIMEOUT_S,
  LOCAL_RUN_TIMEOUT_S,
  LOCAL_WALL_TIMEOUT_MS,
  LOCAL_OUTPUT_CAP_BYTES,
} from "../../jobs/constants";
import { logger } from "../../lib/logger";
import type { JudgeLanguage } from "../../schema/job.schema";

/** What actually happened inside the container. Mapped to a verdict by mapStatus.ts. */
export interface ContainerOutcome {
  readonly containerName: string;
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly wallMs: number;
  /** The Node-side backstop fired — in-container `timeout` did not do its job. */
  readonly killedByBackstop: boolean;
  /** Output exceeded the cap and the container was killed. */
  readonly outputCapped: boolean;
}

const DEFAULT_TIMEOUTS: StepTimeouts = {
  compileSeconds: LOCAL_COMPILE_TIMEOUT_S,
  runSeconds: LOCAL_RUN_TIMEOUT_S,
};

/** Substrings that mean "the daemon is not there", not "the code was bad". */
const DAEMON_DOWN_MARKERS = [
  "cannot connect to the docker daemon",
  "error during connect",
  "is the docker daemon running",
  "the system cannot find the file specified",
];

/**
 * Kills a container by name, best effort.
 *
 * Killing the `docker run` client process is NOT enough: the daemon owns the
 * container's lifetime, so the client exiting leaves the container running and
 * burning CPU. Every kill path has to go through the daemon by name.
 */
function killContainer(containerName: string): void {
  const kill = spawn("docker", ["kill", containerName], { stdio: "ignore" });
  kill.on("error", () => {
    // Container may already be gone — that is the outcome we wanted anyway.
  });
}

/**
 * Runs one submission in a locked-down container and reports the raw outcome.
 *
 * Three independent things can stop the container, in increasing order of
 * desperation:
 *   1. in-container `timeout` (normal TLE — gives a clean, attributable 124);
 *   2. the output cap here, if the program floods stdout;
 *   3. the Node-side wall backstop, for a container that never started or a
 *      wedged daemon.
 *
 * Throws `DockerUnavailableError` when the infrastructure is the problem, which
 * `pool.ts` classifies as transient and retries — a daemon restart mid-contest
 * should delay a verdict, not fail it.
 */
export async function runContainer(
  language: JudgeLanguage,
  workspace: string,
  timeouts: StepTimeouts = DEFAULT_TIMEOUTS
): Promise<ContainerOutcome> {
  const containerName = `judge-${randomUUID()}`;
  const args = buildDockerArgs(language, workspace, { timeouts, containerName });
  const started = Date.now();

  return new Promise<ContainerOutcome>((resolve, reject) => {
    // argv array, never a shell string: the workspace path is handed to the OS
    // directly, so a path containing spaces cannot split into two arguments.
    const child = spawn("docker", args, { stdio: ["ignore", "pipe", "pipe"] });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let bytes = 0;
    let outputCapped = false;
    let killedByBackstop = false;
    let settled = false;

    const backstop = setTimeout(() => {
      killedByBackstop = true;
      logger.warn(
        { containerName, language, wallTimeoutMs: LOCAL_WALL_TIMEOUT_MS },
        "Judge container hit the Node-side wall backstop"
      );
      killContainer(containerName);
    }, LOCAL_WALL_TIMEOUT_MS);

    /**
     * Counts BOTH streams against one budget. A program that floods stderr is
     * just as capable of filling the disk as one that floods stdout, and the
     * harness's markers all go to stdout anyway.
     */
    const collect = (chunks: Buffer[]) => (chunk: Buffer) => {
      if (outputCapped) return;

      bytes += chunk.length;
      if (bytes > LOCAL_OUTPUT_CAP_BYTES) {
        outputCapped = true;
        logger.warn({ containerName, language, bytes }, "Judge container exceeded output cap");
        killContainer(containerName);
        return;
      }
      chunks.push(chunk);
    };

    child.stdout.on("data", collect(stdoutChunks));
    child.stderr.on("data", collect(stderrChunks));

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(backstop);
      // ENOENT here means the `docker` binary is not on PATH at all.
      reject(new DockerUnavailableError(`Could not spawn docker: ${err.message}`));
    });

    child.on("close", (exitCode, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(backstop);

      const stdout = Buffer.concat(stdoutChunks).toString("utf8");
      const stderr = Buffer.concat(stderrChunks).toString("utf8");

      // 125 is the code docker reserves for its own failures. Distinguish it
      // from user-code failures so a dead daemon retries instead of recording a
      // wrong verdict against a submission that never ran.
      const daemonDown = DAEMON_DOWN_MARKERS.some((m) => stderr.toLowerCase().includes(m));
      if (exitCode === LOCAL_EXIT.DOCKER_FAILURE || daemonDown) {
        reject(new DockerUnavailableError(stderr.trim() || `docker exited ${exitCode}`));
        return;
      }

      resolve({
        containerName,
        exitCode,
        signal,
        stdout,
        stderr,
        wallMs: Date.now() - started,
        killedByBackstop,
        outputCapped,
      });
    });
  });
}
