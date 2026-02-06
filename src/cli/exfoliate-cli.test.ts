import { Command } from "commander";
import { describe, expect, it } from "vitest";

import { registerExfoliateCli } from "./exfoliate-cli.js";

describe("exfoliate-cli", () => {
  it("registers the exfoliate command", () => {
    const program = new Command();
    registerExfoliateCli(program);
    const cmd = program.commands.find((c) => c.name() === "exfoliate");
    expect(cmd).toBeDefined();
    expect(cmd!.description()).toBe("The Lobster's battle cry");
  });

  it("has --creed and --wisdom options", () => {
    const program = new Command();
    registerExfoliateCli(program);
    const cmd = program.commands.find((c) => c.name() === "exfoliate")!;
    const optionNames = cmd.options.map((o) => o.long);
    expect(optionNames).toContain("--creed");
    expect(optionNames).toContain("--wisdom");
  });
});
