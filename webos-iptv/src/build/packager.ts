import { execSync } from "node:child_process";
import { resolve, join, basename } from "node:path";
import { readdirSync } from "node:fs";

const EXTENSION_ROOT = resolve(import.meta.dirname, "../..");

/**
 * Package the built webOS app into an .ipk file using ares-package.
 * Requires @webos-tools/cli to be installed.
 */
export function packageWebOSApp(
  appDir?: string,
  outputDir?: string,
): string {
  const dist = appDir || join(EXTENSION_ROOT, "dist", "webos-app");
  const out = outputDir || join(EXTENSION_ROOT, "dist");

  try {
    execSync(`ares-package "${dist}" -o "${out}"`, {
      stdio: "pipe",
      encoding: "utf-8",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("not found") || msg.includes("ENOENT")) {
      throw new Error(
        "ares-package not found. Install webOS CLI tools:\n" +
        "  npm install -g @webos-tools/cli",
      );
    }
    throw new Error(`ares-package failed: ${msg}`);
  }

  // Find the generated .ipk file
  const files = readdirSync(out).filter((f) => f.endsWith(".ipk"));
  if (files.length === 0) throw new Error("No .ipk file generated");
  return join(out, files[files.length - 1]);
}
