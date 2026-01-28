import type { AgentMessage } from "@mariozechner/pi-agent-core";
import { describe, expect, it } from "vitest";
import { sanitizeToolUseResultPairing } from "./session-transcript-repair.js";

describe("sanitizeToolUseResultPairing", () => {
  it("moves tool results directly after tool calls and inserts missing results", () => {
    const input = [
      {
        role: "assistant",
        content: [
          { type: "toolCall", id: "call_1", name: "read", arguments: {} },
          { type: "toolCall", id: "call_2", name: "exec", arguments: {} },
        ],
      },
      { role: "user", content: "user message that should come after tool use" },
      {
        role: "toolResult",
        toolCallId: "call_2",
        toolName: "exec",
        content: [{ type: "text", text: "ok" }],
        isError: false,
      },
    ] satisfies AgentMessage[];

    const out = sanitizeToolUseResultPairing(input);
    expect(out[0]?.role).toBe("assistant");
    expect(out[1]?.role).toBe("toolResult");
    expect((out[1] as { toolCallId?: string }).toolCallId).toBe("call_1");
    expect(out[2]?.role).toBe("toolResult");
    expect((out[2] as { toolCallId?: string }).toolCallId).toBe("call_2");
    expect(out[3]?.role).toBe("user");
  });

  it("drops duplicate tool results for the same id within a span", () => {
    const input = [
      {
        role: "assistant",
        content: [{ type: "toolCall", id: "call_1", name: "read", arguments: {} }],
      },
      {
        role: "toolResult",
        toolCallId: "call_1",
        toolName: "read",
        content: [{ type: "text", text: "first" }],
        isError: false,
      },
      {
        role: "toolResult",
        toolCallId: "call_1",
        toolName: "read",
        content: [{ type: "text", text: "second" }],
        isError: false,
      },
      { role: "user", content: "ok" },
    ] satisfies AgentMessage[];

    const out = sanitizeToolUseResultPairing(input);
    expect(out.filter((m) => m.role === "toolResult")).toHaveLength(1);
  });

  it("drops duplicate tool results for the same id across the transcript", () => {
    const input = [
      {
        role: "assistant",
        content: [{ type: "toolCall", id: "call_1", name: "read", arguments: {} }],
      },
      {
        role: "toolResult",
        toolCallId: "call_1",
        toolName: "read",
        content: [{ type: "text", text: "first" }],
        isError: false,
      },
      { role: "assistant", content: [{ type: "text", text: "ok" }] },
      {
        role: "toolResult",
        toolCallId: "call_1",
        toolName: "read",
        content: [{ type: "text", text: "second (duplicate)" }],
        isError: false,
      },
    ] satisfies AgentMessage[];

    const out = sanitizeToolUseResultPairing(input);
    const results = out.filter((m) => m.role === "toolResult") as Array<{
      toolCallId?: string;
    }>;
    expect(results).toHaveLength(1);
    expect(results[0]?.toolCallId).toBe("call_1");
  });

  it("drops orphan tool results that do not match any tool call", () => {
    const input = [
      { role: "user", content: "hello" },
      {
        role: "toolResult",
        toolCallId: "call_orphan",
        toolName: "read",
        content: [{ type: "text", text: "orphan" }],
        isError: false,
      },
      {
        role: "assistant",
        content: [{ type: "text", text: "ok" }],
      },
    ] satisfies AgentMessage[];

    const out = sanitizeToolUseResultPairing(input);
    expect(out.some((m) => m.role === "toolResult")).toBe(false);
    expect(out.map((m) => m.role)).toEqual(["user", "assistant"]);
  });

  it("skips incomplete tool calls with partialJson and missing arguments", () => {
    const input = [
      {
        role: "assistant",
        content: [
          {
            type: "toolCall",
            id: "call_incomplete",
            name: "read",
            partialJson: '{"path": "/some',
            // arguments is missing — streaming was interrupted
          },
        ],
      },
      { role: "user", content: "continue" },
    ] satisfies AgentMessage[];

    const out = sanitizeToolUseResultPairing(input);
    // Should NOT synthesize a tool result for the incomplete call
    expect(out.some((m) => m.role === "toolResult")).toBe(false);
    expect(out.map((m) => m.role)).toEqual(["assistant", "user"]);
  });

  it("skips incomplete tool calls with partialJson and null arguments", () => {
    const input = [
      {
        role: "assistant",
        content: [
          {
            type: "toolCall",
            id: "call_incomplete",
            name: "read",
            partialJson: '{"path": "/some',
            arguments: null,
          },
        ],
      },
      { role: "user", content: "continue" },
    ] satisfies AgentMessage[];

    const out = sanitizeToolUseResultPairing(input);
    // Should NOT synthesize a tool result for the incomplete call
    expect(out.some((m) => m.role === "toolResult")).toBe(false);
    expect(out.map((m) => m.role)).toEqual(["assistant", "user"]);
  });

  it("skips incomplete tool calls with partialJson and empty arguments object", () => {
    const input = [
      {
        role: "assistant",
        content: [
          {
            type: "toolCall",
            id: "call_incomplete",
            name: "read",
            partialJson: '{"path": "/some',
            arguments: {},
          },
        ],
      },
      { role: "user", content: "continue" },
    ] satisfies AgentMessage[];

    const out = sanitizeToolUseResultPairing(input);
    // Should NOT synthesize a tool result for the incomplete call
    expect(out.some((m) => m.role === "toolResult")).toBe(false);
    expect(out.map((m) => m.role)).toEqual(["assistant", "user"]);
  });

  it("includes tool calls with partialJson but valid arguments", () => {
    const input = [
      {
        role: "assistant",
        content: [
          {
            type: "toolCall",
            id: "call_complete",
            name: "read",
            partialJson: '{"path": "/tmp/test"}',
            arguments: { path: "/tmp/test" },
          },
        ],
      },
      { role: "user", content: "continue" },
    ] satisfies AgentMessage[];

    const out = sanitizeToolUseResultPairing(input);
    // Should synthesize a tool result since arguments are valid
    expect(out.some((m) => m.role === "toolResult")).toBe(true);
    expect(out.map((m) => m.role)).toEqual(["assistant", "toolResult", "user"]);
  });

  it("handles mixed complete and incomplete tool calls", () => {
    const input = [
      {
        role: "assistant",
        content: [
          {
            type: "toolCall",
            id: "call_complete",
            name: "read",
            arguments: { path: "/tmp/test" },
          },
          {
            type: "toolCall",
            id: "call_incomplete",
            name: "write",
            partialJson: '{"path": "/tmp/out',
            // arguments is missing
          },
        ],
      },
      {
        role: "toolResult",
        toolCallId: "call_complete",
        toolName: "read",
        content: [{ type: "text", text: "file content" }],
        isError: false,
      },
      { role: "user", content: "continue" },
    ] satisfies AgentMessage[];

    const out = sanitizeToolUseResultPairing(input);
    // Should only have one tool result (for the complete call), not two
    const results = out.filter((m) => m.role === "toolResult");
    expect(results).toHaveLength(1);
    expect((results[0] as { toolCallId?: string }).toolCallId).toBe("call_complete");
  });

  it("preserves incomplete tool call blocks in assistant message for context", () => {
    const input = [
      {
        role: "assistant",
        content: [
          { type: "text", text: "Let me read that file" },
          {
            type: "toolCall",
            id: "call_incomplete",
            name: "read",
            partialJson: '{"path": "/some',
          },
        ],
      },
      { role: "user", content: "continue" },
    ] satisfies AgentMessage[];

    const out = sanitizeToolUseResultPairing(input);
    // The assistant message should still contain the incomplete tool call block
    const assistant = out[0] as Extract<AgentMessage, { role: "assistant" }>;
    expect(assistant.content).toHaveLength(2);
    expect((assistant.content[1] as { type: string }).type).toBe("toolCall");
  });

  it("includes tool calls without partialJson (normal complete calls)", () => {
    const input = [
      {
        role: "assistant",
        content: [
          {
            type: "toolCall",
            id: "call_normal",
            name: "read",
            arguments: { path: "/tmp/test" },
          },
        ],
      },
      { role: "user", content: "continue" },
    ] satisfies AgentMessage[];

    const out = sanitizeToolUseResultPairing(input);
    // Should synthesize a tool result for the normal call
    expect(out.some((m) => m.role === "toolResult")).toBe(true);
    expect(out.map((m) => m.role)).toEqual(["assistant", "toolResult", "user"]);
  });
});
