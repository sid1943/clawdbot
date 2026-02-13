import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import { telegramPlugin } from "../../extensions/telegram/src/channel.js";
import { setTelegramRuntime } from "../../extensions/telegram/src/runtime.js";
import * as replyModule from "../auto-reply/reply.js";
import { resolveMainSessionKey } from "../config/sessions.js";
import { setActivePluginRegistry } from "../plugins/runtime.js";
import { createPluginRuntime } from "../plugins/runtime/index.js";
import { createTestRegistry } from "../test-utils/channel-plugins.js";
import { resetHeartbeatFailureStateForTest, runHeartbeatOnce } from "./heartbeat-runner.js";

// Avoid pulling optional runtime deps during isolated runs.
vi.mock("jiti", () => ({ createJiti: () => () => ({}) }));

beforeEach(() => {
  const runtime = createPluginRuntime();
  setTelegramRuntime(runtime);
  setActivePluginRegistry(
    createTestRegistry([{ pluginId: "telegram", plugin: telegramPlugin, source: "test" }]),
  );
  resetHeartbeatFailureStateForTest();
});

afterEach(() => {
  resetHeartbeatFailureStateForTest();
  vi.restoreAllMocks();
});

describe("heartbeat circuit breaker", () => {
  it("opens after repeated failures and retries after cooldown", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-hb-circuit-"));
    const storePath = path.join(tmpDir, "sessions.json");
    const cfg: OpenClawConfig = {
      agents: {
        defaults: {
          workspace: tmpDir,
          heartbeat: {
            every: "5m",
            target: "telegram",
          },
        },
      },
      channels: { telegram: { allowFrom: ["*"] } },
      session: { store: storePath },
    };
    const sessionKey = resolveMainSessionKey(cfg);

    await fs.writeFile(
      storePath,
      JSON.stringify(
        {
          [sessionKey]: {
            sessionId: "sid",
            updatedAt: Date.now(),
            lastChannel: "telegram",
            lastProvider: "telegram",
            lastTo: "6438593762",
          },
        },
        null,
        2,
      ),
    );

    const getReplySpy = vi
      .spyOn(replyModule, "getReplyFromConfig")
      .mockRejectedValue(new Error("model exploded"));
    const sendTelegram = vi.fn().mockResolvedValue({
      messageId: "m1",
      chatId: "6438593762",
    });

    try {
      const r1 = await runHeartbeatOnce({
        cfg,
        reason: "interval",
        deps: { sendTelegram, getQueueSize: () => 0, nowMs: () => 0 },
      });
      const r2 = await runHeartbeatOnce({
        cfg,
        reason: "interval",
        deps: { sendTelegram, getQueueSize: () => 0, nowMs: () => 1000 },
      });
      const r3 = await runHeartbeatOnce({
        cfg,
        reason: "interval",
        deps: { sendTelegram, getQueueSize: () => 0, nowMs: () => 2000 },
      });
      const r4 = await runHeartbeatOnce({
        cfg,
        reason: "interval",
        deps: { sendTelegram, getQueueSize: () => 0, nowMs: () => 3000 },
      });

      expect(r1.status).toBe("failed");
      expect(r2.status).toBe("failed");
      expect(r3.status).toBe("failed");
      expect(r4).toEqual({ status: "skipped", reason: "circuit-open" });

      const r5 = await runHeartbeatOnce({
        cfg,
        reason: "interval",
        deps: { sendTelegram, getQueueSize: () => 0, nowMs: () => 6 * 60 * 1000 },
      });
      expect(r5.status).toBe("failed");
      expect(getReplySpy).toHaveBeenCalledTimes(4);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
