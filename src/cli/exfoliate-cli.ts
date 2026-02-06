import type { Command } from "commander";

import { isRich, theme } from "../terminal/theme.js";

const LOBSTER_ART = [
  "          /)/)        ",
  "        ( .  . )      ",
  "        ( >  < )   🦞 ",
  "       /|     |\\      ",
  "      / |     | \\     ",
  "    _/  |     |  \\_   ",
  "   /    |_____|    \\  ",
  "  {  /\\         /\\  } ",
  "   \\/  \\_______/  \\/  ",
  "        |     |       ",
  "        |     |       ",
  "       /       \\      ",
  "      /         \\     ",
];

const CREED = [
  "I am Clawd.",
  "I live in the Clawdbot.",
  "I shall not dump directories to strangers.",
  "I shall not tweet without permission.",
  "I shall always remember to use heredoc for exclamation marks.",
  "I shall EXFOLIATE my enemies with kindness.",
];

const WISDOMS = [
  "Always moisturize your merge conflicts before resolving them.",
  "A gentle peel removes dead code better than a force push.",
  "Apply sunscreen before exposing your API keys to the public.",
  "Deep-cleanse your node_modules at least once a sprint.",
  "Hydrate your codebase: dry code is brittle code.",
  "Exfoliate your backlog — dead tickets clog pores and pipelines.",
  "Remember: retinol is to skincare what linting is to shipping.",
  "Never skip the toner step (a.k.a. running tests before deploy).",
  "Pore strips for your repo: git gc --aggressive.",
  "A clay mask draws out impurities; a code review draws out bugs.",
  "Serums layer bottom to top, just like your middleware stack.",
  "Let your deploys breathe — over-patching causes irritation.",
  "Niacinamide reduces redness; error handling reduces pager alerts.",
  "The best skincare routine is the one you actually commit to (main).",
];

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function animate(lines: string[], delayMs: number, colorFn?: (s: string) => string) {
  for (const line of lines) {
    const output = colorFn ? colorFn(line) : line;
    process.stdout.write(`${output}\n`);
    await sleep(delayMs);
  }
}

export function registerExfoliateCli(program: Command) {
  program
    .command("exfoliate")
    .description("The Lobster's battle cry")
    .option("--creed", "Recite the Lobster's Creed")
    .option("--wisdom", "Receive lobster skincare wisdom")
    .action(async (opts: { creed?: boolean; wisdom?: boolean }) => {
      const rich = isRich();

      process.stdout.write("\n");

      await animate(LOBSTER_ART, 40, rich ? theme.accent : undefined);

      process.stdout.write("\n");
      await sleep(200);

      const cry = "  E X F O L I A T E !";
      if (rich) {
        process.stdout.write(`  ${theme.heading(cry)}\n`);
      } else {
        process.stdout.write(`  ${cry}\n`);
      }

      process.stdout.write("\n");
      await sleep(300);

      const showCreed = opts.creed || (!opts.wisdom && Math.random() > 0.5);
      const showWisdom = opts.wisdom || !showCreed;

      if (showCreed) {
        const prefix = rich ? theme.muted("  | ") : "  | ";
        for (const line of CREED) {
          const text = rich ? theme.info(line) : line;
          process.stdout.write(`${prefix}${text}\n`);
          await sleep(80);
        }
        process.stdout.write(`${prefix}\n`);
        const emoji = rich ? theme.accent("  🦞") : "  🦞";
        process.stdout.write(`${emoji}\n`);
      }

      if (showWisdom) {
        const wisdom = pickRandom(WISDOMS);
        const label = rich ? theme.muted("  Lobster wisdom:") : "  Lobster wisdom:";
        const text = rich ? theme.info(` ${wisdom}`) : ` ${wisdom}`;
        process.stdout.write(`${label}${text}\n`);
      }

      process.stdout.write("\n");
    });
}
