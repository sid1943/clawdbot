const warningFilterKey = Symbol.for("moltbot.warning-filter");

type Warning = Error & {
  code?: string;
  name?: string;
  message?: string;
};

type WarningFilterState = {
  installed: boolean;
};

function shouldIgnoreWarning(warning: Warning): boolean {
  if (warning.code === "DEP0040" && warning.message?.includes("punycode")) {
    return true;
  }
  if (warning.code === "DEP0060" && warning.message?.includes("util._extend")) {
    return true;
  }
  if (
    warning.name === "ExperimentalWarning" &&
    warning.message?.includes("SQLite is an experimental feature")
  ) {
    return true;
  }
  return false;
}

export function installProcessWarningFilter(): void {
  const globalState = globalThis as typeof globalThis & {
    [warningFilterKey]?: WarningFilterState;
  };

  // Atomic check-and-set: define property only if not already defined
  // This prevents race conditions in concurrent initialization
  if (!globalState[warningFilterKey]) {
    try {
      Object.defineProperty(globalState, warningFilterKey, {
        value: { installed: true } satisfies WarningFilterState,
        writable: false,
        configurable: false,
      });
    } catch {
      // Property already defined by another concurrent call
      return;
    }
  } else {
    return;
  }

  process.on("warning", (warning: Warning) => {
    if (shouldIgnoreWarning(warning)) return;
    process.stderr.write(`${warning.stack ?? warning.toString()}\n`);
  });
}
