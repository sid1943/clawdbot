import fs from "node:fs/promises";
import path from "node:path";
import type { RuntimeEnv } from "../runtime.js";
import { lookupContextTokens } from "../agents/context.js";
import { DEFAULT_CONTEXT_TOKENS, DEFAULT_MODEL, DEFAULT_PROVIDER } from "../agents/defaults.js";
import { resolveConfiguredModelRef } from "../agents/model-selection.js";
import { loadConfig } from "../config/config.js";
import {
  loadSessionStore,
  resolveMainSessionKey,
  resolveFreshSessionTotalTokens,
  saveSessionStore,
  resolveStorePath,
  type SessionEntry,
} from "../config/sessions.js";
import { info } from "../globals.js";
import { formatTimeAgo } from "../infra/format-time/format-relative.ts";
import { isRich, theme } from "../terminal/theme.js";

type SessionRow = {
  key: string;
  kind: "direct" | "group" | "global" | "unknown";
  updatedAt: number | null;
  ageMs: number | null;
  sessionId?: string;
  systemSent?: boolean;
  abortedLastRun?: boolean;
  thinkingLevel?: string;
  verboseLevel?: string;
  reasoningLevel?: string;
  elevatedLevel?: string;
  responseUsage?: string;
  groupActivation?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  totalTokensFresh?: boolean;
  model?: string;
  contextTokens?: number;
};

type SessionsCommandOpts = {
  json?: boolean;
  store?: string;
  active?: string;
  resetMain?: boolean;
  yes?: boolean;
  keepTranscript?: boolean;
};

type MainSessionResetResult = {
  requested: boolean;
  performed: boolean;
  mainSessionKey: string;
  backupPath?: string;
  removedSessionId?: string;
  removedSessionFile?: string;
  archivedTranscriptPath?: string;
  transcriptArchived: boolean;
  transcriptArchiveError?: string;
};

const KIND_PAD = 6;
const KEY_PAD = 26;
const AGE_PAD = 9;
const MODEL_PAD = 14;
const TOKENS_PAD = 20;

const formatKTokens = (value: number) => `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`;

const truncateKey = (key: string) => {
  if (key.length <= KEY_PAD) {
    return key;
  }
  const head = Math.max(4, KEY_PAD - 10);
  return `${key.slice(0, head)}...${key.slice(-6)}`;
};

const colorByPct = (label: string, pct: number | null, rich: boolean) => {
  if (!rich || pct === null) {
    return label;
  }
  if (pct >= 95) {
    return theme.error(label);
  }
  if (pct >= 80) {
    return theme.warn(label);
  }
  if (pct >= 60) {
    return theme.success(label);
  }
  return theme.muted(label);
};

const formatTokensCell = (
  total: number | undefined,
  contextTokens: number | null,
  rich: boolean,
) => {
  if (total === undefined) {
    const ctxLabel = contextTokens ? formatKTokens(contextTokens) : "?";
    const label = `unknown/${ctxLabel} (?%)`;
    return rich ? theme.muted(label.padEnd(TOKENS_PAD)) : label.padEnd(TOKENS_PAD);
  }
  const totalLabel = formatKTokens(total);
  const ctxLabel = contextTokens ? formatKTokens(contextTokens) : "?";
  const pct = contextTokens ? Math.min(999, Math.round((total / contextTokens) * 100)) : null;
  const label = `${totalLabel}/${ctxLabel} (${pct ?? "?"}%)`;
  const padded = label.padEnd(TOKENS_PAD);
  return colorByPct(padded, pct, rich);
};

const formatKindCell = (kind: SessionRow["kind"], rich: boolean) => {
  const label = kind.padEnd(KIND_PAD);
  if (!rich) {
    return label;
  }
  if (kind === "group") {
    return theme.accentBright(label);
  }
  if (kind === "global") {
    return theme.warn(label);
  }
  if (kind === "direct") {
    return theme.accent(label);
  }
  return theme.muted(label);
};

const formatAgeCell = (updatedAt: number | null | undefined, rich: boolean) => {
  const ageLabel = updatedAt ? formatTimeAgo(Date.now() - updatedAt) : "unknown";
  const padded = ageLabel.padEnd(AGE_PAD);
  return rich ? theme.muted(padded) : padded;
};

const formatModelCell = (model: string | null | undefined, rich: boolean) => {
  const label = (model ?? "unknown").padEnd(MODEL_PAD);
  return rich ? theme.info(label) : label;
};

const formatFlagsCell = (row: SessionRow, rich: boolean) => {
  const flags = [
    row.thinkingLevel ? `think:${row.thinkingLevel}` : null,
    row.verboseLevel ? `verbose:${row.verboseLevel}` : null,
    row.reasoningLevel ? `reasoning:${row.reasoningLevel}` : null,
    row.elevatedLevel ? `elev:${row.elevatedLevel}` : null,
    row.responseUsage ? `usage:${row.responseUsage}` : null,
    row.groupActivation ? `activation:${row.groupActivation}` : null,
    row.systemSent ? "system" : null,
    row.abortedLastRun ? "aborted" : null,
    row.sessionId ? `id:${row.sessionId}` : null,
  ].filter(Boolean);
  const label = flags.join(" ");
  return label.length === 0 ? "" : rich ? theme.muted(label) : label;
};

function classifyKey(key: string, entry?: SessionEntry): SessionRow["kind"] {
  if (key === "global") {
    return "global";
  }
  if (key === "unknown") {
    return "unknown";
  }
  if (entry?.chatType === "group" || entry?.chatType === "channel") {
    return "group";
  }
  if (key.includes(":group:") || key.includes(":channel:")) {
    return "group";
  }
  return "direct";
}

function toRows(store: Record<string, SessionEntry>): SessionRow[] {
  return Object.entries(store)
    .map(([key, entry]) => {
      const updatedAt = entry?.updatedAt ?? null;
      return {
        key,
        kind: classifyKey(key, entry),
        updatedAt,
        ageMs: updatedAt ? Date.now() - updatedAt : null,
        sessionId: entry?.sessionId,
        systemSent: entry?.systemSent,
        abortedLastRun: entry?.abortedLastRun,
        thinkingLevel: entry?.thinkingLevel,
        verboseLevel: entry?.verboseLevel,
        reasoningLevel: entry?.reasoningLevel,
        elevatedLevel: entry?.elevatedLevel,
        responseUsage: entry?.responseUsage,
        groupActivation: entry?.groupActivation,
        inputTokens: entry?.inputTokens,
        outputTokens: entry?.outputTokens,
        totalTokens: entry?.totalTokens,
        totalTokensFresh: entry?.totalTokensFresh,
        model: entry?.model,
        contextTokens: entry?.contextTokens,
      } satisfies SessionRow;
    })
    .toSorted((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

function formatResetTimestamp(nowMs: number) {
  const d = new Date(nowMs);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resetMainSession(params: {
  cfg: ReturnType<typeof loadConfig>;
  storePath: string;
  store: Record<string, SessionEntry>;
  archiveTranscript: boolean;
}): Promise<{ store: Record<string, SessionEntry>; result: MainSessionResetResult }> {
  const now = Date.now();
  const stamp = formatResetTimestamp(now);
  const mainSessionKey = resolveMainSessionKey(params.cfg);
  const entry = params.store[mainSessionKey];

  if (!entry) {
    return {
      store: params.store,
      result: {
        requested: true,
        performed: false,
        mainSessionKey,
        transcriptArchived: false,
      },
    };
  }

  const backupPath = `${params.storePath}.backup.manual-reset.${stamp}`;
  await fs.copyFile(params.storePath, backupPath);

  const nextStore = { ...params.store };
  delete nextStore[mainSessionKey];
  await saveSessionStore(params.storePath, nextStore);

  let archivedTranscriptPath: string | undefined;
  let transcriptArchiveError: string | undefined;
  let transcriptArchived = false;
  const sessionFile = entry.sessionFile?.trim();

  if (params.archiveTranscript && sessionFile) {
    try {
      const resolvedSessionFile = path.resolve(sessionFile);
      if (await pathExists(resolvedSessionFile)) {
        archivedTranscriptPath = `${resolvedSessionFile}.reset-${stamp}`;
        await fs.rename(resolvedSessionFile, archivedTranscriptPath);
        transcriptArchived = true;
      }
    } catch (err) {
      transcriptArchiveError = err instanceof Error ? err.message : String(err);
    }
  }

  return {
    store: nextStore,
    result: {
      requested: true,
      performed: true,
      mainSessionKey,
      backupPath,
      removedSessionId: entry.sessionId,
      removedSessionFile: sessionFile,
      archivedTranscriptPath,
      transcriptArchived,
      transcriptArchiveError,
    },
  };
}

export async function sessionsCommand(opts: SessionsCommandOpts, runtime: RuntimeEnv) {
  if (opts.resetMain && !opts.yes) {
    runtime.error("--reset-main requires --yes");
    runtime.exit(1);
    return;
  }

  const cfg = loadConfig();
  const resolved = resolveConfiguredModelRef({
    cfg,
    defaultProvider: DEFAULT_PROVIDER,
    defaultModel: DEFAULT_MODEL,
  });
  const configContextTokens =
    cfg.agents?.defaults?.contextTokens ??
    lookupContextTokens(resolved.model) ??
    DEFAULT_CONTEXT_TOKENS;
  const configModel = resolved.model ?? DEFAULT_MODEL;
  const storePath = resolveStorePath(opts.store ?? cfg.session?.store);
  let store = loadSessionStore(storePath);

  let resetResult: MainSessionResetResult | null = null;
  if (opts.resetMain) {
    const reset = await resetMainSession({
      cfg,
      storePath,
      store,
      archiveTranscript: !opts.keepTranscript,
    });
    store = reset.store;
    resetResult = reset.result;
  }

  let activeMinutes: number | undefined;
  if (opts.active !== undefined) {
    const parsed = Number.parseInt(String(opts.active), 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      runtime.error("--active must be a positive integer (minutes)");
      runtime.exit(1);
      return;
    }
    activeMinutes = parsed;
  }

  const rows = toRows(store).filter((row) => {
    if (activeMinutes === undefined) {
      return true;
    }
    if (!row.updatedAt) {
      return false;
    }
    return Date.now() - row.updatedAt <= activeMinutes * 60_000;
  });

  if (opts.json) {
    runtime.log(
      JSON.stringify(
        {
          path: storePath,
          count: rows.length,
          activeMinutes: activeMinutes ?? null,
          resetMain: resetResult,
          sessions: rows.map((r) => ({
            ...r,
            totalTokens: resolveFreshSessionTotalTokens(r) ?? null,
            totalTokensFresh:
              typeof r.totalTokens === "number" ? r.totalTokensFresh !== false : false,
            contextTokens:
              r.contextTokens ?? lookupContextTokens(r.model) ?? configContextTokens ?? null,
            model: r.model ?? configModel ?? null,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  runtime.log(info(`Session store: ${storePath}`));
  runtime.log(info(`Sessions listed: ${rows.length}`));
  if (resetResult) {
    if (!resetResult.performed) {
      runtime.log(info(`Main session not found for key: ${resetResult.mainSessionKey}`));
    } else {
      runtime.log(info(`Main session reset: ${resetResult.mainSessionKey}`));
      if (resetResult.backupPath) {
        runtime.log(info(`Backup written: ${resetResult.backupPath}`));
      }
      if (resetResult.transcriptArchived && resetResult.archivedTranscriptPath) {
        runtime.log(info(`Transcript archived: ${resetResult.archivedTranscriptPath}`));
      } else if (resetResult.transcriptArchiveError) {
        runtime.log(info(`Transcript archive skipped: ${resetResult.transcriptArchiveError}`));
      }
    }
  }
  if (activeMinutes) {
    runtime.log(info(`Filtered to last ${activeMinutes} minute(s)`));
  }
  if (rows.length === 0) {
    runtime.log("No sessions found.");
    return;
  }

  const rich = isRich();
  const header = [
    "Kind".padEnd(KIND_PAD),
    "Key".padEnd(KEY_PAD),
    "Age".padEnd(AGE_PAD),
    "Model".padEnd(MODEL_PAD),
    "Tokens (ctx %)".padEnd(TOKENS_PAD),
    "Flags",
  ].join(" ");

  runtime.log(rich ? theme.heading(header) : header);

  for (const row of rows) {
    const model = row.model ?? configModel;
    const contextTokens = row.contextTokens ?? lookupContextTokens(model) ?? configContextTokens;
    const total = resolveFreshSessionTotalTokens(row);

    const keyLabel = truncateKey(row.key).padEnd(KEY_PAD);
    const keyCell = rich ? theme.accent(keyLabel) : keyLabel;

    const line = [
      formatKindCell(row.kind, rich),
      keyCell,
      formatAgeCell(row.updatedAt, rich),
      formatModelCell(model, rich),
      formatTokensCell(total, contextTokens ?? null, rich),
      formatFlagsCell(row, rich),
    ].join(" ");

    runtime.log(line.trimEnd());
  }
}
