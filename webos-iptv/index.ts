/**
 * Clawdbot IPTV — Standalone webOS TV app
 * Target: LG OLED77B5PUA (webOS 25)
 *
 * This is NOT a clawdbot extension. It's a standalone app under apps/webos-iptv/.
 * Use the scripts in package.json to build, package, and deploy:
 *
 *   pnpm build     — bundle the app for webOS
 *   pnpm package   — create .ipk installer
 *   pnpm deploy    — install and launch on TV
 *   pnpm dev       — build + package + deploy + inspect
 *   pnpm test      — run unit tests
 */

export { parseM3u } from "./src/playlist/parser.js";
export { parseXmltv } from "./src/epg/xmltv-parser.js";
export { EpgStore } from "./src/epg/epg-store.js";
export { bundleWebOSApp } from "./src/build/bundler.js";
export { packageWebOSApp } from "./src/build/packager.js";
export { deployToTV, inspectApp, listDevices } from "./src/build/deployer.js";
