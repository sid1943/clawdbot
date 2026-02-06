#!/usr/bin/env bun
/**
 * Fully automated TV setup:
 * 1. Discover LG TV on the network
 * 2. Connect via SSAP and pair
 * 3. Enable Developer Mode
 * 4. Register device with ares tools
 * 5. Build and deploy the IPTV app
 *
 * Usage: bun run scripts/setup-tv.ts [tv-ip]
 */

import { discoverTVs, scanForTV } from "../src/tv/discover.js";
import { enableDevMode } from "../src/tv/dev-mode.js";
import { bundleWebOSApp } from "../src/build/bundler.js";
import { packageWebOSApp } from "../src/build/packager.js";
import { deployToTV } from "../src/build/deployer.js";
import { networkInterfaces } from "node:os";

const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

function info(msg: string) { console.log(`${GREEN}▸${RESET} ${msg}`); }
function warn(msg: string) { console.log(`${YELLOW}▸${RESET} ${msg}`); }
function error(msg: string) { console.error(`${RED}✗${RESET} ${msg}`); }
function step(n: number, total: number, msg: string) {
  console.log(`\n${BOLD}[${n}/${total}] ${msg}${RESET}`);
}

const DEVICE_NAME = "lgtv";
const TOTAL = 5;

async function main() {
  let tvIp = process.argv[2] || "";

  // ── Step 1: Find the TV ────────────────────────────────────
  step(1, TOTAL, "Discovering LG TV on your network");

  if (!tvIp) {
    info("Searching via SSDP...");
    const tvs = await discoverTVs(5000);

    if (tvs.length > 0) {
      const tv = tvs[0];
      tvIp = tv.ip;
      info(`Found: ${tv.name || "LG TV"} ${tv.model ? `(${tv.model})` : ""} at ${tvIp}`);
    } else {
      // Fallback: port scan
      const localIp = getLocalIp();
      if (localIp) {
        info(`SSDP failed. Scanning ${localIp.replace(/\.\d+$/, ".0")}/24 for port 3000...`);
        const ips = await scanForTV(localIp, 2000);
        if (ips.length > 0) {
          tvIp = ips[0];
          info(`Found TV at ${tvIp}`);
        }
      }
    }

    if (!tvIp) {
      error("Could not find an LG TV on your network.");
      console.log("\n  Make sure your TV is powered on and on the same WiFi/LAN.");
      console.log("  Or provide the IP directly: bun run scripts/setup-tv.ts 192.168.1.x\n");
      process.exit(1);
    }
  } else {
    info(`Using provided TV IP: ${tvIp}`);
  }

  // ── Step 2: Enable Developer Mode ─────────────────────────
  step(2, TOTAL, "Enabling Developer Mode");
  info("Connecting to TV via WebSocket...");
  info("(First time: accept the pairing prompt on your TV screen)");

  const result = await enableDevMode(tvIp, DEVICE_NAME);

  if (!result.success) {
    error(result.message);
    process.exit(1);
  }
  info(result.message);

  // ── Step 3: Build ─────────────────────────────────────────
  step(3, TOTAL, "Building IPTV app");
  info("Bundling webOS app...");
  const dist = await bundleWebOSApp();
  info(`Built to: ${dist}`);

  // ── Step 4: Package ───────────────────────────────────────
  step(4, TOTAL, "Packaging .ipk");
  let ipk: string;
  try {
    ipk = packageWebOSApp(dist);
    info(`Package: ${ipk}`);
  } catch (err) {
    warn(`Packaging failed: ${err instanceof Error ? err.message : err}`);
    warn("You may need icon.png, largeIcon.png, and splash.png in webos-app/");
    console.log("  Create placeholder icons and re-run, or deploy manually.");
    process.exit(1);
  }

  // ── Step 5: Deploy ────────────────────────────────────────
  step(5, TOTAL, "Deploying to TV");
  try {
    deployToTV(ipk, DEVICE_NAME);
    console.log(`
  ${GREEN}${BOLD}Done! IPTV app is running on your LG TV.${RESET}

  ${BOLD}Remote control:${RESET}
    OK          Open channel list
    Up/Down     Zap channels
    0-9         Direct channel number
    Red         Toggle favorite
    Green       Programme guide (EPG)
    Yellow      Channel info
    Blue        Settings
    Back        Previous channel / Exit

  ${BOLD}Next time, just run:${RESET}
    bun run scripts/deploy.ts ${DEVICE_NAME}
`);
  } catch (err) {
    error(`Deploy failed: ${err instanceof Error ? err.message : err}`);
    console.log("\n  Developer Mode may need a moment to activate.");
    console.log("  Open the Developer Mode app on your TV, ensure it's ON,");
    console.log(`  then retry: bun run scripts/deploy.ts ${DEVICE_NAME}\n`);
    process.exit(1);
  }
}

function getLocalIp(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "";
}

main().catch((err) => {
  error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
