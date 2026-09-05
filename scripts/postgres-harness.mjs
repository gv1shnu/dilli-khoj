// Starts an isolated cluster on loopback, never the developer's default database.
import { mkdtemp } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir, userInfo } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import postgres from "postgres";
import { bootstrapDatabase } from "./local-database.mjs";
export async function postgresHarness() {
  const bin = process.env.PG_BINDIR ?? "/opt/homebrew/opt/postgresql@17/bin";
  const inferredShare = resolve(bin, "../share/postgresql");
  const share = process.env.PG_SHAREDIR ?? inferredShare;
  const dir = await mkdtemp(join(tmpdir(), "dilli-khoj-pg-"));
  const port = Number(process.env.TEST_PG_PORT ?? 55439);
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error("Invalid local test port");
  const initArgs = [
    "-D",
    dir,
    "--auth=trust",
    "--no-locale",
    "--encoding=UTF8",
  ];
  // Unlinked Homebrew formulae keep their catalog beside the binaries instead
  // of /opt/homebrew/share. Supplying it explicitly works for linked installs too.
  if (existsSync(join(share, "postgres.bki"))) initArgs.push("-L", share);
  execFileSync(join(bin, "initdb"), initArgs, { stdio: "pipe" });
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
    // The harness runs migrations containing explicit transactions. A single
    // reserved connection preserves session state and matches the judge pools.
    max: 1,
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
