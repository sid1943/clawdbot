import { describe, expect, it } from "vitest";
import type { NormalizedPluginsConfig } from "./config-state.js";
import { normalizePluginsConfig, resolveEnableState } from "./config-state.js";

describe("normalizePluginsConfig", () => {
  it("uses default memory slot when not specified", () => {
    const result = normalizePluginsConfig({});
    expect(result.slots.memory).toBe("memory-core");
  });

  it("respects explicit memory slot value", () => {
    const result = normalizePluginsConfig({
      slots: { memory: "custom-memory" },
    });
    expect(result.slots.memory).toBe("custom-memory");
  });

  it("disables memory slot when set to 'none'", () => {
    const result = normalizePluginsConfig({
      slots: { memory: "none" },
    });
    expect(result.slots.memory).toBeNull();
  });

  it("disables memory slot when set to 'None' (case insensitive)", () => {
    const result = normalizePluginsConfig({
      slots: { memory: "None" },
    });
    expect(result.slots.memory).toBeNull();
  });

  it("trims whitespace from memory slot value", () => {
    const result = normalizePluginsConfig({
      slots: { memory: "  custom-memory  " },
    });
    expect(result.slots.memory).toBe("custom-memory");
  });

  it("uses default when memory slot is empty string", () => {
    const result = normalizePluginsConfig({
      slots: { memory: "" },
    });
    expect(result.slots.memory).toBe("memory-core");
  });

  it("uses default when memory slot is whitespace only", () => {
    const result = normalizePluginsConfig({
      slots: { memory: "   " },
    });
    expect(result.slots.memory).toBe("memory-core");
  });
});

describe("resolveEnableState", () => {
  const baseConfig: NormalizedPluginsConfig = {
    enabled: true,
    allow: [],
    deny: [],
    loadPaths: [],
    slots: {},
    entries: {},
  };

  it("disables global discovered plugin when allow is empty", () => {
    const result = resolveEnableState("context-tracker", "global", baseConfig);
    expect(result.enabled).toBe(false);
    expect(result.reason).toContain("requires plugins.allow");
  });

  it("disables workspace discovered plugin when allow is empty", () => {
    const result = resolveEnableState("my-plugin", "workspace", baseConfig);
    expect(result.enabled).toBe(false);
    expect(result.reason).toContain("requires plugins.allow");
  });

  it("enables global plugin when listed in allow", () => {
    const config = { ...baseConfig, allow: ["context-tracker"] };
    const result = resolveEnableState("context-tracker", "global", config);
    expect(result.enabled).toBe(true);
  });

  it("enables global plugin when explicitly enabled in entries", () => {
    const config = {
      ...baseConfig,
      entries: { "context-tracker": { enabled: true } },
    };
    const result = resolveEnableState("context-tracker", "global", config);
    expect(result.enabled).toBe(true);
  });

  it("still enables config-origin plugins when allow is empty", () => {
    const result = resolveEnableState("my-plugin", "config", baseConfig);
    expect(result.enabled).toBe(true);
  });

  it("blocks plugin on denylist", () => {
    const config = { ...baseConfig, deny: ["bad-plugin"] };
    const result = resolveEnableState("bad-plugin", "global", config);
    expect(result.enabled).toBe(false);
    expect(result.reason).toBe("blocked by denylist");
  });

  it("disables all plugins when plugins.enabled is false", () => {
    const config = { ...baseConfig, enabled: false };
    const result = resolveEnableState("any-plugin", "global", config);
    expect(result.enabled).toBe(false);
    expect(result.reason).toBe("plugins disabled");
  });

  it("blocks plugin not in non-empty allowlist", () => {
    const config = { ...baseConfig, allow: ["other-plugin"] };
    const result = resolveEnableState("unlisted-plugin", "global", config);
    expect(result.enabled).toBe(false);
    expect(result.reason).toBe("not in allowlist");
  });
});
