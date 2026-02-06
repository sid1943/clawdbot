import { resolve, join } from "node:path";
import { cpSync, mkdirSync, existsSync } from "node:fs";

const EXTENSION_ROOT = resolve(import.meta.dirname, "../..");
const WEBOS_APP_SRC = join(EXTENSION_ROOT, "webos-app");

/**
 * Bundle the webOS app source into a deployable directory.
 * Copies static assets and the pre-bundled JS to dist/webos-app/.
 */
export async function bundleWebOSApp(outDir?: string): Promise<string> {
  const dist = outDir || join(EXTENSION_ROOT, "dist", "webos-app");

  // Create output directory
  mkdirSync(dist, { recursive: true });

  // Copy all static files from webos-app/
  const staticDirs = ["css", "lib"];
  const staticFiles = [
    "appinfo.json",
    "index.html",
    "icon.png",
    "largeIcon.png",
    "splash.png",
  ];

  for (const dir of staticDirs) {
    const src = join(WEBOS_APP_SRC, dir);
    if (existsSync(src)) {
      cpSync(src, join(dist, dir), { recursive: true });
    }
  }

  for (const file of staticFiles) {
    const src = join(WEBOS_APP_SRC, file);
    if (existsSync(src)) {
      cpSync(src, join(dist, file));
    }
  }

  // Bundle TypeScript with rolldown (or just copy for now)
  // In production, use rolldown to bundle webos-app/js/app.ts → dist/webos-app/js/app.js
  const jsSrc = join(WEBOS_APP_SRC, "js");
  if (existsSync(jsSrc)) {
    mkdirSync(join(dist, "js"), { recursive: true });

    try {
      const { rolldown } = await import("rolldown");
      const bundle = await rolldown({
        input: join(jsSrc, "app.ts"),
        resolve: {
          extensions: [".ts", ".js"],
        },
      });
      await bundle.write({
        dir: join(dist, "js"),
        format: "esm",
        entryFileNames: "app.js",
      });
      await bundle.close();
    } catch {
      // Fallback: copy raw TS files (for dev/debug)
      console.warn("[bundler] rolldown not available, copying raw source");
      cpSync(jsSrc, join(dist, "js"), { recursive: true });
    }
  }

  return dist;
}
