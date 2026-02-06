import { execSync } from "node:child_process";

const APP_ID = "com.clawdbot.iptv";

/**
 * Install and launch the .ipk on a connected webOS TV.
 * Requires the TV to be in Developer Mode and registered with ares-setup-device.
 */
export function deployToTV(ipkPath: string, deviceName: string): void {
  try {
    console.log(`[deploy] Installing ${ipkPath} on ${deviceName}...`);
    execSync(`ares-install -d "${deviceName}" "${ipkPath}"`, {
      stdio: "inherit",
    });

    console.log(`[deploy] Launching ${APP_ID}...`);
    execSync(`ares-launch -d "${deviceName}" ${APP_ID}`, {
      stdio: "inherit",
    });

    console.log("[deploy] App launched successfully!");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("not found") || msg.includes("ENOENT")) {
      throw new Error(
        "ares-install/ares-launch not found. Install webOS CLI tools:\n" +
        "  npm install -g @webos-tools/cli",
      );
    }
    throw new Error(`Deploy failed: ${msg}`);
  }
}

/** Open Chrome DevTools inspector for the running app. */
export function inspectApp(deviceName: string): void {
  try {
    execSync(`ares-inspect -d "${deviceName}" ${APP_ID}`, {
      stdio: "inherit",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Inspect failed: ${msg}`);
  }
}

/** List registered webOS devices. */
export function listDevices(): string {
  try {
    return execSync("ares-setup-device -l", {
      encoding: "utf-8",
      stdio: "pipe",
    });
  } catch {
    return "No devices found. Run: ares-setup-device";
  }
}
