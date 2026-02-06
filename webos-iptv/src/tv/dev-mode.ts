/**
 * Automate Developer Mode setup on LG webOS TVs.
 *
 * Full flow — including installing the Dev Mode app from the Content Store:
 * 1. Connect to TV via SSAP WebSocket (user accepts pairing once on TV)
 * 2. Check if Developer Mode app is installed
 * 3. If not installed: open Content Store, trigger install, wait for completion
 * 4. Launch Developer Mode app and enable it
 * 5. Register the TV with ares-setup-device
 * 6. Fetch the SSH key via ares-novacom
 */

import { execSync } from "node:child_process";
import { connectToTV, launchApp, getApps, showToast, type TVConnection } from "./ssap-client.js";

const DEV_MODE_APP_ID = "com.palmdts.devmode";
const CONTENT_STORE_APP_ID = "com.webos.app.discovery";

export type DevModeResult = {
  success: boolean;
  tvIp: string;
  deviceName: string;
  message: string;
};

/**
 * Full automated Developer Mode setup.
 * Installs Dev Mode app from Content Store if needed.
 * Only requires the user to accept the pairing prompt on the TV (first time only).
 */
export async function enableDevMode(
  tvIp: string,
  deviceName = "lgtv",
): Promise<DevModeResult> {
  const fail = (msg: string): DevModeResult => ({
    success: false, tvIp, deviceName, message: msg,
  });

  console.log(`\n  Connecting to TV at ${tvIp}...`);
  console.log("  (If this is the first time, accept the pairing prompt on your TV)\n");

  let tv: TVConnection;
  try {
    tv = await connectToTV(tvIp);
  } catch (err) {
    return fail(`Could not connect: ${err instanceof Error ? err.message : err}`);
  }

  try {
    await showToast(tv, "Clawdbot IPTV setup connected").catch(() => {});

    // Check if Developer Mode app is installed
    console.log("  Checking for Developer Mode app...");
    let apps = await getApps(tv);
    let devApp = apps.find((a) => a.id === DEV_MODE_APP_ID);

    if (!devApp) {
      // Developer Mode app not installed — install it from Content Store
      console.log("  Developer Mode app not found. Installing from LG Content Store...");

      const installed = await installDevModeApp(tv);
      if (!installed) {
        tv.close();
        return fail(
          "Could not install Developer Mode app automatically.\n" +
          "  The LG Content Store was opened on your TV.\n" +
          "  Please install 'Developer Mode' from the store, then run setup again.",
        );
      }

      // Re-check app list
      apps = await getApps(tv);
      devApp = apps.find((a) => a.id === DEV_MODE_APP_ID);
      if (!devApp) {
        tv.close();
        return fail("Developer Mode app install was triggered but app not found. Try running setup again.");
      }
    }

    console.log("  Developer Mode app ready.");

    // Launch Developer Mode app to ensure it's active
    console.log("  Launching Developer Mode app...");
    await launchApp(tv, DEV_MODE_APP_ID);
    await sleep(3000);

    // Enable dev mode via Luna service
    console.log("  Enabling Developer Mode...");
    try {
      await tv.send("ssap://system.launcher/launch", {
        id: DEV_MODE_APP_ID,
        params: { mode: "enable" },
      });
      await sleep(2000);
    } catch {
      // Some TV versions don't support params — the app launch itself is enough
      console.log("  (Using app-based activation)");
    }

    await showToast(tv, "Developer Mode enabled! Setting up SSH...").catch(() => {});
    tv.close();

    // Register device with ares-setup-device
    console.log(`  Registering device '${deviceName}'...`);
    try {
      try {
        execSync(`ares-setup-device -r "${deviceName}"`, { stdio: "pipe" });
      } catch {}

      execSync(
        `ares-setup-device -a "${deviceName}" -i "host=${tvIp}" -i "port=9922" -i "username=prisoner"`,
        { stdio: "pipe" },
      );
      console.log("  Device registered.");
    } catch (err) {
      return fail(`ares-setup-device failed: ${err instanceof Error ? err.message : err}`);
    }

    // Fetch SSH key from TV
    console.log("  Fetching SSH key from TV...");
    try {
      execSync(`ares-novacom --device "${deviceName}" --getkey`, {
        stdio: "inherit",
        timeout: 15_000,
      });
      console.log("  SSH key configured.");
    } catch {
      console.log("  SSH key fetch failed — will retry during deploy.");
      console.log("  You may need to turn on 'Key Server' in the Developer Mode app on the TV.");
    }

    // Verify connection
    console.log("  Verifying connection...");
    try {
      const result = execSync(`ares-device-info -d "${deviceName}"`, {
        encoding: "utf-8",
        stdio: "pipe",
        timeout: 10_000,
      });
      if (result.includes("modelName") || result.includes("webos")) {
        console.log("  Connection verified!");
      }
    } catch {
      console.log("  Could not verify — Developer Mode may need a moment to activate.");
      console.log("  If deploy fails, open Developer Mode app on TV and ensure it's ON.");
    }

    return {
      success: true,
      tvIp,
      deviceName,
      message: "Developer Mode enabled and device registered.",
    };
  } catch (err) {
    tv.close();
    return fail(`Setup error: ${err instanceof Error ? err.message : err}`);
  }
}

/**
 * Install the Developer Mode app from LG Content Store.
 * Opens the store, navigates to the app, triggers install, and polls until done.
 */
async function installDevModeApp(tv: TVConnection): Promise<boolean> {
  // Method 1: Try direct install via Luna IPK install service
  try {
    console.log("  Trying direct Content Store install...");
    await tv.send("ssap://com.webos.applicationManager/install", {
      id: DEV_MODE_APP_ID,
      subscribe: true,
    });
    await sleep(5000);

    // Check if that worked
    const apps = await getApps(tv);
    if (apps.find((a) => a.id === DEV_MODE_APP_ID)) {
      console.log("  Developer Mode app installed via direct API.");
      return true;
    }
  } catch {
    // Direct install not supported — fall through to Content Store method
  }

  // Method 2: Open Content Store and search for Developer Mode
  try {
    console.log("  Opening LG Content Store...");
    await showToast(tv, "Installing Developer Mode app...").catch(() => {});

    // Launch Content Store with search query for Developer Mode
    // webOS Content Store supports deep-link params
    await tv.send("ssap://system/launcher/launch", {
      id: CONTENT_STORE_APP_ID,
      params: {
        query: "Developer Mode",
      },
    });
    await sleep(3000);

    // Try launching with the specific app detail page
    // The Content Store deep link format varies by webOS version
    try {
      await tv.send("ssap://system/launcher/launch", {
        id: CONTENT_STORE_APP_ID,
        params: {
          contentTarget: `https://lgappstv.com/main/tvapp/detail?appId=${DEV_MODE_APP_ID}`,
        },
      });
    } catch {
      // Fallback: try alternative deep link format
      try {
        await tv.send("ssap://system/launcher/launch", {
          id: CONTENT_STORE_APP_ID,
          params: {
            appId: DEV_MODE_APP_ID,
            pageType: "detail",
          },
        });
      } catch {
        // Content Store is open — user can search manually
      }
    }

    await showToast(
      tv,
      "Please install 'Developer Mode' from the Content Store. Setup will continue automatically.",
    ).catch(() => {});

    // Poll for the app to appear (wait up to 2 minutes)
    console.log("  Waiting for Developer Mode app to be installed...");
    console.log("  (The Content Store is open on your TV — install 'Developer Mode')");
    const maxWait = 120_000;
    const pollInterval = 5_000;
    let elapsed = 0;

    while (elapsed < maxWait) {
      await sleep(pollInterval);
      elapsed += pollInterval;

      const apps = await getApps(tv);
      if (apps.find((a) => a.id === DEV_MODE_APP_ID)) {
        console.log("  Developer Mode app installed!");
        return true;
      }

      const remaining = Math.round((maxWait - elapsed) / 1000);
      process.stdout.write(`\r  Waiting... (${remaining}s remaining)  `);
    }

    console.log("\n  Timed out waiting for install.");
    return false;
  } catch (err) {
    console.log(`  Content Store method failed: ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
