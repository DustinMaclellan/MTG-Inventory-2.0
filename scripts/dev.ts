import { spawn } from "node:child_process";
import { mkdir, unlink } from "node:fs/promises";
import { createConnection } from "node:net";
import path from "node:path";
import { PostgresInstance } from "pg-embedded";

async function main() {
const root = process.cwd();
const localDir = path.join(root, ".local");
await mkdir(localDir, { recursive: true });
const dataDir = path.join(localDir, "postgres-data");
const pidFile = path.join(dataDir, "postmaster.pid");

function isPortOpen(port: number) {
  return new Promise<boolean>((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    socket.setTimeout(500);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => resolve(false));
  });
}

const postgresRunning = await isPortOpen(54321);
if (!postgresRunning) {
  try {
    await unlink(pidFile);
    console.log("Removed a stale local PostgreSQL lock.");
  } catch {
    // A fresh database has no postmaster.pid.
  }
}

const postgres = new PostgresInstance({
  port: 54321,
  username: "postgres",
  password: "postgres",
  databaseName: "postgres",
  dataDir,
  installationDir: path.join(localDir, "postgres"),
  persistent: true,
  setupTimeout: 300,
});

const databaseUrl =
  "postgresql://postgres:postgres@127.0.0.1:54321/postgres?schema=public";
const env = { ...process.env, DATABASE_URL: databaseUrl };
const command = process.platform === "win32" ? "npx.cmd" : "npx";

function run(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${args.join(" ")} exited with ${code}`)),
    );
  });
}

console.log("Starting local PostgreSQL…");
if (postgresRunning) {
  console.log("Reusing the running local PostgreSQL instance.");
} else {
  await postgres.start();
}
console.log(`PostgreSQL ready at ${databaseUrl}`);
await run(["prisma", "migrate", "deploy"]);

const next = spawn(command, ["next", "dev"], {
  cwd: root,
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

let stopping = false;
async function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  if (!next.killed) next.kill();
  if (!postgresRunning) await postgres.stop().catch(() => undefined);
  process.exit(exitCode);
}

process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());
next.on("error", (error) => {
  console.error(error);
  void stop(1);
});
next.on("exit", (code) => void stop(code ?? 0));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
