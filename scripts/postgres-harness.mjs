// Starts an isolated cluster on loopback, never the developer's default database.
import { mkdtemp } from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import postgres from "postgres";
import { bootstrapDatabase } from "./local-database.mjs";
export async function postgresHarness() {
  const bin = process.env.PG_BINDIR ?? "/opt/homebrew/opt/postgresql@17/bin";
  const dir = await mkdtemp(join(tmpdir(), "dilli-khoj-pg-"));
  const port = Number(process.env.TEST_PG_PORT ?? 55439);
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error("Invalid local test port");
  execFileSync(
    join(bin, "initdb"),
    ["-D", dir, "--auth=trust", "--no-locale", "--encoding=UTF8"],
    { stdio: "ignore" },
  );
  execFileSync(
    join(bin, "pg_ctl"),
    [
      "-D",
      dir,
      "-l",
      join(dir, "server.log"),
      "-o",
      `-p ${port} -h 127.0.0.1 -k ${dir}`,
      "-w",
      "start",
    ],
    { stdio: "ignore" },
  );
  const url = `postgres://127.0.0.1:${port}/postgres`;
  const sql = postgres(url, {
    username: userInfo().username,
    max: 12,
    onnotice: () => {},
  });
  const db = {
    exec: async (text) => {
      await sql.unsafe(text).simple();
    },
    query: async (text, args = []) => {
      const result = await sql.unsafe(text, args);
      return { rows: Array.from(result), fields: result.columns };
    },
  };
  try {
    await bootstrapDatabase(db);
  } catch (error) {
    await sql.end();
    execFileSync(join(bin, "pg_ctl"), ["-D", dir, "-m", "fast", "stop"], {
      stdio: "ignore",
    });
    throw error;
  }
  return {
    sql,
    db,
    url,
    dir,
    close: async () => {
      await sql.end({ timeout: 2 });
      execFileSync(join(bin, "pg_ctl"), ["-D", dir, "-m", "fast", "stop"], {
        stdio: "ignore",
      });
    },
  };
}
