import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Disable colors for deterministic snapshots.
process.env.FORCE_COLOR = "0";

vi.mock("../config/config.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config/config.js")>();
  return {
    ...actual,
    loadConfig: () => ({
      agents: {
        defaults: {
          model: { primary: "pi:opus" },
          models: { "pi:opus": {} },
          contextTokens: 32000,
        },
      },
    }),
  };
});

import { sessionsCommand } from "./sessions.js";

const makeRuntime = () => {
  const logs: string[] = [];
  return {
    runtime: {
      log: (msg: unknown) => logs.push(String(msg)),
      error: (msg: unknown) => {
        throw new Error(String(msg));
      },
      exit: (code: number) => {
        throw new Error(`exit ${code}`);
      },
    },
    logs,
  } as const;
};

const writeStore = (data: unknown) => {
  const file = path.join(
    os.tmpdir(),
    `sessions-${Date.now()}-${Math.random().toString(16).slice(2)}.json`,
  );
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return file;
};

describe("sessionsCommand", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-12-06T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a tabular view with token percentages", async () => {
    const store = writeStore({
      "+15555550123": {
        sessionId: "abc123",
        updatedAt: Date.now() - 45 * 60_000,
        inputTokens: 1200,
        outputTokens: 800,
        totalTokens: 2000,
        totalTokensFresh: true,
        model: "pi:opus",
      },
    });

    const { runtime, logs } = makeRuntime();
    await sessionsCommand({ store }, runtime);

    fs.rmSync(store);

    const tableHeader = logs.find((line) => line.includes("Tokens (ctx %"));
    expect(tableHeader).toBeTruthy();

    const row = logs.find((line) => line.includes("+15555550123")) ?? "";
    expect(row).toContain("2.0k/32k (6%)");
    expect(row).toContain("45m ago");
    expect(row).toContain("pi:opus");
  });

  it("shows placeholder rows when tokens are missing", async () => {
    const store = writeStore({
      "discord:group:demo": {
        sessionId: "xyz",
        updatedAt: Date.now() - 5 * 60_000,
        thinkingLevel: "high",
      },
    });

    const { runtime, logs } = makeRuntime();
    await sessionsCommand({ store }, runtime);

    fs.rmSync(store);

    const row = logs.find((line) => line.includes("discord:group:demo")) ?? "";
    expect(row).toContain("unknown/32k (?%)");
    expect(row).toContain("think:high");
    expect(row).toContain("5m ago");
  });

  it("exports freshness metadata in JSON output", async () => {
    const store = writeStore({
      main: {
        sessionId: "abc123",
        updatedAt: Date.now() - 10 * 60_000,
        inputTokens: 1200,
        outputTokens: 800,
        totalTokens: 2000,
        totalTokensFresh: true,
        model: "pi:opus",
      },
      "discord:group:demo": {
        sessionId: "xyz",
        updatedAt: Date.now() - 5 * 60_000,
        inputTokens: 20,
        outputTokens: 10,
        model: "pi:opus",
      },
    });

    const { runtime, logs } = makeRuntime();
    await sessionsCommand({ store, json: true }, runtime);

    fs.rmSync(store);

    const payload = JSON.parse(logs[0] ?? "{}") as {
      sessions?: Array<{
        key: string;
        totalTokens: number | null;
        totalTokensFresh: boolean;
      }>;
    };
    const main = payload.sessions?.find((row) => row.key === "main");
    const group = payload.sessions?.find((row) => row.key === "discord:group:demo");
    expect(main?.totalTokens).toBe(2000);
    expect(main?.totalTokensFresh).toBe(true);
    expect(group?.totalTokens).toBeNull();
    expect(group?.totalTokensFresh).toBe(false);
  });

  it("requires explicit confirmation for main session reset", async () => {
    const store = writeStore({
      "agent:main:main": {
        sessionId: "main-session",
        updatedAt: Date.now(),
      },
    });
    const { runtime } = makeRuntime();

    await expect(sessionsCommand({ store, resetMain: true }, runtime)).rejects.toThrow(
      "--reset-main requires --yes",
    );

    fs.rmSync(store);
  });

  it("resets main session and archives transcript", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sessions-reset-"));
    const store = path.join(dir, "sessions.json");
    const transcript = path.join(dir, "main-transcript.jsonl");

    fs.writeFileSync(transcript, "session transcript");
    fs.writeFileSync(
      store,
      JSON.stringify(
        {
          "agent:main:main": {
            sessionId: "main-session",
            sessionFile: transcript,
            updatedAt: Date.now(),
          },
          "agent:main:telegram:direct:6438593762": {
            sessionId: "other-session",
            updatedAt: Date.now(),
          },
        },
        null,
        2,
      ),
    );

    const { runtime, logs } = makeRuntime();
    await sessionsCommand({ store, resetMain: true, yes: true }, runtime);

    const nextStore = JSON.parse(fs.readFileSync(store, "utf-8")) as Record<string, unknown>;
    expect(nextStore["agent:main:main"]).toBeUndefined();
    expect(nextStore["agent:main:telegram:direct:6438593762"]).toBeDefined();

    const files = fs.readdirSync(dir);
    expect(files.some((name) => name.startsWith("sessions.json.backup.manual-reset."))).toBe(true);
    expect(files.some((name) => name.startsWith("main-transcript.jsonl.reset-"))).toBe(true);
    expect(logs.some((line) => line.includes("Main session reset: agent:main:main"))).toBe(true);

    fs.rmSync(dir, { recursive: true, force: true });
  });
});
